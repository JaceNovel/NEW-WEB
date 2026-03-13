import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { apiError } from "@/app/api/_utils";
import { isPaidTransactionStatus, constructWebhookEvent, retrieveTransaction } from "@/lib/fedapay";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getEventName(event: Record<string, unknown>) {
  const value = event.name ?? event.type;
  return typeof value === "string" ? value : null;
}

function getEventObjectId(event: Record<string, unknown>) {
  const objectId = event.object_id;
  if (typeof objectId === "string" || typeof objectId === "number") {
    return String(objectId);
  }

  const entity = event.entity;
  if (entity && typeof entity === "object" && "id" in entity) {
    const entityId = (entity as { id?: string | number }).id;
    if (typeof entityId === "string" || typeof entityId === "number") {
      return String(entityId);
    }
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const signature = req.headers.get("x-fedapay-signature");
    if (!signature) {
      const error = new Error("Signature webhook FedaPay manquante.");
      // @ts-expect-error attach status
      error.status = 400;
      throw error;
    }

    const payload = await req.text();
    const event = constructWebhookEvent(payload, signature) as Record<string, unknown>;
    const eventName = getEventName(event);
    const remoteObjectId = getEventObjectId(event);

    if (!remoteObjectId) {
      return NextResponse.json({ ok: true, ignored: true, reason: "missing-object-id" });
    }

    const transaction = await retrieveTransaction(remoteObjectId);
    const normalizedStatus = transaction.status.toLowerCase();

    const outcome = await prisma.$transaction(async (tx) => {
      let payment = transaction.merchantReference
        ? await tx.creditPayment.findUnique({
            where: {
              merchantReference: transaction.merchantReference,
            },
          })
        : null;

      if (!payment) {
        payment = await tx.creditPayment.findFirst({
          where: {
            fedapayTransactionId: remoteObjectId,
          },
        });
      }

      if (!payment) {
        return { ignored: true, reason: "payment-not-found" };
      }

      const updatedPayment = await tx.creditPayment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: normalizedStatus.toUpperCase(),
          fedapayTransactionId: remoteObjectId,
          fedapayTransactionKey: transaction.transactionKey,
          fedapayReference: transaction.reference,
          lastEventName: eventName,
          rawTransaction: transaction.payload as Prisma.InputJsonValue,
          failureReason: isPaidTransactionStatus(normalizedStatus) ? null : payment.failureReason,
        },
      });

      if (!transaction.wasPaid) {
        return { ignored: false, credited: false, status: updatedPayment.status };
      }

      if (updatedPayment.completedAt) {
        return { ignored: false, credited: false, status: updatedPayment.status, duplicate: true };
      }

      const pack = await tx.creditProduct.findUnique({
        where: {
          key: updatedPayment.packKey,
        },
        select: {
          maxPurchasesPerPlayer: true,
        },
      });

      if (pack && pack.maxPurchasesPerPlayer !== null) {
        const purchaseCount = await tx.creditPurchase.count({
          where: {
            playerId: updatedPayment.playerId,
            packKey: updatedPayment.packKey,
          },
        });

        if (purchaseCount >= pack.maxPurchasesPerPlayer) {
          await tx.creditPayment.update({
            where: {
              id: updatedPayment.id,
            },
            data: {
              status: "LIMIT_REJECTED",
              failureReason: "Paiement approuvé mais limite du pack déjà atteinte.",
            },
          });

          return { ignored: false, credited: false, status: "LIMIT_REJECTED" };
        }
      }

      await tx.player.update({
        where: {
          id: updatedPayment.playerId,
        },
        data: {
          credits: {
            increment: updatedPayment.credits,
          },
        },
      });

      await tx.creditPurchase.create({
        data: {
          playerId: updatedPayment.playerId,
          packKey: updatedPayment.packKey,
          credits: updatedPayment.credits,
          priceFcfa: updatedPayment.amountFcfa,
        },
      });

      await tx.creditPayment.update({
        where: {
          id: updatedPayment.id,
        },
        data: {
          status: "APPROVED",
          completedAt: new Date(),
          failureReason: null,
        },
      });

      return { ignored: false, credited: true, status: "APPROVED" };
    });

    return NextResponse.json({ ok: true, ...outcome });
  } catch (error) {
    return apiError(error);
  }
}
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getCreditPack } from "@/lib/economy";
import { createHostedCreditTransaction, ensureFedaPayConfigured, getPublicSiteUrl } from "@/lib/fedapay";
import { apiError, applyRateLimit, requireSession } from "@/app/api/_utils";

const BodySchema = z.object({
  packKey: z.string().min(1),
});

export async function POST(req: Request) {
  let merchantReference: string | null = null;

  try {
    applyRateLimit("credit-purchase");
    ensureFedaPayConfigured();

    const session = await requireSession();
    const body = BodySchema.parse(await req.json());
    const pack = await getCreditPack(body.packKey);

    if (!pack || !pack.isActive) {
      throw new Error("Pack introuvable");
    }

    const playerId = String(session.user.id);

    const count = await prisma.creditPurchase.count({
      where: {
        playerId,
        packKey: pack.key,
      },
    });

    if (pack.maxPurchasesPerPlayer !== null && count >= pack.maxPurchasesPerPlayer) {
      const error = new Error("Ce pack a deja atteint sa limite d'achat.");
      // @ts-expect-error attach status
      error.status = 400;
      throw error;
    }

    const recentPendingPayment = await prisma.creditPayment.findFirst({
      where: {
        playerId,
        packKey: pack.key,
        completedAt: null,
        status: {
          in: ["PENDING", "TOKEN_READY"],
        },
        checkoutUrl: {
          not: null,
        },
        createdAt: {
          gte: new Date(Date.now() - 30 * 60_000),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        checkoutUrl: true,
        merchantReference: true,
      },
    });

    if (recentPendingPayment?.checkoutUrl) {
      return NextResponse.json({
        ok: true,
        paymentId: recentPendingPayment.id,
        checkoutUrl: recentPendingPayment.checkoutUrl,
        merchantReference: recentPendingPayment.merchantReference,
        reused: true,
      });
    }

    merchantReference = `KLG-${pack.key}-${randomUUID().replace(/-/g, "").slice(0, 18).toUpperCase()}`;
    const callbackUrl = new URL(`/credits?paymentRef=${merchantReference}`, getPublicSiteUrl()).toString();

    const payment = await prisma.creditPayment.create({
      data: {
        playerId,
        packKey: pack.key,
        credits: pack.credits,
        amountFcfa: pack.priceFcfa,
        merchantReference,
        callbackUrl,
      },
      select: {
        id: true,
      },
    });

    const remotePayment = await createHostedCreditTransaction({
      amountFcfa: pack.priceFcfa,
      merchantReference,
      callbackUrl,
      description: `${pack.label} - ${pack.credits} credits KING League`,
      metadata: {
        packKey: pack.key,
        playerId,
        credits: pack.credits,
        paymentId: payment.id,
      },
    });

    if (!remotePayment.checkoutUrl) {
      const error = new Error("FedaPay n'a pas retourne de lien de paiement.");
      // @ts-expect-error attach status
      error.status = 502;
      throw error;
    }

    await prisma.creditPayment.update({
      where: {
        id: payment.id,
      },
      data: {
        status: "TOKEN_READY",
        fedapayTransactionId: remotePayment.transactionId,
        fedapayTransactionKey: remotePayment.transactionKey,
        fedapayReference: remotePayment.reference,
        fedapayPaymentToken: remotePayment.token,
        checkoutUrl: remotePayment.checkoutUrl,
        rawTransaction: remotePayment.rawTransaction,
        rawToken: remotePayment.rawToken,
      },
    });

    return NextResponse.json({
      ok: true,
      paymentId: payment.id,
      merchantReference,
      checkoutUrl: remotePayment.checkoutUrl,
    });
  } catch (error) {
    if (merchantReference && error instanceof Error) {
      await prisma.creditPayment.updateMany({
        where: {
          merchantReference,
          completedAt: null,
        },
        data: {
          status: "INIT_FAILED",
          failureReason: error.message,
        },
      });
    }

    return apiError(error);
  }
}
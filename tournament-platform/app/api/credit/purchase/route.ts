import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getCreditPack } from "@/lib/economy";
import { apiError, applyRateLimit, requireSession } from "@/app/api/_utils";

const BodySchema = z.object({
  packKey: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    applyRateLimit("credit-purchase");
    const session = await requireSession();
    const body = BodySchema.parse(await req.json());
    const pack = await getCreditPack(body.packKey);

    if (!pack || !pack.isActive) {
      throw new Error("Pack introuvable");
    }

    const playerId = String(session.user.id);

    const result = await prisma.$transaction(async (tx) => {
      if (pack.maxPurchasesPerPlayer !== null) {
        const count = await tx.creditPurchase.count({
          where: {
            playerId,
            packKey: pack.key,
          },
        });

        if (count >= pack.maxPurchasesPerPlayer) {
          throw new Error("Ce pack a deja atteint sa limite d'achat.");
        }
      }

      const player = await tx.player.update({
        where: { id: playerId },
        data: {
          credits: { increment: pack.credits },
        },
        select: {
          id: true,
          credits: true,
        },
      });

      await tx.creditPurchase.create({
        data: {
          playerId,
          packKey: pack.key,
          credits: pack.credits,
          priceFcfa: pack.priceFcfa,
        },
      });

      return player;
    });

    return NextResponse.json({ ok: true, player: result, pack });
  } catch (error) {
    return apiError(error);
  }
}
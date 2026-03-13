import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getRecruitmentCost } from "@/lib/economy";
import { sendAllianceDecisionEmail } from "@/lib/email-notifications";
import { getTournamentRanking, recalculateTournamentState } from "@/lib/tournament";
import { apiError, applyRateLimit, requireSession } from "@/app/api/_utils";

const BodySchema = z.object({
  action: z.enum(["ACCEPT", "REFUSE"]),
});

export async function POST(req: Request) {
  try {
    applyRateLimit("alliance-respond");
    const session = await requireSession();
    const playerId = String(session.user.id);
    const body = BodySchema.parse(await req.json());

    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: {
        id: true,
        pseudo: true,
        email: true,
        gameMode: true,
        purchasedById: true,
        purchasedAt: true,
        alliancePending: true,
        purchasedBy: {
          select: {
            id: true,
            pseudo: true,
            email: true,
          },
        },
      },
    });

    if (!player?.purchasedById) {
      const error = new Error("Aucune demande d'association.");
      // @ts-expect-error attach status
      error.status = 400;
      throw error;
    }

    if (!player.alliancePending) {
      const error = new Error("Cette association a déjà été traitée.");
      // @ts-expect-error attach status
      error.status = 400;
      throw error;
    }

    if (body.action === "ACCEPT") {
      await prisma.player.update({
        where: { id: playerId },
        data: {
          alliancePending: false,
        },
      });

      if (player.purchasedBy && player.purchasedAt) {
        void sendAllianceDecisionEmail({
          eventKey: `alliance-accepted:${player.purchasedBy.id}:${player.id}:${player.purchasedAt.toISOString()}`,
          accepted: true,
          buyer: player.purchasedBy,
          target: player,
        }).catch((error) => {
          console.error("[alliance-respond] accept email failed", error);
        });
      }

      return NextResponse.json({ ok: true, status: "ACCEPTED" });
    }

    const buyerId = player.purchasedById;
    if (!buyerId) {
      const error = new Error("Aucune demande d'association.");
      // @ts-expect-error attach status
      error.status = 400;
      throw error;
    }

    await prisma.$transaction(async (tx) => {
      const ranking = await getTournamentRanking({ tx, gameMode: player.gameMode });
      const targetRank = ranking.find((entry) => entry.id === player.id)?.rankingPosition ?? null;
      const refund = getRecruitmentCost(targetRank);

      await tx.player.update({
        where: { id: playerId },
        data: {
          purchasedById: null,
          purchasedAt: null,
          alliancePending: false,
        },
      });

      await tx.player.update({
        where: { id: buyerId },
        data: {
          credits: { increment: refund },
        },
      });

      await recalculateTournamentState(tx);
    });

    if (player.purchasedBy && player.purchasedAt) {
      void sendAllianceDecisionEmail({
        eventKey: `alliance-refused:${player.purchasedBy.id}:${player.id}:${player.purchasedAt.toISOString()}`,
        accepted: false,
        buyer: player.purchasedBy,
        target: player,
      }).catch((error) => {
        console.error("[alliance-respond] refusal email failed", error);
      });
    }

    return NextResponse.json({ ok: true, status: "REFUSED" });
  } catch (error) {
    return apiError(error);
  }
}

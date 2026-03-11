import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getAllianceLabel, getRecruitmentCost, hasRecruitmentAccess } from "@/lib/economy";
import { getTournamentRanking, recalculateTournamentState } from "@/lib/tournament";
import { apiError, applyRateLimit, requireSession } from "@/app/api/_utils";

const BodySchema = z.object({
  targetPlayerId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    applyRateLimit("player-buy");
    const session = await requireSession();
    const body = BodySchema.parse(await req.json());
    const buyerId = String(session.user.id);

    if (buyerId === body.targetPlayerId) {
      throw new Error("Tu ne peux pas t'acheter toi-meme.");
    }

    const payload = await prisma.$transaction(async (tx) => {
      const [buyer, target] = await Promise.all([
        tx.player.findUnique({
          where: { id: buyerId },
          select: {
            id: true,
            pseudo: true,
            credits: true,
            gameMode: true,
            purchasedById: true,
            recruitedPlayers: { select: { id: true } },
          },
        }),
        tx.player.findUnique({
          where: { id: body.targetPlayerId },
          select: {
            id: true,
            pseudo: true,
            gameMode: true,
            purchasedById: true,
            recruitedPlayers: { select: { id: true } },
          },
        }),
      ]);

      if (!buyer || !target) {
        throw new Error("Joueur introuvable.");
      }

      if (!hasRecruitmentAccess(buyer.credits)) {
        throw new Error("Il faut au moins 20 credits pour debloquer l'achat de joueur.");
      }

      if (buyer.purchasedById) {
        throw new Error("Un joueur deja recrute ne peut pas acheter un autre joueur.");
      }

      if (buyer.recruitedPlayers.length) {
        throw new Error("Tu as deja consolide ta position avec un joueur.");
      }

      if (target.purchasedById) {
        throw new Error("Ce joueur a deja ete recrute.");
      }

      if (target.recruitedPlayers.length) {
        throw new Error("Ce joueur dirige deja une position consolidee.");
      }

      if (buyer.gameMode !== target.gameMode) {
        throw new Error("Le recrutement est autorise uniquement dans le meme mode de jeu.");
      }

      const ranking = await getTournamentRanking({ tx, gameMode: buyer.gameMode });
      const targetRank = ranking.find((entry) => entry.id === target.id)?.rankingPosition ?? null;
      const cost = getRecruitmentCost(targetRank);

      if (buyer.credits < cost) {
        throw new Error("Credits insuffisants pour ce recrutement.");
      }

      const updatedBuyer = await tx.player.update({
        where: { id: buyer.id },
        data: {
          credits: { decrement: cost },
        },
        select: {
          id: true,
          pseudo: true,
          credits: true,
          recruitedPlayers: {
            select: {
              id: true,
              pseudo: true,
              logoUrl: true,
              freefireId: true,
            },
          },
        },
      });

      const updatedTarget = await tx.player.update({
        where: { id: target.id },
        data: {
          purchasedById: buyer.id,
          purchasedAt: new Date(),
          alliancePending: true,
        },
        select: {
          id: true,
          pseudo: true,
          logoUrl: true,
          freefireId: true,
        },
      });

      await recalculateTournamentState(tx);

      return {
        buyer: {
          ...updatedBuyer,
          allianceLabel: getAllianceLabel(updatedBuyer.pseudo, updatedTarget.pseudo),
        },
        target: updatedTarget,
        cost,
      };
    });

    return NextResponse.json({ ok: true, payload });
  } catch (error) {
    return apiError(error);
  }
}
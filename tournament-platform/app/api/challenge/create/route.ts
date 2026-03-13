import { ChallengeStatus, PlayerStatus, TournamentStage } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { sendChallengeCreatedEmails } from "@/lib/email-notifications";
import { computeNextMatchSlot } from "@/lib/match-scheduling";
import { prisma } from "@/lib/prisma";
import { getTournamentConfig, recalculateTournamentState } from "@/lib/tournament";
import { apiError, applyRateLimit, requireSession } from "@/app/api/_utils";

const BodySchema = z.object({
  defenderId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    applyRateLimit("challenge-create");
    const session = await requireSession();
    const body = BodySchema.parse(await req.json());
    const config = await getTournamentConfig();

    const challengerId = session.user.id;
    if (challengerId === body.defenderId) throw new Error("Cannot challenge yourself");
    const [challenger, defender] = await Promise.all([
      prisma.player.findUnique({ where: { id: challengerId } }),
      prisma.player.findUnique({ where: { id: body.defenderId } }),
    ]);
    if (!challenger || !defender) throw new Error("Player not found");
    if (challenger.status === PlayerStatus.ELIMINATED) throw new Error("Eliminated players cannot challenge");
    if (challenger.credits < 1) throw new Error("Crédits insuffisants pour lancer un défi");
    if (challenger.gameMode !== defender.gameMode) throw new Error("Les défis sont autorisés uniquement entre joueurs du même mode");

    const roiLocked = config.stage === TournamentStage.ACTIVE && Boolean(config.activeRoiId);
    if (roiLocked && defender.status !== PlayerStatus.ROI) {
      throw new Error("Pendant la phase ROI, les défis doivent viser la première place.");
    }

    const created = await prisma.$transaction(async (tx) => {
      const busyPlayers = await tx.challenge.findFirst({
        where: {
          status: { in: [ChallengeStatus.PENDING, ChallengeStatus.ACCEPTED] },
          OR: [
            { challengerId },
            { defenderId: challengerId },
            { challengerId: body.defenderId },
            { defenderId: body.defenderId },
          ],
        },
        select: { id: true, challengerId: true, defenderId: true },
      });
      if (busyPlayers) {
        throw new Error("Un défi est déjà en cours pour l'un des joueurs concernés");
      }

      const existing = await tx.challenge.findFirst({
        where: {
          challengerId,
          defenderId: body.defenderId,
          status: { in: [ChallengeStatus.PENDING, ChallengeStatus.ACCEPTED] },
        },
        select: { id: true },
      });
      if (existing) throw new Error("Challenge already exists");

      const scheduledMatches = await tx.match.findMany({
        where: {
          status: { in: ["PENDING", "LIVE"] },
          date: { gte: new Date() },
        },
        select: { date: true },
      });

      const scheduledAt = computeNextMatchSlot({ existingDates: scheduledMatches.map((match) => match.date) });

      const challenge = await tx.challenge.create({
        data: { challengerId, defenderId: body.defenderId },
        include: {
          challenger: { select: { id: true, pseudo: true, email: true } },
          defender: { select: { id: true, pseudo: true, email: true } },
        },
      });

      const match = await tx.match.create({
        data: {
          player1Id: challengerId,
          player2Id: body.defenderId,
          date: scheduledAt,
        },
        select: { id: true, date: true },
      });

      await tx.player.update({
        where: { id: challengerId },
        data: { credits: { decrement: 1 } },
      });
      await recalculateTournamentState(tx);
      return { challenge, match };
    });

    void sendChallengeCreatedEmails({
      eventKey: `challenge-created:${created.challenge.id}:${created.match.date.toISOString()}`,
      challenger: created.challenge.challenger,
      defender: created.challenge.defender,
      scheduledAt: created.match.date,
    }).catch((error) => {
      console.error("[challenge-create] challenge emails failed", error);
    });

    revalidatePath("/historique");
    revalidatePath("/matchs");
    revalidatePath("/admin/matchs");
    revalidatePath("/profile");

    return NextResponse.json({ ok: true, challenge: created.challenge, match: created.match });
  } catch (error) {
    return apiError(error);
  }
}

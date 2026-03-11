import { ChallengeStatus, MatchStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { recalculateTournamentState } from "@/lib/tournament";
import { apiError, applyRateLimit, requireAdmin } from "@/app/api/_utils";

const BodySchema = z.object({
  matchId: z.string().min(1),
  winnerId: z.string().min(1),
  status: z.enum(["LIVE", "FINISHED"]),
});

async function revertFinishedResult(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  params: { player1Id: string; player2Id: string; winnerId: string | null },
) {
  if (!params.winnerId) return;

  const loserId = params.winnerId === params.player1Id ? params.player2Id : params.player1Id;

  await tx.player.update({
    where: { id: params.winnerId },
    data: {
      credits: { decrement: 1 },
      points: { decrement: 3 },
      wins: { decrement: 1 },
    },
  });
  await tx.player.update({
    where: { id: loserId },
    data: {
      credits: { increment: 1 },
      losses: { decrement: 1 },
    },
  });
}

async function applyFinishedResult(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  params: { player1Id: string; player2Id: string; winnerId: string },
) {
  const loserId = params.winnerId === params.player1Id ? params.player2Id : params.player1Id;

  await tx.player.update({
    where: { id: params.winnerId },
    data: {
      credits: { increment: 1 },
      points: { increment: 3 },
      wins: { increment: 1 },
    },
  });
  await tx.player.update({
    where: { id: loserId },
    data: {
      credits: { decrement: 1 },
      losses: { increment: 1 },
    },
  });
}

export async function POST(req: Request) {
  try {
    applyRateLimit("match-result");
    await requireAdmin();
    const body = BodySchema.parse(await req.json());

    const updated = await prisma.$transaction(async (tx) => {
      const match = await tx.match.findUnique({
        where: { id: body.matchId },
        select: { id: true, player1Id: true, player2Id: true, winnerId: true, status: true },
      });
      if (!match) throw new Error("Match not found");

      if (body.winnerId !== match.player1Id && body.winnerId !== match.player2Id) {
        throw new Error("Winner must be one of the match players");
      }

      const nextStatus = body.status === "LIVE" ? MatchStatus.LIVE : MatchStatus.FINISHED;

      if (match.status === MatchStatus.FINISHED) {
        await revertFinishedResult(tx, {
          player1Id: match.player1Id,
          player2Id: match.player2Id,
          winnerId: match.winnerId,
        });
      }

      if (nextStatus === MatchStatus.LIVE) {
        await tx.challenge.updateMany({
          where: {
            status: ChallengeStatus.PENDING,
            OR: [
              { challengerId: match.player1Id, defenderId: match.player2Id },
              { challengerId: match.player2Id, defenderId: match.player1Id },
            ],
          },
          data: { status: ChallengeStatus.ACCEPTED },
        });
      }

      const saved = await tx.match.update({
        where: { id: match.id },
        data: { winnerId: body.winnerId, status: nextStatus },
        include: {
          player1: { select: { id: true, pseudo: true, freefireId: true, logoUrl: true } },
          player2: { select: { id: true, pseudo: true, freefireId: true, logoUrl: true } },
          winner: { select: { id: true, pseudo: true } },
        },
      });

      if (nextStatus === MatchStatus.FINISHED) {
        await tx.challenge.updateMany({
          where: {
            status: { in: [ChallengeStatus.PENDING, ChallengeStatus.ACCEPTED] },
            OR: [
              { challengerId: match.player1Id, defenderId: match.player2Id },
              { challengerId: match.player2Id, defenderId: match.player1Id },
            ],
          },
          data: { status: ChallengeStatus.FINISHED },
        });
        await applyFinishedResult(tx, {
          player1Id: match.player1Id,
          player2Id: match.player2Id,
          winnerId: body.winnerId,
        });
      } else {
        await tx.challenge.updateMany({
          where: {
            status: ChallengeStatus.FINISHED,
            OR: [
              { challengerId: match.player1Id, defenderId: match.player2Id },
              { challengerId: match.player2Id, defenderId: match.player1Id },
            ],
          },
          data: { status: ChallengeStatus.ACCEPTED },
        });
      }

      await recalculateTournamentState(tx);

      return saved;
    });

    return NextResponse.json({ ok: true, match: updated });
  } catch (error) {
    return apiError(error);
  }
}

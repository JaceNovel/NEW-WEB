import { ChallengeStatus, MatchStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { recalculateTournamentState } from "@/lib/tournament";
import { apiError, applyRateLimit, requireAdmin } from "@/app/api/_utils";

const BodySchema = z.object({
  matchId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    applyRateLimit("match-cancel");
    await requireAdmin();
    const body = BodySchema.parse(await req.json());

    await prisma.$transaction(async (tx) => {
      const match = await tx.match.findUnique({
        where: { id: body.matchId },
        select: {
          id: true,
          status: true,
          player1Id: true,
          player2Id: true,
        },
      });

      if (!match) {
        throw new Error("Match introuvable.");
      }

      if (match.status !== MatchStatus.PENDING) {
        throw new Error("Seuls les matchs programmés peuvent être annulés.");
      }

      await tx.match.delete({ where: { id: match.id } });

      await tx.challenge.updateMany({
        where: {
          status: ChallengeStatus.ACCEPTED,
          OR: [
            { challengerId: match.player1Id, defenderId: match.player2Id },
            { challengerId: match.player2Id, defenderId: match.player1Id },
          ],
        },
        data: { status: ChallengeStatus.PENDING },
      });

      await recalculateTournamentState(tx);
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
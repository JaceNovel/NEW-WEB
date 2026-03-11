import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { recalculateTournamentState } from "@/lib/tournament";
import { apiError, applyRateLimit, requireAdmin } from "@/app/api/_utils";

const BodySchema = z.object({
  playerId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    applyRateLimit("player-delete");
    await requireAdmin();
    const body = BodySchema.parse(await req.json());

    await prisma.$transaction(async (tx) => {
      await tx.match.deleteMany({
        where: {
          OR: [{ player1Id: body.playerId }, { player2Id: body.playerId }, { winnerId: body.playerId }],
        },
      });
      await tx.challenge.deleteMany({
        where: { OR: [{ challengerId: body.playerId }, { defenderId: body.playerId }] },
      });
      await tx.player.delete({ where: { id: body.playerId } });
      await recalculateTournamentState(tx);
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}

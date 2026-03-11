import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { recalculateTournamentState } from "@/lib/tournament";
import { apiError, applyRateLimit } from "@/app/api/_utils";

export async function GET() {
  try {
    applyRateLimit("player-list");
    await recalculateTournamentState();

    const players = await prisma.player.findMany({
      orderBy: [{ credits: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        pseudo: true,
        freefireId: true,
        countryCode: true,
        gameMode: true,
        logoUrl: true,
        credits: true,
        status: true,
        wins: true,
        losses: true,
        isSeededTop10: true,
        finalRank: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ ok: true, players });
  } catch (error) {
    return apiError(error);
  }
}

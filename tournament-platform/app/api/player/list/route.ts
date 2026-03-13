import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { recalculateTournamentState } from "@/lib/tournament";
import { apiError, applyRateLimit } from "@/app/api/_utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    applyRateLimit("player-list");
    await recalculateTournamentState();

    const players = await prisma.player.findMany({
      where: {
        role: "PLAYER",
      },
      orderBy: [{ credits: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        pseudo: true,
        freefireId: true,
        countryCode: true,
        gameMode: true,
        logoUrl: true,
        credits: true,
        points: true,
        status: true,
        wins: true,
        losses: true,
        isSeededTop10: true,
        finalRank: true,
        createdAt: true,
        purchasedById: true,
        alliancePending: true,
        recruitedPlayers: {
          where: { alliancePending: false },
          select: {
            id: true,
            pseudo: true,
            logoUrl: true,
            freefireId: true,
          },
        },
      },
    });

    return NextResponse.json(
      { ok: true, players },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
  } catch (error) {
    return apiError(error);
  }
}

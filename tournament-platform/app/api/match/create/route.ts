import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { apiError, applyRateLimit, requireAdmin } from "@/app/api/_utils";

const BodySchema = z.object({
  player1Id: z.string().min(1),
  player2Id: z.string().min(1),
  date: z.string().datetime(),
});

export async function POST(req: Request) {
  try {
    applyRateLimit("match-create");
    await requireAdmin();
    const body = BodySchema.parse(await req.json());
    if (body.player1Id === body.player2Id) throw new Error("Players must be different");

    const [player1, player2] = await Promise.all([
      prisma.player.findUnique({ where: { id: body.player1Id }, select: { id: true, gameMode: true } }),
      prisma.player.findUnique({ where: { id: body.player2Id }, select: { id: true, gameMode: true } }),
    ]);
    if (!player1 || !player2) throw new Error("Player not found");
    if (player1.gameMode !== player2.gameMode) throw new Error("Un match doit opposer deux joueurs du même mode");

    const match = await prisma.match.create({
      data: {
        player1Id: body.player1Id,
        player2Id: body.player2Id,
        date: new Date(body.date),
      },
      include: {
        player1: { select: { id: true, pseudo: true, freefireId: true, logoUrl: true } },
        player2: { select: { id: true, pseudo: true, freefireId: true, logoUrl: true } },
      },
    });

    return NextResponse.json({ ok: true, match });
  } catch (error) {
    return apiError(error);
  }
}

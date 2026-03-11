import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { recalculateTournamentState } from "@/lib/tournament";
import { apiError, applyRateLimit, requireAdmin } from "@/app/api/_utils";

const BodySchema = z
  .object({
    playerId: z.string().min(1),
    delta: z.number().int().min(-50).max(50).optional(),
    setCredits: z.number().int().min(0).max(999).optional(),
  })
  .refine((v) => v.delta !== undefined || v.setCredits !== undefined, {
    message: "delta or setCredits required",
  });

export async function POST(req: Request) {
  try {
    applyRateLimit("credit-update");
    await requireAdmin();
    const body = BodySchema.parse(await req.json());

    const updated = await prisma.$transaction(async (tx) => {
      const player = await tx.player.update({
        where: { id: body.playerId },
        data:
          body.setCredits !== undefined
            ? { credits: body.setCredits }
            : { credits: { increment: body.delta ?? 0 } },
        select: { id: true, credits: true, status: true },
      });
      await recalculateTournamentState(tx);
      return player;
    });

    return NextResponse.json({ ok: true, player: updated });
  } catch (error) {
    return apiError(error);
  }
}

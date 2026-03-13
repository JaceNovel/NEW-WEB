import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { sendScheduledMatchEmails } from "@/lib/email-notifications";
import { computeNextMatchSlot } from "@/lib/match-scheduling";
import { prisma } from "@/lib/prisma";
import { apiError, applyRateLimit, requireAdmin } from "@/app/api/_utils";

const BodySchema = z.object({
  player1Id: z.string().min(1),
  player2Id: z.string().min(1),
  date: z.string().datetime().optional(),
});

export async function POST(req: Request) {
  try {
    applyRateLimit("match-create");
    await requireAdmin();
    const body = BodySchema.parse(await req.json());
    if (body.player1Id === body.player2Id) throw new Error("Players must be different");

    const [player1, player2, existingMatch, scheduledMatches] = await Promise.all([
      prisma.player.findUnique({ where: { id: body.player1Id }, select: { id: true, pseudo: true, email: true, gameMode: true } }),
      prisma.player.findUnique({ where: { id: body.player2Id }, select: { id: true, pseudo: true, email: true, gameMode: true } }),
      prisma.match.findFirst({
        where: {
          status: { in: ["PENDING", "LIVE"] },
          OR: [
            { player1Id: body.player1Id, player2Id: body.player2Id },
            { player1Id: body.player2Id, player2Id: body.player1Id },
          ],
        },
        include: {
          player1: { select: { id: true, pseudo: true, freefireId: true, logoUrl: true } },
          player2: { select: { id: true, pseudo: true, freefireId: true, logoUrl: true } },
        },
      }),
      prisma.match.findMany({
        where: {
          status: { in: ["PENDING", "LIVE"] },
          date: { gte: new Date() },
        },
        select: { date: true },
      }),
    ]);
    if (!player1 || !player2) throw new Error("Player not found");
    if (player1.gameMode !== player2.gameMode) throw new Error("Un match doit opposer deux joueurs du même mode");

    if (existingMatch) {
      return NextResponse.json({ ok: true, match: existingMatch, alreadyScheduled: true });
    }

    const scheduledAt = computeNextMatchSlot({ existingDates: scheduledMatches.map((match) => match.date) });

    const match = await prisma.match.create({
      data: {
        player1Id: body.player1Id,
        player2Id: body.player2Id,
        date: scheduledAt,
      },
      include: {
        player1: { select: { id: true, pseudo: true, freefireId: true, logoUrl: true } },
        player2: { select: { id: true, pseudo: true, freefireId: true, logoUrl: true } },
      },
    });

    void sendScheduledMatchEmails({
      eventKey: `match-scheduled:${match.id}:${scheduledAt.toISOString()}`,
      player1,
      player2,
      scheduledAt,
    }).catch((error) => {
      console.error("[match-create] scheduled match emails failed", error);
    });

    revalidatePath("/historique");
    revalidatePath("/matchs");
    revalidatePath("/admin/matchs");
    revalidatePath("/profile");

    return NextResponse.json({ ok: true, match });
  } catch (error) {
    return apiError(error);
  }
}

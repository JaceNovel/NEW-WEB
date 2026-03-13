import { MatchStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { sendMatchRescheduledEmails } from "@/lib/email-notifications";
import { computeNextMatchSlot } from "@/lib/match-scheduling";
import { prisma } from "@/lib/prisma";
import { apiError, applyRateLimit, requireAdmin } from "@/app/api/_utils";

const BodySchema = z.object({
  matchId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    applyRateLimit("match-reschedule");
    await requireAdmin();
    const body = BodySchema.parse(await req.json());

    const rescheduled = await prisma.$transaction(async (tx) => {
      const match = await tx.match.findUnique({
        where: { id: body.matchId },
        select: {
          id: true,
          status: true,
          date: true,
          player1: { select: { id: true, pseudo: true, email: true } },
          player2: { select: { id: true, pseudo: true, email: true } },
        },
      });

      if (!match) {
        throw new Error("Match introuvable.");
      }

      if (match.status !== MatchStatus.PENDING) {
        throw new Error("Seuls les matchs programmés peuvent être reportés.");
      }

      const scheduledMatches = await tx.match.findMany({
        where: {
          status: { in: [MatchStatus.PENDING, MatchStatus.LIVE] },
          id: { not: match.id },
          date: { gte: new Date() },
        },
        select: { date: true },
      });

      const nextDate = computeNextMatchSlot({ existingDates: scheduledMatches.map((entry) => entry.date) });

      const updated = await tx.match.update({
        where: { id: match.id },
        data: { date: nextDate },
        select: { id: true, date: true },
      });

      return {
        id: match.id,
        previousDate: match.date,
        nextDate: updated.date,
        player1: match.player1,
        player2: match.player2,
      };
    });

    void sendMatchRescheduledEmails({
      eventKey: `match-rescheduled:${rescheduled.id}:${rescheduled.nextDate.toISOString()}`,
      player1: rescheduled.player1,
      player2: rescheduled.player2,
      previousDate: rescheduled.previousDate,
      nextDate: rescheduled.nextDate,
    }).catch((error) => {
      console.error("[match-reschedule] reschedule emails failed", error);
    });

    revalidatePath("/historique");
    revalidatePath("/matchs");
    revalidatePath("/admin/matchs");
    revalidatePath("/profile");

    return NextResponse.json({ ok: true, date: rescheduled.nextDate });
  } catch (error) {
    return apiError(error);
  }
}
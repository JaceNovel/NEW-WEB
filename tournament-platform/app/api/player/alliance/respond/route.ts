import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { apiError, applyRateLimit, requireSession } from "@/app/api/_utils";

const BodySchema = z.object({
  action: z.enum(["ACCEPT", "REFUSE"]),
});

export async function POST(req: Request) {
  try {
    applyRateLimit("alliance-respond");
    const session = await requireSession();
    const playerId = String(session.user.id);
    const body = BodySchema.parse(await req.json());

    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: {
        id: true,
        purchasedById: true,
        alliancePending: true,
      },
    });

    if (!player?.purchasedById) {
      const error = new Error("Aucune demande d'association.");
      // @ts-expect-error attach status
      error.status = 400;
      throw error;
    }

    if (!player.alliancePending) {
      const error = new Error("Cette association a déjà été traitée.");
      // @ts-expect-error attach status
      error.status = 400;
      throw error;
    }

    if (body.action === "ACCEPT") {
      await prisma.player.update({
        where: { id: playerId },
        data: {
          alliancePending: false,
        },
      });

      return NextResponse.json({ ok: true, status: "ACCEPTED" });
    }

    await prisma.player.update({
      where: { id: playerId },
      data: {
        purchasedById: null,
        purchasedAt: null,
        alliancePending: false,
      },
    });

    return NextResponse.json({ ok: true, status: "REFUSED" });
  } catch (error) {
    return apiError(error);
  }
}

import { revalidatePath } from "next/cache";
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

    const deleted = await prisma.$transaction(async (tx) => {
      const existingPlayer = await tx.player.findUnique({
        where: { id: body.playerId },
        select: { id: true },
      });

      if (!existingPlayer) {
        return false;
      }

      await tx.match.deleteMany({
        where: {
          OR: [{ player1Id: body.playerId }, { player2Id: body.playerId }, { winnerId: body.playerId }],
        },
      });

      await tx.challenge.deleteMany({
        where: { OR: [{ challengerId: body.playerId }, { defenderId: body.playerId }] },
      });

      await tx.creditPurchase.deleteMany({
        where: { playerId: body.playerId },
      });

      await tx.creditPayment.deleteMany({
        where: { playerId: body.playerId },
      });

      await tx.passwordResetToken.deleteMany({
        where: { playerId: body.playerId },
      });

      await tx.player.updateMany({
        where: { purchasedById: body.playerId },
        data: {
          purchasedById: null,
          purchasedAt: null,
          alliancePending: false,
        },
      });

      await tx.tournamentConfig.updateMany({
        where: { activeRoiId: body.playerId },
        data: { activeRoiId: null },
      });

      const result = await tx.player.deleteMany({ where: { id: body.playerId } });
      if (result.count === 0) {
        return false;
      }

      await recalculateTournamentState(tx);

      return true;
    });

    if (!deleted) {
      return NextResponse.json({ ok: false, error: "Ce joueur a déjà été supprimé ou n'existe plus." }, { status: 404 });
    }

    revalidatePath("/credits");
    revalidatePath("/profile");
    revalidatePath("/classement");
    revalidatePath("/historique");
    revalidatePath("/matchs");
    revalidatePath("/admin/matchs");
    revalidatePath("/admin/joueurs");
    revalidatePath("/admin/credits");
    revalidatePath("/admin");

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}

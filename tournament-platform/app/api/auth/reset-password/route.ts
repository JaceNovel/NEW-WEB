import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { apiError, applyRateLimit } from "@/app/api/_utils";
import { hashPasswordResetToken } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";

const BodySchema = z.object({
  token: z.string().min(20),
  password: z.string().min(6).max(72),
});

export async function POST(req: Request) {
  try {
    applyRateLimit("reset-password");

    const body = BodySchema.parse(await req.json());
    const tokenHash = hashPasswordResetToken(body.token);

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        playerId: true,
        expiresAt: true,
        usedAt: true,
      },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt.getTime() < Date.now()) {
      const error = new Error("Le lien de réinitialisation est invalide ou expiré.");
      // @ts-expect-error attach status
      error.status = 400;
      throw error;
    }

    const passwordHash = await bcrypt.hash(body.password, 12);

    await prisma.$transaction(async (tx) => {
      await tx.player.update({
        where: { id: resetToken.playerId },
        data: { passwordHash },
      });

      await tx.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      });

      await tx.passwordResetToken.deleteMany({
        where: {
          playerId: resetToken.playerId,
          id: { not: resetToken.id },
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
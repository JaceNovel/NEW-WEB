import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, applyRateLimit } from "@/app/api/_utils";
import { isBrevoConfigured } from "@/lib/brevo";
import { sendPasswordResetEmail } from "@/lib/email-notifications";
import { createPasswordResetToken, buildPasswordResetUrl } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";

const BodySchema = z.object({
  identifier: z.string().trim().min(2).max(160),
});

export async function POST(req: Request) {
  try {
    applyRateLimit("forgot-password");

    if (!isBrevoConfigured()) {
      const error = new Error("La messagerie de réinitialisation n'est pas configurée.");
      // @ts-expect-error attach status
      error.status = 503;
      throw error;
    }

    const body = BodySchema.parse(await req.json());
    const identifier = body.identifier.trim();

    const player = await prisma.player.findFirst({
      where: {
        OR: [
          { pseudo: identifier },
          {
            email: {
              equals: identifier.toLowerCase(),
              mode: "insensitive",
            },
          },
        ],
      },
      select: {
        id: true,
        pseudo: true,
        email: true,
      },
    });

    if (!player?.email) {
      return NextResponse.json({ ok: true });
    }

    const token = createPasswordResetToken();

    await prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.deleteMany({
        where: {
          playerId: player.id,
          usedAt: null,
        },
      });

      await tx.passwordResetToken.create({
        data: {
          playerId: player.id,
          tokenHash: token.tokenHash,
          expiresAt: token.expiresAt,
        },
      });
    });

    await sendPasswordResetEmail({
      eventKey: `password-reset:${player.id}:${token.tokenHash}`,
      player,
      resetUrl: buildPasswordResetUrl(token.token),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
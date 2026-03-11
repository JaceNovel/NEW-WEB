import { GameMode } from "@prisma/client";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { COUNTRY_OPTIONS } from "@/lib/countries";
import { recalculateTournamentState } from "@/lib/tournament";
import { apiError, applyRateLimit } from "@/app/api/_utils";

const countryCodes = COUNTRY_OPTIONS.map((country) => country.code) as [string, ...string[]];

const BodySchema = z.object({
  pseudo: z.string().min(2).max(24),
  freefireId: z.string().min(3).max(32),
  countryCode: z.enum(countryCodes),
  gameMode: z.nativeEnum(GameMode),
  logoUrl: z.string().refine((value) => value.startsWith("/") || z.string().url().safeParse(value).success, {
    message: "Logo invalide",
  }),
  password: z.string().min(6).max(72),
});

export async function POST(req: Request) {
  try {
    applyRateLimit("player-create");
    const body = BodySchema.parse(await req.json());

    const passwordHash = await bcrypt.hash(body.password, 12);

    const existingById = await prisma.player.findUnique({
      where: { freefireId: body.freefireId.trim() },
      select: { id: true },
    });
    if (existingById) {
      return NextResponse.json({ ok: false, error: "Cet ID Free Fire est déjà inscrit." }, { status: 409 });
    }

    const created = await prisma.$transaction(async (tx) => {
      const player = await tx.player.create({
        data: {
          pseudo: body.pseudo.trim(),
          freefireId: body.freefireId.trim(),
          countryCode: body.countryCode.trim().toUpperCase(),
          gameMode: body.gameMode,
          logoUrl: body.logoUrl,
          credits: 5,
          weeklyCreditsGrantedAt: new Date(),
          passwordHash,
        },
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
          createdAt: true,
        },
      });
      await recalculateTournamentState(tx);
      return player;
    });

    return NextResponse.json({ ok: true, player: created });
  } catch (error) {
    return apiError(error);
  }
}

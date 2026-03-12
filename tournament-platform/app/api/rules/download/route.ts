import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { applyRateLimit, apiError } from "@/app/api/_utils";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createRulesPdf } from "@/lib/rulesPdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}

export async function GET() {
  try {
    applyRateLimit("rules-download");

    const session = await getServerSession(authOptions);
    const sessionUser = session?.user;

    if (!sessionUser?.id) {
      return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL ?? "http://localhost:3000"));
    }

    let player = null as null | {
      id: string;
      pseudo: string;
      freefireId: string;
      status: string;
      gameMode: string;
      credits: number;
      role: string;
    };

    if (sessionUser?.id && sessionUser.id !== "admin-env" && process.env.DATABASE_URL) {
      player = await prisma.player.findUnique({
        where: { id: sessionUser.id },
        select: {
          id: true,
          pseudo: true,
          freefireId: true,
          status: true,
          gameMode: true,
          credits: true,
          role: true,
        },
      });
    }

    const pseudo = player?.pseudo ?? sessionUser?.name ?? "Joueur KING";
    const freefireId = player?.freefireId ?? sessionUser?.freefireId ?? "NON-RATTACHE";
    const status = player?.status ?? sessionUser?.status ?? "PLAYER";
    const gameMode = player?.gameMode ?? sessionUser?.gameMode ?? "SPAM / ONETAP";
    const credits = player?.credits ?? sessionUser?.credits ?? 0;
    const role = player?.role ?? sessionUser?.role ?? "PLAYER";

    const pdf = await createRulesPdf({
      pseudo,
      freefireId,
      status,
      gameMode,
      credits,
      role,
      recipientId: player?.id ?? sessionUser?.id ?? pseudo,
    });

    const filename = `attestation-solo-regles-tournoi-${slugify(pseudo) || "joueur"}.pdf`;

    return new Response(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
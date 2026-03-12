import type { Metadata } from "next";
import HistoryArena from "@/components/HistoryArena";
import { prisma } from "@/lib/prisma";
import { buildPageMetadata } from "@/lib/seo";
import { safeJson } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = buildPageMetadata({
  title: "Historique des matchs",
  description: "Retrouve l'historique des affrontements KING League, les vainqueurs, les dates de duel et la memoire du trone du ROI.",
  path: "/historique",
  keywords: ["historique matchs Free Fire", "resultats KING League", "duels valides"],
});

export default async function HistoriquePage() {
  const hasDb = Boolean(process.env.DATABASE_URL);

  const matches = hasDb
    ? await prisma.match.findMany({
        where: { status: "FINISHED", winnerId: { not: null } },
        orderBy: [{ date: "desc" }],
        take: 15,
        include: {
          player1: { select: { id: true, pseudo: true, freefireId: true, countryCode: true, logoUrl: true } },
          player2: { select: { id: true, pseudo: true, freefireId: true, countryCode: true, logoUrl: true } },
        },
      })
    : [];

  return <HistoryArena matches={safeJson(matches)} />;
}
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

  const [matches, challenges] = hasDb
    ? await Promise.all([
        prisma.match.findMany({
          orderBy: [{ date: "desc" }],
          take: 24,
          include: {
            player1: { select: { id: true, pseudo: true, freefireId: true, countryCode: true, logoUrl: true } },
            player2: { select: { id: true, pseudo: true, freefireId: true, countryCode: true, logoUrl: true } },
          },
        }),
        prisma.challenge.findMany({
          where: { status: { in: ["PENDING", "ACCEPTED"] } },
          orderBy: [{ updatedAt: "desc" }],
          take: 24,
          include: {
            challenger: { select: { id: true, pseudo: true, freefireId: true, countryCode: true, logoUrl: true } },
            defender: { select: { id: true, pseudo: true, freefireId: true, countryCode: true, logoUrl: true } },
          },
        }),
      ])
    : [[], []];

  const scheduledMatchPairs = new Set(
    matches
      .filter((match) => match.status !== "FINISHED")
      .map((match) => [match.player1Id, match.player2Id].sort().join(":")),
  );

  const challengeItems = challenges
    .filter((challenge) => !scheduledMatchPairs.has([challenge.challengerId, challenge.defenderId].sort().join(":")))
    .map((challenge) => ({
      id: `challenge-${challenge.id}`,
      status: "PENDING" as const,
      date: challenge.updatedAt.toISOString(),
      winnerId: null,
      sourceType: "CHALLENGE" as const,
      challengeStatus: challenge.status,
      player1: challenge.challenger,
      player2: challenge.defender,
    }));

  const historyItems = [...matches.map((match) => ({ ...match, sourceType: "MATCH" as const })), ...challengeItems];

  return <HistoryArena matches={safeJson(historyItems)} />;
}
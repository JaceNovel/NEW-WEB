import type { Metadata } from "next";
import MatchesArena from "@/components/MatchesArena";
import { prisma } from "@/lib/prisma";
import { buildPageMetadata } from "@/lib/seo";
import { safeJson } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = buildPageMetadata({
  title: "Matchs 1v1 Free Fire",
  description: "Suis les matchs KING League en direct, les affiches programmees et les duels qui peuvent faire tomber le ROI.",
  path: "/matchs",
  keywords: ["matchs Free Fire", "duels 1v1", "programme KING League"],
});

function buildWinStreakMap(
  matches: Array<{
    status: "PENDING" | "LIVE" | "FINISHED";
    player1Id: string;
    player2Id: string;
    winnerId: string | null;
    date: Date | string;
  }>,
) {
  const streakByPlayer = new Map<string, number>();
  const frozenPlayers = new Set<string>();

  const finishedMatches = matches
    .filter((match) => match.status === "FINISHED" && match.winnerId)
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());

  for (const match of finishedMatches) {
    const winnerId = match.winnerId;
    if (!winnerId) continue;

    const loserId = winnerId === match.player1Id ? match.player2Id : match.player1Id;

    if (!frozenPlayers.has(winnerId)) {
      streakByPlayer.set(winnerId, (streakByPlayer.get(winnerId) ?? 0) + 1);
    }

    if (!frozenPlayers.has(loserId)) {
      frozenPlayers.add(loserId);
    }
  }

  return streakByPlayer;
}

export default async function MatchsPage() {
  const hasDb = Boolean(process.env.DATABASE_URL);

  const [matches, ranking] = hasDb
    ? await Promise.all([
        prisma.match.findMany({
          orderBy: [{ status: "asc" }, { date: "asc" }],
          include: {
            player1: { select: { id: true, pseudo: true, freefireId: true, countryCode: true, logoUrl: true } },
            player2: { select: { id: true, pseudo: true, freefireId: true, countryCode: true, logoUrl: true } },
          },
        }),
        prisma.player.findMany({
          where: { role: "PLAYER" },
          orderBy: [{ points: "desc" }, { wins: "desc" }, { credits: "desc" }, { createdAt: "asc" }],
          take: 5,
          select: { id: true, pseudo: true, countryCode: true, credits: true, points: true, wins: true, logoUrl: true },
        }),
      ])
    : [[], []];

  const viewMatches = matches;
  const streakByPlayer = buildWinStreakMap(viewMatches);
  const viewRanking = ranking.length
    ? ranking.map((entry) => ({
        ...entry,
        winStreak: streakByPlayer.get(entry.id) ?? 0,
      }))
    : [];

  return <MatchesArena matches={safeJson(viewMatches)} ranking={safeJson(viewRanking)} />;
}

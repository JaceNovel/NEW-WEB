import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import CreditsHub from "@/components/CreditsHub";
import { authOptions } from "@/lib/auth";
import { ensureCreditProducts, getRecruitmentCost } from "@/lib/economy";
import { prisma } from "@/lib/prisma";
import { getTournamentRanking, recalculateTournamentState } from "@/lib/tournament";
import { safeJson } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CreditsPage() {
  if (!process.env.DATABASE_URL) {
    return (
      <main className="mx-auto max-w-[1200px] px-4 py-10">
        <section className="tp-home-panel rounded-[18px] border border-violet-300/20 p-6">
          <h1 className="text-2xl font-black uppercase tracking-wide text-white">Crédits</h1>
          <p className="mt-3 text-sm text-white/70">DATABASE_URL manquant. Configure la base avant d&apos;utiliser la boutique.</p>
        </section>
      </main>
    );
  }

  const session = await getServerSession(authOptions);
  const playerId = session?.user?.id;

  if (!playerId) {
    redirect("/login");
  }

  await recalculateTournamentState();
  const creditProducts = await ensureCreditProducts();

  const currentPlayer = await prisma.player.findUnique({
    where: { id: playerId },
    select: {
      id: true,
      pseudo: true,
      credits: true,
      points: true,
      gameMode: true,
      purchasedBy: { select: { pseudo: true } },
      recruitedPlayers: {
        select: {
          id: true,
          pseudo: true,
          logoUrl: true,
          freefireId: true,
          alliancePending: true,
        },
      },
      creditPurchases: {
        select: {
          packKey: true,
        },
      },
    },
  });

  if (!currentPlayer) {
    redirect("/login");
  }

  const ranking = await getTournamentRanking({ gameMode: currentPlayer.gameMode });
  const marketPlayers = ranking
    .filter((player) => player.id !== currentPlayer.id)
    .filter((player) => !player.purchasedById)
    .filter((player) => player.recruitedPlayersCount === 0)
    .map((player) => ({
      ...player,
      recruitmentCost: getRecruitmentCost(player.rankingPosition),
    }));

  const packs = creditProducts.filter((pack) => pack.isActive).map((pack) => ({
    ...pack,
    limit: pack.maxPurchasesPerPlayer,
    usedCount: currentPlayer.creditPurchases.filter((purchase) => purchase.packKey === pack.key).length,
  }));

  return <CreditsHub currentPlayer={safeJson(currentPlayer)} packs={safeJson(packs)} marketPlayers={safeJson(marketPlayers)} />;
}
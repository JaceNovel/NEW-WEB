import AdminMatchManager from "@/components/admin/AdminMatchManager";
import { prisma } from "@/lib/prisma";
import { safeJson } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminMatchsPage() {
  if (!process.env.DATABASE_URL) {
    return (
      <main>
        <div className="tp-glass rounded-3xl p-6">
          <div className="text-lg font-bold text-white">Configuration requise</div>
          <p className="mt-2 text-sm text-white/70">
            DATABASE_URL manquant. Configure la base PostgreSQL pour gérer les matchs.
          </p>
        </div>
      </main>
    );
  }

  const players = await prisma.player.findMany({
    orderBy: [{ pseudo: "asc" }],
    select: { id: true, pseudo: true, freefireId: true, gameMode: true, logoUrl: true },
  });

  const challenges = await prisma.challenge.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: {
      challenger: { select: { id: true, pseudo: true, freefireId: true, gameMode: true, logoUrl: true } },
      defender: { select: { id: true, pseudo: true, freefireId: true, gameMode: true, logoUrl: true } },
    },
  });

  const matches = await prisma.match.findMany({
    orderBy: [{ date: "desc" }],
    include: {
      player1: { select: { id: true, pseudo: true, freefireId: true } },
      player2: { select: { id: true, pseudo: true, freefireId: true } },
    },
  });

  return (
    <main>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-white">Matchs</h1>
        <p className="mt-2 text-sm text-white/60">Défis, création de matchs et validation des gagnants</p>
      </div>

      <AdminMatchManager players={safeJson(players) as any} challenges={safeJson(challenges) as any} matches={safeJson(matches) as any} />
    </main>
  );
}

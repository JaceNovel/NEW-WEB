import AdminHistoryManager from "@/components/admin/AdminHistoryManager";
import { prisma } from "@/lib/prisma";
import { safeJson } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminHistoriquePage() {
  if (!process.env.DATABASE_URL) {
    return (
      <main>
        <div className="tp-glass rounded-3xl p-6">
          <div className="text-lg font-bold text-white">Configuration requise</div>
          <p className="mt-2 text-sm text-white/70">DATABASE_URL manquant. Configure la base PostgreSQL pour utiliser l&apos;historique.</p>
        </div>
      </main>
    );
  }

  const matches = await prisma.match.findMany({
    where: { status: "FINISHED", winnerId: { not: null } },
    orderBy: [{ date: "desc" }],
    include: {
      player1: { select: { id: true, pseudo: true, freefireId: true, logoUrl: true } },
      player2: { select: { id: true, pseudo: true, freefireId: true, logoUrl: true } },
    },
  });

  return (
    <main>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-white">Historique</h1>
        <p className="mt-2 text-sm text-white/60">Gestion de tous les matchs qui ont déjà eu lieu</p>
      </div>

      <AdminHistoryManager matches={safeJson(matches) as any} />
    </main>
  );
}
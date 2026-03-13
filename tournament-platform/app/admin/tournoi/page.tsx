import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import AdminTournamentManager from "@/components/admin/AdminTournamentManager";
import { authOptions } from "@/lib/auth";
import { getTournamentConfig } from "@/lib/tournament";

export const dynamic = "force-dynamic";

export default async function AdminTournoiPage() {
  if (!process.env.DATABASE_URL) {
    return (
      <main>
        <div className="tp-glass rounded-3xl p-6">
          <div className="text-lg font-bold text-white">Configuration requise</div>
          <p className="mt-2 text-sm text-white/70">
            DATABASE_URL manquant. Configure la base PostgreSQL pour gerer le tournoi.
          </p>
        </div>
      </main>
    );
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/");

  await getTournamentConfig();

  return (
    <main>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-950">Tournoi</h1>
        <p className="mt-2 text-sm text-slate-500">Pilotage du top 20, du ROI et du classement final.</p>
      </div>

      <AdminTournamentManager />
    </main>
  );
}

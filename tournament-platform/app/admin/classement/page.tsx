import Link from "next/link";
import { Crown, Shield, Trophy, Users } from "lucide-react";

import AdminTournamentManager from "@/components/admin/AdminTournamentManager";
import { prisma } from "@/lib/prisma";
import { getTournamentConfig, getTournamentRanking, recalculateTournamentState } from "@/lib/tournament";

export const dynamic = "force-dynamic";

function stageLabel(stage: string) {
  switch (stage) {
    case "REGISTRATION":
      return "Inscriptions ouvertes";
    case "LOCKED":
      return "Top 20 verrouillé";
    case "ACTIVE":
      return "Tournoi actif";
    case "FINALIZED":
      return "Classement final validé";
    default:
      return stage;
  }
}

export default async function AdminClassementPage() {
  if (!process.env.DATABASE_URL) {
    return (
      <main>
        <div className="rounded-3xl border border-slate-950 bg-black p-6 text-white">
          <div className="text-lg font-bold text-white">Configuration requise</div>
          <p className="mt-2 text-sm text-white/70">DATABASE_URL manquant. Configure la base PostgreSQL pour utiliser le classement admin.</p>
        </div>
      </main>
    );
  }

  await recalculateTournamentState();

  const [config, ranking, playersCount] = await Promise.all([
    getTournamentConfig(),
    getTournamentRanking(),
    prisma.player.count({ where: { role: "PLAYER" } }),
  ]);

  const roi = ranking.find((entry) => entry.status === "ROI") ?? null;

  const summaryCards = [
    { label: "Phase", value: stageLabel(config.stage), icon: Shield },
    { label: "ROI actif", value: roi?.pseudo ?? "Non choisi", icon: Crown },
    { label: "Joueurs classés", value: String(ranking.length), icon: Trophy },
    { label: "Inscrits", value: String(playersCount), icon: Users },
  ];

  return (
    <main className="space-y-6">
      <div className="mb-2">
        <h1 className="text-2xl font-extrabold text-slate-950">Classement</h1>
        <p className="mt-2 text-sm text-slate-500">Classement en direct du tournoi et accès à la gestion du ROI, du top 10 et du top 20 final.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className="rounded-3xl border border-slate-950 bg-black p-5 text-white">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.22em] text-white/45">{card.label}</div>
                  <div className="mt-2 text-lg font-bold text-white">{card.value}</div>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-amber-300">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <article className="rounded-3xl border border-slate-950 bg-black p-6 text-white">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-bold text-white">Classement actuel</div>
              <div className="mt-1 text-sm text-white/60">Le classement se met à jour automatiquement dès qu&apos;un gagnant est validé dans les matchs.</div>
            </div>
            <Link href="/classement" className="tp-button-ghost">
              Voir version publique
            </Link>
          </div>

          <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-white/60">
                <tr>
                  <th className="px-4 py-3">Rang</th>
                  <th className="px-4 py-3">Joueur</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3">Crédits</th>
                  <th className="px-4 py-3">Bilan</th>
                  <th className="px-4 py-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {ranking.length ? (
                  ranking.map((player) => (
                    <tr key={player.id} className="hover:bg-white/5">
                      <td className="px-4 py-3 font-bold text-amber-200">#{player.rankingPosition}</td>
                      <td className="px-4 py-3 text-white">
                        <div className="flex items-center gap-3">
                          <img src={player.logoUrl} alt={player.pseudo} className="h-11 w-11 rounded-2xl border border-white/10 bg-black/20 object-contain p-1" />
                          <div>
                            <div className="font-bold">{player.pseudo}</div>
                            <div className="text-xs text-white/45">{player.freefireId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white/70">{player.gameMode}</td>
                      <td className="px-4 py-3 text-white">{player.credits}</td>
                      <td className="px-4 py-3 text-white/70">{player.wins}V / {player.losses}D</td>
                      <td className="px-4 py-3 text-white/70">{player.status}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-white/45">Aucun classement disponible pour le moment.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-3xl border border-slate-950 bg-black p-6 text-white">
          <div className="text-lg font-bold text-white">Gestion du classement</div>
          <div className="mt-2 text-sm text-white/60">Le module avancé du tournoi est désormais embarqué directement sous le tableau de classement.</div>

          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-white/10 bg-[#080808] p-4 text-sm text-white/75">
              Choisir le ROI, sélectionner le top 10, finaliser le top 20 et recalculer le tournoi sans quitter cette page.
            </div>
            <Link href="/admin/matchs" className="tp-button-ghost w-full justify-center">
              Aller aux matchs
            </Link>
          </div>
        </article>
      </section>

      <AdminTournamentManager compact />
    </main>
  );
}
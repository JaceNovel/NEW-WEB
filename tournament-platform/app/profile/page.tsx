import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Crown, FlameKindling, Ghost, Swords, Trophy } from "lucide-react";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTournamentRanking } from "@/lib/tournament";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  if (!process.env.DATABASE_URL) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="tp-glass rounded-3xl p-6">
          <div className="text-lg font-bold text-white">Configuration requise</div>
          <p className="mt-2 text-sm text-white/70">
            DATABASE_URL manquant. Configure la base PostgreSQL pour accéder au profil.
          </p>
        </div>
      </main>
    );
  }

  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id) redirect("/login");

  const player = await prisma.player.findUnique({
    where: { id },
    select: {
      id: true,
      pseudo: true,
      freefireId: true,
      logoUrl: true,
      credits: true,
      wins: true,
      losses: true,
      status: true,
      gameMode: true,
    },
  });
  if (!player) redirect("/login");

  const matches = await prisma.match.findMany({
    where: { OR: [{ player1Id: id }, { player2Id: id }] },
    orderBy: [{ date: "desc" }],
    take: 10,
    include: {
      player1: { select: { id: true, pseudo: true, freefireId: true, logoUrl: true } },
      player2: { select: { id: true, pseudo: true, freefireId: true, logoUrl: true } },
    },
  });

  const challenges = await prisma.challenge.findMany({
    where: { OR: [{ challengerId: id }, { defenderId: id }] },
    orderBy: [{ createdAt: "desc" }],
    take: 6,
    include: {
      challenger: { select: { pseudo: true, logoUrl: true } },
      defender: { select: { pseudo: true, logoUrl: true } },
    },
  });

  const ranking = await getTournamentRanking();
  const rank = ranking.find((entry) => entry.id === id)?.rankingPosition ?? null;

  const statCards = [
    { label: "Matchs", value: matches.length, icon: Swords },
    { label: "Victoires", value: player.wins, icon: Trophy },
    { label: "Défaites", value: player.losses, icon: Ghost },
    { label: "Rang", value: rank ? `#${rank}` : "—", icon: Crown },
  ];

  return (
    <main className="mx-auto max-w-[1160px] px-4 py-6 sm:py-8">
      <section className="relative overflow-hidden rounded-[24px] border border-fuchsia-300/20 bg-[radial-gradient(circle_at_50%_0%,rgba(214,114,255,0.16),transparent_32%),linear-gradient(180deg,rgba(27,14,48,0.8),rgba(6,7,19,0.72))] p-4 shadow-[0_0_40px_rgba(158,82,255,0.12)] sm:rounded-[30px] sm:p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,149,76,0.12),transparent_18%),radial-gradient(circle_at_35%_78%,rgba(196,111,255,0.12),transparent_24%)]" />

        <div className="relative grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[22px] border border-fuchsia-300/20 bg-black/25 p-4 backdrop-blur-md sm:rounded-[26px] sm:p-5">
            <div className="grid items-center gap-5 md:grid-cols-[220px_1fr]">
              <div className="relative mx-auto flex h-[160px] w-[160px] items-center justify-center rounded-[24px] border border-orange-300/20 bg-[radial-gradient(circle,rgba(255,159,82,0.18),rgba(98,30,119,0.12),transparent_70%)] sm:h-[210px] sm:w-[210px] sm:rounded-[28px]">
                <div className="absolute inset-0 rounded-[28px] border border-white/8 shadow-[inset_0_0_44px_rgba(255,255,255,0.04),0_0_34px_rgba(196,104,255,0.18)]" />
                <img src={player.logoUrl} alt={player.pseudo} className="relative z-[1] h-[128px] w-[128px] object-contain drop-shadow-[0_0_30px_rgba(255,150,84,0.28)] sm:h-[170px] sm:w-[170px]" />
              </div>

              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-amber-100">
                  <FlameKindling className="h-4 w-4" />
                  {player.status}
                </div>
                <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl md:text-6xl">{player.pseudo}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/72">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">ID {player.freefireId}</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Mode {player.gameMode}</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{player.credits} crédits</span>
                </div>
                <div className="mt-5 inline-flex items-center gap-2 rounded-[12px] border border-violet-300/24 bg-[linear-gradient(180deg,rgba(137,74,255,0.26),rgba(34,23,74,0.32))] px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-white shadow-[0_0_26px_rgba(142,83,255,0.18)]">
                  <Crown className="h-4 w-4 text-amber-300" />
                  {rank ? `Rang #${rank}` : "En attente de classement"}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
            {statCards.map((card) => {
              const Icon = card.icon;

              return (
                <div key={card.label} className="rounded-[24px] border border-white/10 bg-black/20 p-5 backdrop-blur-md shadow-[inset_0_0_22px_rgba(255,255,255,0.02)]">
                  <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.24em] text-white/48">
                    <Icon className="h-4 w-4 text-amber-300" />
                    {card.label}
                  </div>
                  <div className="mt-4 text-4xl font-black text-white">{card.value}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-[24px] border border-fuchsia-300/18 bg-[linear-gradient(180deg,rgba(28,14,49,0.74),rgba(7,8,18,0.72))] p-3 shadow-[0_0_40px_rgba(158,82,255,0.1)] sm:mt-8 sm:rounded-[30px] sm:p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-sm font-bold uppercase tracking-[0.22em] text-white">Matchs</div>
          <div className="rounded-[18px] border border-white/8 bg-white/5 px-4 py-3 text-sm font-bold uppercase tracking-[0.22em] text-white/55">Défis</div>
        </div>

        <div className="mt-4 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[20px] border border-white/10 bg-black/20 p-3 sm:rounded-[24px] sm:p-4">
            <div className="space-y-3">
              {matches.length ? (
                matches.map((match, index) => {
                  const opponent = match.player1.id === id ? match.player2 : match.player1;
                  const victory = match.winnerId ? match.winnerId === id : null;

                  return (
                    <div key={match.id} className="grid gap-4 rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] px-4 py-4 md:grid-cols-[56px_1.4fr_1fr_0.9fr_150px] md:items-center">
                      <div className="text-3xl font-black text-amber-200 sm:text-4xl">{index + 1}</div>
                      <div className="flex items-center gap-3">
                        <img src={opponent.logoUrl} alt={opponent.pseudo} className="h-14 w-14 rounded-full border border-white/10 bg-black/20 object-contain p-2" />
                        <div>
                          <div className="text-lg font-black text-white sm:text-xl">{player.pseudo} <span className="bg-[linear-gradient(180deg,#ffbe73,#ff76dd)] bg-clip-text text-transparent">VS</span> {opponent.pseudo}</div>
                          <div className="mt-1 text-sm text-white/55">{opponent.freefireId}</div>
                        </div>
                      </div>
                      <div className="text-sm text-white/68">
                        {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(match.date)}
                      </div>
                      <div className="text-lg font-black text-amber-100 sm:text-xl">{victory === null ? "En attente" : victory ? "+1 Crédit" : "-"}</div>
                      <div>
                        <span className="inline-flex rounded-[12px] border border-violet-300/20 bg-violet-300/10 px-4 py-2 text-sm font-bold uppercase tracking-[0.18em] text-white">
                          {victory === null ? match.status : victory ? "Victoire" : "Défaite"}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-[20px] border border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-white/50">Aucun match récent.</div>
              )}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
            <div className="text-sm font-bold uppercase tracking-[0.22em] text-white/72">Défis récents</div>
            <div className="mt-4 space-y-3">
              {challenges.length ? (
                challenges.map((challenge) => {
                  const opponent = challenge.challengerId === id ? challenge.defender : challenge.challenger;

                  return (
                    <div key={challenge.id} className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-4">
                      <div className="flex items-center gap-3">
                        <img src={opponent.logoUrl} alt={opponent.pseudo} className="h-12 w-12 rounded-full border border-white/10 bg-black/20 object-contain p-2" />
                        <div>
                          <div className="font-bold text-white">{opponent.pseudo}</div>
                          <div className="text-xs uppercase tracking-[0.18em] text-white/45">{challenge.status}</div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-6 text-sm text-white/50">Aucun défi récent.</div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

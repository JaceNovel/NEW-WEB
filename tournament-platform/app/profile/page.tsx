import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { CalendarDays, Crown, FlameKindling, Ghost, ShieldCheck, Swords, Trophy } from "lucide-react";

import { authOptions } from "@/lib/auth";
import { getAllianceLabel } from "@/lib/economy";
import { prisma } from "@/lib/prisma";
import { buildPageMetadata } from "@/lib/seo";
import { getTournamentRanking } from "@/lib/tournament";
import AllianceRequestCard from "@/components/profile/AllianceRequestCard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = buildPageMetadata({
  title: "Profil joueur",
  description: "Retrouve ton profil KING League, tes credits, tes performances et tes alliances en cours.",
  path: "/profile",
  noIndex: true,
});

function getMatchStatusLabel(status: "PENDING" | "LIVE" | "FINISHED") {
  switch (status) {
    case "PENDING":
      return "Programmé";
    case "LIVE":
      return "En direct";
    case "FINISHED":
      return "Validé";
    default:
      return status;
  }
}

function getChallengeStatusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "En attente";
    case "ACCEPTED":
      return "Accepté";
    case "REJECTED":
      return "Refusé";
    case "FINISHED":
      return "Terminé";
    default:
      return status;
  }
}

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
      points: true,
      wins: true,
      losses: true,
      status: true,
      gameMode: true,
      alliancePending: true,
      purchasedBy: { select: { pseudo: true } },
      recruitedPlayers: {
        where: { alliancePending: false },
        select: {
          id: true,
          pseudo: true,
          logoUrl: true,
          freefireId: true,
        },
      },
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
    { label: "Points", value: player.points, icon: Crown },
    { label: "Rang", value: rank ? `#${rank}` : "—", icon: Crown },
  ];

  const allianceLabel = getAllianceLabel(player.pseudo, player.recruitedPlayers[0]?.pseudo ?? null);

  return (
    <main className="mx-auto max-w-[1160px] px-4 py-6 sm:py-8">
      <section className="relative overflow-hidden rounded-[24px] border border-fuchsia-300/20 bg-[radial-gradient(circle_at_50%_0%,rgba(214,114,255,0.16),transparent_32%),linear-gradient(180deg,rgba(27,14,48,0.8),rgba(6,7,19,0.72))] p-4 shadow-[0_0_40px_rgba(158,82,255,0.12)] sm:rounded-[30px] sm:p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,149,76,0.12),transparent_18%),radial-gradient(circle_at_35%_78%,rgba(196,111,255,0.12),transparent_24%)]" />

        <div className="relative grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[22px] border border-fuchsia-300/20 bg-black/25 p-4 backdrop-blur-md sm:rounded-[26px] sm:p-5">
            <div className="grid items-center gap-6 lg:grid-cols-[minmax(240px,320px)_1fr]">
              <div className="relative mx-auto flex h-[240px] w-[240px] items-center justify-center rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.08),transparent_65%),rgba(8,8,20,0.22)] p-4 sm:h-[260px] sm:w-[260px] md:h-[280px] md:w-[280px] lg:h-[300px] lg:w-[300px]">
                <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[24px] bg-black/10 p-3">
                  <img
                    src={player.logoUrl}
                    alt={player.pseudo}
                    className="max-h-full max-w-full scale-[1.08] object-contain drop-shadow-[0_0_30px_rgba(255,150,84,0.20)]"
                  />
                </div>
              </div>

              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-amber-100">
                  <FlameKindling className="h-4 w-4" />
                  {player.status}
                </div>
                <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl md:text-6xl">{allianceLabel}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/72">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">ID {player.freefireId}</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Mode {player.gameMode}</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Crédits restants: {player.credits}</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{player.points} points</span>
                </div>
                <div className="mt-5 inline-flex items-center gap-2 rounded-[12px] border border-violet-300/24 bg-[linear-gradient(180deg,rgba(137,74,255,0.26),rgba(34,23,74,0.32))] px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-white shadow-[0_0_26px_rgba(142,83,255,0.18)]">
                  <Crown className="h-4 w-4 text-amber-300" />
                  {rank ? `Rang #${rank}` : "Classement en attente"}
                </div>
                {player.recruitedPlayers[0] ? <div className="mt-3 text-sm font-bold uppercase tracking-[0.18em] text-cyan-200/75">Position renforcée avec {player.recruitedPlayers[0].pseudo}</div> : null}
                {player.purchasedBy && !player.alliancePending ? (
                  <div className="mt-3 text-sm font-bold uppercase tracking-[0.18em] text-fuchsia-200/75">Associé à la position de {player.purchasedBy.pseudo}</div>
                ) : null}

                {player.purchasedBy && player.alliancePending ? <AllianceRequestCard buyerPseudo={player.purchasedBy.pseudo} /> : null}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
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

      <section className="mt-6 rounded-[28px] border border-fuchsia-300/18 bg-[linear-gradient(180deg,rgba(18,10,34,0.92),rgba(10,10,22,0.88))] p-4 shadow-[0_0_44px_rgba(158,82,255,0.12)] backdrop-blur-xl sm:mt-8 sm:rounded-[34px] sm:p-6">
        <div className="flex flex-col gap-3 border-b border-white/8 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[0.72rem] font-black uppercase tracking-[0.26em] text-fuchsia-200/72">Journal de combat</div>
            <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">Matchs et défis récents</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/58">Un résumé net de ton activité récente, sans blocs brouillons ni cartes mal hiérarchisées.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white/65">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
            {matches.length} matchs • {challenges.length} défis
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.35fr_0.8fr]">
          <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-black uppercase tracking-[0.22em] text-white">Matchs</div>
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Vue premium</div>
            </div>

            <div className="mt-4 space-y-3">
              {matches.length ? (
                matches.map((match, index) => {
                  const opponent = match.player1.id === id ? match.player2 : match.player1;
                  const victory = match.winnerId ? match.winnerId === id : null;
                  const statusLabel = getMatchStatusLabel(match.status);

                  return (
                    <article
                      key={match.id}
                      className="tp-profile-activity-item"
                    >
                      <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,16,37,0.96),rgba(31,18,56,0.78))] p-4 shadow-[inset_0_0_26px_rgba(255,255,255,0.02)] lg:hidden">
                        <div className="grid gap-4 sm:grid-cols-[68px_minmax(0,1fr)]">
                          <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-amber-300/18 bg-amber-300/10 text-3xl font-black text-amber-100">
                            {index + 1}
                          </div>

                          <div className="grid gap-4">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] border border-white/10 bg-black/25 p-2">
                                <img src={opponent.logoUrl} alt={opponent.pseudo} className="h-full w-full object-contain" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-white/42">Adversaire</div>
                                <div className="mt-1 truncate text-xl font-black text-white">{opponent.pseudo}</div>
                                <div className="mt-1 text-sm text-white/52">ID {opponent.freefireId}</div>
                                <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-white/70">
                                  <span>{player.pseudo}</span>
                                  <span className="bg-[linear-gradient(180deg,#ffbe73,#ff76dd)] bg-clip-text text-transparent">VS</span>
                                  <span>{opponent.pseudo}</span>
                                </div>
                              </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3">
                                <div className="inline-flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.18em] text-white/42">
                                  <CalendarDays className="h-3.5 w-3.5 text-cyan-300" />
                                  Date du duel
                                </div>
                                <div className="mt-2 text-sm font-semibold leading-6 text-white/80">
                                  {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(match.date)}
                                </div>
                              </div>

                              <div className="rounded-[18px] border border-white/8 bg-black/15 px-4 py-3">
                                <div className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-white/42">Résultat</div>
                                <div className="mt-2 text-lg font-black text-white">{victory === null ? "En attente" : victory ? "Victoire" : "Défaite"}</div>
                                <div className="mt-1 text-sm text-amber-100/80">{victory === null ? "Aucun gain validé" : victory ? "+1 crédit confirmé" : "Défaite enregistrée"}</div>
                              </div>
                            </div>

                            <span className="inline-flex w-full items-center justify-center rounded-[14px] border border-violet-300/20 bg-violet-300/10 px-4 py-3 text-center text-sm font-bold uppercase tracking-[0.18em] text-white">
                              {victory === null ? statusLabel : victory ? "Victoire" : "Défaite"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="hidden rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_50%_42%,rgba(223,104,255,0.18),transparent_28%),linear-gradient(180deg,rgba(36,20,67,0.96),rgba(20,13,43,0.92))] p-5 shadow-[inset_0_0_26px_rgba(255,255,255,0.02),0_0_28px_rgba(164,90,255,0.08)] lg:flex lg:items-center lg:justify-between lg:gap-6">
                        <div className="flex min-w-0 flex-1 items-center gap-4">
                          <div className="flex h-[70px] w-[70px] shrink-0 items-center justify-center rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-2 shadow-[0_0_18px_rgba(0,0,0,0.22)]">
                            <img src={player.logoUrl} alt={player.pseudo} className="h-full w-full object-contain" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-[1.1rem] font-black text-white">{player.pseudo}</div>
                            <div className="mt-1 text-sm text-white/50">🎮 {player.freefireId}</div>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col items-center justify-center gap-3 px-2 text-center">
                          <div className="bg-[linear-gradient(180deg,#ffbe73,#ff76dd)] bg-clip-text text-[3.1rem] font-black leading-none text-transparent">VS</div>
                          <span className="inline-flex min-h-[44px] min-w-[170px] items-center justify-center rounded-full border border-amber-300/28 bg-[linear-gradient(180deg,rgba(255,177,105,0.16),rgba(104,44,28,0.22))] px-5 py-2 text-center text-sm font-black uppercase tracking-[0.18em] text-white shadow-[0_0_22px_rgba(255,168,91,0.08)]">
                            {victory === null ? statusLabel : victory ? "Victoire" : "Défaite"}
                          </span>
                          <div className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                            {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(match.date)}
                          </div>
                        </div>

                        <div className="flex min-w-0 flex-1 items-center justify-end gap-4 text-right">
                          <div className="min-w-0">
                            <div className="truncate text-[1.1rem] font-black text-white">{opponent.pseudo}</div>
                            <div className="mt-1 text-sm text-white/50">🎮 {opponent.freefireId}</div>
                          </div>
                          <div className="flex h-[70px] w-[70px] shrink-0 items-center justify-center rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-2 shadow-[0_0_18px_rgba(0,0,0,0.22)]">
                            <img src={opponent.logoUrl} alt={opponent.pseudo} className="h-full w-full object-contain" />
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-10 text-center text-sm text-white/50">Aucun match récent.</div>
              )}
            </div>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-black uppercase tracking-[0.22em] text-white">Défis</div>
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Lecture rapide</div>
            </div>

            <div className="mt-4 space-y-3">
              {challenges.length ? (
                challenges.map((challenge) => {
                  const opponent = challenge.challengerId === id ? challenge.defender : challenge.challenger;

                  return (
                    <article key={challenge.id} className="tp-profile-activity-item rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,16,37,0.96),rgba(31,18,56,0.78))] p-4 shadow-[inset_0_0_18px_rgba(255,255,255,0.02)]">
                      <div className="flex items-center gap-3 lg:hidden">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-white/10 bg-black/25 p-1.5">
                          <img src={opponent.logoUrl} alt={opponent.pseudo} className="h-full w-full object-contain" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-white/42">Défi joueur</div>
                          <div className="mt-1 truncate text-lg font-black text-white">{opponent.pseudo}</div>
                          <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-cyan-300/14 bg-cyan-300/8 px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-cyan-100/85">
                            <Swords className="h-3.5 w-3.5" />
                            {getChallengeStatusLabel(challenge.status)}
                          </div>
                        </div>
                      </div>

                      <div className="hidden items-center gap-4 lg:flex">
                        <div className="flex h-[62px] w-[62px] shrink-0 items-center justify-center rounded-[20px] border border-white/10 bg-black/25 p-2.5 shadow-[0_0_24px_rgba(0,0,0,0.22)]">
                          <img src={opponent.logoUrl} alt={opponent.pseudo} className="h-full w-full object-contain" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-white/42">Défi joueur</div>
                          <div className="mt-2 truncate text-[1.2rem] font-black text-white">{opponent.pseudo}</div>
                          <div className="mt-1 text-sm text-white/50">Interaction récente dans l'arène KING League</div>
                        </div>
                        <div className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-cyan-300/14 bg-cyan-300/8 px-4 py-2 text-[0.72rem] font-black uppercase tracking-[0.16em] text-cyan-100/85">
                          <Swords className="h-3.5 w-3.5" />
                          {getChallengeStatusLabel(challenge.status)}
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-10 text-center text-sm text-white/50">Aucun défi récent.</div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

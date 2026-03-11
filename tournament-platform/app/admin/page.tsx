import Link from "next/link";
import { ChallengeStatus, MatchStatus, TournamentStage } from "@prisma/client";
import { Activity, ArrowRight, Coins, Crown, Flame, Search, Shield, Sparkles, Swords, Users } from "lucide-react";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const cardAccentMap = {
  amber: "from-amber-400/30 via-orange-400/10 to-transparent",
  violet: "from-fuchsia-400/30 via-violet-400/10 to-transparent",
  blue: "from-sky-400/30 via-blue-400/10 to-transparent",
  rose: "from-rose-400/30 via-fuchsia-400/10 to-transparent",
} as const;

function getStageLabel(stage: TournamentStage) {
  switch (stage) {
    case "REGISTRATION":
      return "Inscriptions ouvertes";
    case "LOCKED":
      return "Top 20 verrouillé";
    case "ACTIVE":
      return "Tournoi actif";
    case "FINALIZED":
      return "Classement validé";
    default:
      return stage;
  }
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

function buildMonthlySeries(matches: Array<{ date: Date }>) {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("fr-FR", { month: "short" });
  const buckets = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: formatter.format(date).replace(".", "").replace(/^./, (char) => char.toUpperCase()),
      value: 0,
    };
  });

  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  for (const match of matches) {
    const key = `${match.date.getFullYear()}-${match.date.getMonth()}`;
    const bucket = bucketMap.get(key);
    if (bucket) bucket.value += 1;
  }

  return buckets;
}

function buildChartPath(values: number[]) {
  const width = 520;
  const height = 220;
  const paddingX = 24;
  const paddingY = 20;
  const maxValue = Math.max(...values, 1);
  const stepX = values.length > 1 ? (width - paddingX * 2) / (values.length - 1) : 0;

  return values
    .map((value, index) => {
      const x = paddingX + stepX * index;
      const y = height - paddingY - (value / maxValue) * (height - paddingY * 2);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

function buildChartArea(values: number[]) {
  const width = 520;
  const height = 220;
  const paddingX = 24;
  const paddingY = 20;
  const maxValue = Math.max(...values, 1);
  const stepX = values.length > 1 ? (width - paddingX * 2) / (values.length - 1) : 0;

  const top = values
    .map((value, index) => {
      const x = paddingX + stepX * index;
      const y = height - paddingY - (value / maxValue) * (height - paddingY * 2);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return `M${paddingX},${height - paddingY} ${top} L${width - paddingX},${height - paddingY} Z`;
}

export default async function AdminDashboardPage() {
  if (!process.env.DATABASE_URL) {
    return (
      <main>
        <div className="tp-glass rounded-3xl p-6">
          <div className="text-lg font-bold text-white">Configuration requise</div>
          <p className="mt-2 text-sm text-white/70">
            DATABASE_URL manquant. Configure la base PostgreSQL pour utiliser l&apos;admin.
          </p>
        </div>
      </main>
    );
  }

  const sixMonthsAgo = new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1);

  const [playersCount, matchesCount, liveMatchesCount, finishedMatchesCount, totalCredits, pendingChallengesCount, roi, config, playersByMode, recentMatches, monthlyFinishedMatches] = await Promise.all([
    prisma.player.count(),
    prisma.match.count(),
    prisma.match.count({ where: { status: MatchStatus.LIVE } }),
    prisma.match.count({ where: { status: MatchStatus.FINISHED } }),
    prisma.player.aggregate({ _sum: { credits: true } }),
    prisma.challenge.count({ where: { status: ChallengeStatus.PENDING } }),
    prisma.player.findFirst({ where: { status: "ROI" }, select: { pseudo: true, credits: true, logoUrl: true } }),
    prisma.tournamentConfig.findUnique({ where: { id: "main" }, select: { stage: true } }),
    prisma.player.groupBy({ by: ["gameMode"], _count: { gameMode: true } }),
    prisma.match.findMany({
      take: 5,
      orderBy: [{ updatedAt: "desc" }],
      include: {
        player1: { select: { pseudo: true, freefireId: true, logoUrl: true } },
        player2: { select: { pseudo: true, freefireId: true, logoUrl: true } },
        winner: { select: { pseudo: true } },
      },
    }),
    prisma.match.findMany({
      where: { status: MatchStatus.FINISHED, winnerId: { not: null }, date: { gte: sixMonthsAgo } },
      select: { date: true },
    }),
  ]);

  const spamCount = playersByMode.find((entry) => entry.gameMode === "SPAM")?._count.gameMode ?? 0;
  const oneTapCount = playersByMode.find((entry) => entry.gameMode === "ONETAP")?._count.gameMode ?? 0;
  const monthlySeries = buildMonthlySeries(monthlyFinishedMatches);
  const monthlyValues = monthlySeries.map((entry) => entry.value);
  const linePath = buildChartPath(monthlyValues);
  const areaPath = buildChartArea(monthlyValues);
  const stageLabel = getStageLabel(config?.stage ?? TournamentStage.REGISTRATION);

  const statCards = [
    {
      title: "Crédits en circulation",
      value: formatCompact(totalCredits._sum.credits ?? 0),
      suffix: "crédits",
      meta: roi ? `ROI actif: ${roi.pseudo}` : "ROI non défini",
      icon: Coins,
      accent: "amber" as const,
    },
    {
      title: "Total joueurs",
      value: formatCompact(playersCount),
      suffix: "joueurs",
      meta: `${formatCompact(spamCount)} SPAM • ${formatCompact(oneTapCount)} ONETAP`,
      icon: Users,
      accent: "violet" as const,
    },
    {
      title: "Total matchs",
      value: formatCompact(matchesCount),
      suffix: "matchs",
      meta: `${formatCompact(liveMatchesCount)} live • ${formatCompact(finishedMatchesCount)} terminés`,
      icon: Swords,
      accent: "blue" as const,
    },
    {
      title: "Défis en attente",
      value: formatCompact(pendingChallengesCount),
      suffix: "ouverts",
      meta: stageLabel,
      icon: Activity,
      accent: "rose" as const,
    },
  ];

  return (
    <main className="space-y-5">
      <section className="relative overflow-hidden rounded-[30px] border border-fuchsia-300/15 bg-[linear-gradient(180deg,rgba(29,10,49,0.88),rgba(8,8,20,0.84))] px-5 py-6 shadow-[0_0_38px_rgba(171,82,255,0.10)] sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,162,79,0.16),transparent_22%),radial-gradient(circle_at_70%_20%,rgba(171,82,255,0.22),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.05),transparent_18%)]" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/15 bg-amber-300/5 px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.24em] text-amber-200/80">
              <Sparkles className="h-3.5 w-3.5" />
              Centre de contrôle
            </div>
            <h1 className="mt-4 text-3xl font-black uppercase tracking-tight text-transparent sm:text-4xl lg:text-5xl [background:linear-gradient(180deg,#ffe7cc_0%,#ffb46c_46%,#ffd7ff_100%)] [-webkit-background-clip:text] [background-clip:text]">
              Tableau de bord administratif
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60 sm:text-base">
              Vue d’ensemble du tournoi, de l’activité des joueurs et de la cadence des matchs. Tout est connecté aux vraies données Prisma du site.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[360px]">
            <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-white/35">ROI en place</div>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-200 shadow-[0_0_18px_rgba(255,184,82,0.12)]">
                  <Crown className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-base font-black text-white">{roi?.pseudo ?? "Aucun ROI"}</div>
                  <div className="text-xs text-white/45">{roi ? `${roi.credits} crédits` : "En attente de sélection"}</div>
                </div>
              </div>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-white/35">Phase tournoi</div>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/10 text-fuchsia-200 shadow-[0_0_18px_rgba(193,110,255,0.12)]">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-base font-black text-white">{stageLabel}</div>
                  <div className="text-xs text-white/45">Accès admin sécurisé</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.title}
              className="group relative overflow-hidden rounded-[28px] border border-fuchsia-300/12 bg-[linear-gradient(180deg,rgba(27,11,47,0.82),rgba(8,8,20,0.82))] p-5 shadow-[0_0_28px_rgba(171,82,255,0.08)] transition-transform duration-200 hover:-translate-y-1"
            >
              <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${cardAccentMap[card.accent]} opacity-80`} />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-60" />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <div className="text-[0.7rem] font-black uppercase tracking-[0.22em] text-white/45">{card.title}</div>
                  <div className="mt-3 flex items-end gap-2">
                    <div className="text-4xl font-black leading-none text-white">{card.value}</div>
                    <div className="pb-1 text-xs font-bold uppercase tracking-[0.14em] text-white/45">{card.suffix}</div>
                  </div>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-[22px] border border-white/10 bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.06)]">
                  <Icon className="h-6 w-6" />
                </div>
              </div>
              <div className="relative mt-4 text-sm text-white/60">{card.meta}</div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Link href="/admin/credits" className="rounded-[26px] border border-cyan-300/16 bg-[linear-gradient(180deg,rgba(20,12,40,0.84),rgba(8,8,22,0.82))] p-5 shadow-[0_0_28px_rgba(72,174,255,0.10)] transition-transform duration-200 hover:-translate-y-1">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/18 bg-cyan-300/10 text-cyan-200">
            <Coins className="h-5 w-5" />
          </div>
          <div className="mt-4 text-xl font-black text-white">Hub crédits</div>
          <div className="mt-2 text-sm text-white/58">Voir les associations actives et piloter les produits crédit / prix de la boutique.</div>
          <div className="mt-4 inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-cyan-200">
            Ouvrir
            <ArrowRight className="h-4 w-4" />
          </div>
        </Link>
      </section>

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1.35fr)_420px]">
        <article className="overflow-hidden rounded-[30px] border border-fuchsia-300/12 bg-[linear-gradient(180deg,rgba(27,11,47,0.82),rgba(8,8,20,0.82))] shadow-[0_0_30px_rgba(171,82,255,0.08)]">
          <div className="flex items-center justify-between gap-3 border-b border-white/8 px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-xl font-black text-white">Aperçu de l’activité</h2>
              <p className="mt-1 text-sm text-white/45">Nombre de matchs finalisés par mois sur les 6 derniers mois.</p>
            </div>
            <Link href="/admin/matchs" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-bold text-white/75 transition hover:border-fuchsia-300/20 hover:text-white">
              Voir les matchs
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-5 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="rounded-[26px] border border-white/8 bg-black/15 p-4">
              <svg viewBox="0 0 520 220" className="h-[250px] w-full overflow-visible">
                <defs>
                  <linearGradient id="adminChartStroke" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(255,173,88,1)" />
                    <stop offset="50%" stopColor="rgba(223,117,255,1)" />
                    <stop offset="100%" stopColor="rgba(120,184,255,1)" />
                  </linearGradient>
                  <linearGradient id="adminChartArea" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(218,120,255,0.34)" />
                    <stop offset="100%" stopColor="rgba(218,120,255,0)" />
                  </linearGradient>
                </defs>

                {[0, 1, 2, 3].map((line) => {
                  const y = 24 + line * 48;
                  return <line key={line} x1="24" y1={y} x2="496" y2={y} stroke="rgba(255,255,255,0.09)" strokeDasharray="4 8" />;
                })}

                <path d={areaPath} fill="url(#adminChartArea)" />
                <path d={linePath} fill="none" stroke="url(#adminChartStroke)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

                {monthlySeries.map((entry, index) => {
                  const stepX = monthlySeries.length > 1 ? (520 - 48) / (monthlySeries.length - 1) : 0;
                  const x = 24 + stepX * index;
                  const maxValue = Math.max(...monthlyValues, 1);
                  const y = 220 - 20 - (entry.value / maxValue) * (220 - 40);

                  return (
                    <g key={entry.label}>
                      <circle cx={x} cy={y} r="7" fill="rgba(10,8,20,1)" stroke="rgba(255,190,113,0.95)" strokeWidth="3" />
                      <circle cx={x} cy={y} r="16" fill="rgba(255,169,87,0.08)" />
                      <text x={x} y="212" textAnchor="middle" className="fill-white/55 text-[11px] font-bold uppercase tracking-[0.16em]">
                        {entry.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="space-y-4">
              <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
                <div className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-white/35">KPI rapide</div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-200">
                    <Flame className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-white">{formatCompact(monthlyValues.reduce((sum, value) => sum + value, 0))}</div>
                    <div className="text-xs text-white/45">matchs finalisés sur la fenêtre</div>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4">
                <div className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-white/35">Rythme actuel</div>
                <div className="mt-3 text-lg font-black text-white">{monthlySeries[monthlySeries.length - 1]?.value ?? 0} ce mois-ci</div>
                <div className="mt-1 text-sm text-white/45">Compare facilement la cadence récente avec le reste du tournoi.</div>
              </div>

              <Link href="/admin/joueurs" className="flex items-center justify-between rounded-[24px] border border-fuchsia-300/14 bg-[linear-gradient(180deg,rgba(168,84,255,0.14),rgba(255,145,79,0.08))] p-4 text-white transition hover:border-fuchsia-300/24">
                <div>
                  <div className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-white/45">Action</div>
                  <div className="mt-1 text-base font-black">Gérer les joueurs</div>
                </div>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </article>

        <article className="overflow-hidden rounded-[30px] border border-fuchsia-300/12 bg-[linear-gradient(180deg,rgba(27,11,47,0.82),rgba(8,8,20,0.82))] shadow-[0_0_30px_rgba(171,82,255,0.08)]">
          <div className="flex flex-col gap-3 border-b border-white/8 px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-white">Matchs récents</h2>
                <p className="mt-1 text-sm text-white/45">Dernières mises à jour et résultats déclarés.</p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                {recentMatches.length} entrées
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-[18px] border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white/55 shadow-[inset_0_0_16px_rgba(255,255,255,0.02)]">
              <Search className="h-4 w-4 text-fuchsia-200/70" />
              <span>Rechercher dans les matchs récents...</span>
            </div>
          </div>

          <div className="space-y-3 px-5 py-5 sm:px-6">
            {recentMatches.length ? (
              recentMatches.map((match) => {
                const winnerName = match.winner?.pseudo ?? "En attente";
                const statusLabel = match.status === MatchStatus.LIVE ? "Live" : match.status === MatchStatus.FINISHED ? "Terminé" : "Planifié";

                return (
                  <div key={match.id} className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4 transition hover:border-fuchsia-300/16 hover:bg-white/[0.06]">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.2em] text-white/35">
                        <span>{new Date(match.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</span>
                        <span>•</span>
                        <span>{statusLabel}</span>
                      </div>

                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <img src={match.player1.logoUrl} alt={match.player1.pseudo} className="h-12 w-12 rounded-2xl border border-white/10 bg-black/20 object-cover p-1" />
                          <div className="min-w-0">
                            <div className="truncate text-base font-black text-white">{match.player1.pseudo}</div>
                            <div className="truncate text-xs text-white/40">{match.player1.freefireId}</div>
                          </div>
                        </div>

                        <div className="text-lg font-black text-transparent [background:linear-gradient(180deg,#ffd4ae_0%,#ff8fd8_100%)] [-webkit-background-clip:text] [background-clip:text]">
                          VS
                        </div>

                        <div className="flex min-w-0 items-center gap-2">
                          <img src={match.player2.logoUrl} alt={match.player2.pseudo} className="h-12 w-12 rounded-2xl border border-white/10 bg-black/20 object-cover p-1" />
                          <div className="min-w-0">
                            <div className="truncate text-base font-black text-white">{match.player2.pseudo}</div>
                            <div className="truncate text-xs text-white/40">{match.player2.freefireId}</div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full border border-amber-300/16 bg-amber-300/10 px-2.5 py-1 font-bold uppercase tracking-[0.14em] text-amber-200/85">
                          Winner: {winnerName}
                        </span>
                        {match.status === MatchStatus.FINISHED ? (
                          <span className="rounded-full border border-emerald-300/16 bg-emerald-300/10 px-2.5 py-1 font-bold uppercase tracking-[0.14em] text-emerald-200/85">
                            +1 crédit attribué
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[24px] border border-white/8 bg-white/[0.04] px-4 py-8 text-center text-sm text-white/45">
                Aucun match récent à afficher.
              </div>
            )}

            <Link href="/admin/matchs" className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-white/70 transition hover:text-white">
              Ouvrir la gestion des matchs
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}

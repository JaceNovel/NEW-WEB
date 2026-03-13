import Link from "next/link";
import { ChallengeStatus, MatchStatus, TournamentStage } from "@prisma/client";
import { Activity, ArrowRight, Coins, Crown, Flame, Shield, Sparkles, Swords, Users } from "lucide-react";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const cardToneMap = {
  amber: "bg-amber-100 text-amber-700",
  violet: "bg-violet-100 text-violet-700",
  blue: "bg-sky-100 text-sky-700",
  rose: "bg-rose-100 text-rose-700",
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
      meta: `${formatCompact(liveMatchesCount)} en direct • ${formatCompact(finishedMatchesCount)} terminés`,
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
    <main className="space-y-6">
      <section className="rounded-[32px] border border-slate-200 bg-[linear-gradient(135deg,#fff8f3_0%,#ffffff_60%,#f6fbff_100%)] px-5 py-6 sm:px-7 sm:py-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.24em] text-rose-500">
              <Sparkles className="h-3.5 w-3.5" />
              Centre de contrôle
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-rose-500 sm:text-4xl lg:text-5xl">
              Tableau de bord administratif
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500 sm:text-base">
              Vue d’ensemble du tournoi, de l’activité des joueurs et de la cadence des matchs. Tout est connecté aux vraies données Prisma du site.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:w-[360px]">
            <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-slate-400">ROI en place</div>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <Crown className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-base font-black text-slate-950">{roi?.pseudo ?? "Aucun ROI"}</div>
                  <div className="text-xs text-slate-500">{roi ? `${roi.credits} crédits` : "En attente de sélection"}</div>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-slate-400">Phase tournoi</div>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-base font-black text-slate-950">{stageLabel}</div>
                  <div className="text-xs text-slate-500">Accès admin sécurisé</div>
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
              className="group rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition-transform duration-200 hover:-translate-y-1"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[0.7rem] font-black uppercase tracking-[0.22em] text-slate-400">{card.title}</div>
                  <div className="mt-3 flex items-end gap-2">
                    <div className="text-4xl font-black leading-none text-slate-950">{card.value}</div>
                    <div className="pb-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{card.suffix}</div>
                  </div>
                </div>
                <div className={`flex h-14 w-14 items-center justify-center rounded-[22px] ${cardToneMap[card.accent]}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4 text-sm text-slate-500">{card.meta}</div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Link href="/admin/credits" className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm transition-transform duration-200 hover:-translate-y-1">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
            <Coins className="h-5 w-5" />
          </div>
          <div className="mt-4 text-xl font-black text-slate-950">Hub crédits</div>
          <div className="mt-2 text-sm text-slate-500">Voir les associations actives et piloter les produits crédit du tournoi.</div>
          <div className="mt-4 inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-sky-700">
            Ouvrir
            <ArrowRight className="h-4 w-4" />
          </div>
        </Link>
      </section>

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1.35fr)_420px]">
        <article className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-xl font-black text-slate-950">Aperçu de l’activité</h2>
              <p className="mt-1 text-sm text-slate-500">Nombre de matchs finalisés par mois sur les 6 derniers mois.</p>
            </div>
            <Link href="/admin/matchs" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-white">
              Voir les matchs
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-5 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-4">
              <svg viewBox="0 0 520 220" className="h-[250px] w-full overflow-visible">
                <defs>
                  <linearGradient id="adminChartStroke" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(59,130,246,1)" />
                    <stop offset="100%" stopColor="rgba(14,165,233,1)" />
                  </linearGradient>
                  <linearGradient id="adminChartArea" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(59,130,246,0.24)" />
                    <stop offset="100%" stopColor="rgba(59,130,246,0)" />
                  </linearGradient>
                </defs>

                {[0, 1, 2, 3].map((line) => {
                  const y = 24 + line * 48;
                  return <line key={line} x1="24" y1={y} x2="496" y2={y} stroke="rgba(148,163,184,0.28)" strokeDasharray="4 8" />;
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
                      <circle cx={x} cy={y} r="7" fill="rgba(255,255,255,1)" stroke="rgba(59,130,246,0.95)" strokeWidth="3" />
                      <circle cx={x} cy={y} r="16" fill="rgba(59,130,246,0.08)" />
                      <text x={x} y="212" textAnchor="middle" className="fill-slate-500 text-[11px] font-bold uppercase tracking-[0.16em]">
                        {entry.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="space-y-4">
              <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                <div className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-slate-400">KPI rapide</div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                    <Flame className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-slate-950">{formatCompact(monthlyValues.reduce((sum, value) => sum + value, 0))}</div>
                    <div className="text-xs text-slate-500">matchs finalisés sur la fenêtre</div>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                <div className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-slate-400">Rythme actuel</div>
                <div className="mt-3 text-lg font-black text-slate-950">{monthlySeries[monthlySeries.length - 1]?.value ?? 0} ce mois-ci</div>
                <div className="mt-1 text-sm text-slate-500">Compare facilement la cadence récente avec le reste du tournoi.</div>
              </div>

              <Link href="/admin/joueurs" className="flex items-center justify-between rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-slate-900 transition hover:bg-white">
                <div>
                  <div className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-slate-400">Action</div>
                  <div className="mt-1 text-base font-black">Gérer les joueurs</div>
                </div>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </article>

        <article className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-950">Matchs récents</h2>
                <p className="mt-1 text-sm text-slate-500">Dernières mises à jour et résultats déclarés.</p>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                {recentMatches.length} entrées
              </div>
            </div>
          </div>

          <div className="space-y-3 px-5 py-5 sm:px-6">
            {recentMatches.length ? (
              recentMatches.map((match) => {
                const winnerName = match.winner?.pseudo ?? "En attente";
                const statusLabel = match.status === MatchStatus.LIVE ? "En direct" : match.status === MatchStatus.FINISHED ? "Terminé" : "Planifié";

                return (
                  <div key={match.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 transition hover:bg-white">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.2em] text-slate-400">
                        <span>{new Date(match.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</span>
                        <span>•</span>
                        <span>{statusLabel}</span>
                      </div>

                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <img src={match.player1.logoUrl} alt={match.player1.pseudo} className="h-12 w-12 rounded-2xl border border-slate-200 bg-white object-cover p-1" />
                          <div className="min-w-0">
                            <div className="truncate text-base font-black text-slate-950">{match.player1.pseudo}</div>
                            <div className="truncate text-xs text-slate-400">{match.player1.freefireId}</div>
                          </div>
                        </div>

                        <div className="text-lg font-black text-sky-600">
                          VS
                        </div>

                        <div className="flex min-w-0 items-center gap-2">
                          <img src={match.player2.logoUrl} alt={match.player2.pseudo} className="h-12 w-12 rounded-2xl border border-slate-200 bg-white object-cover p-1" />
                          <div className="min-w-0">
                            <div className="truncate text-base font-black text-slate-950">{match.player2.pseudo}</div>
                            <div className="truncate text-xs text-slate-400">{match.player2.freefireId}</div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 font-bold uppercase tracking-[0.14em] text-sky-700">
                          Winner: {winnerName}
                        </span>
                        {match.status === MatchStatus.FINISHED ? (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-bold uppercase tracking-[0.14em] text-emerald-700">
                            +1 crédit attribué
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Aucun match récent à afficher.
              </div>
            )}

            <Link href="/admin/matchs" className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-slate-950">
              Ouvrir la gestion des matchs
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}

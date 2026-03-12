"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, CircleDot, Crown, Eye, X } from "lucide-react";

import { getCountryOption } from "@/lib/countries";
import type { MatchPublic } from "@/types/match";

type HistoryTab = "PENDING" | "LIVE" | "FINISHED";

const tabMeta: Array<{ key: HistoryTab; label: string }> = [
  { key: "PENDING", label: "A venir" },
  { key: "LIVE", label: "En cours" },
  { key: "FINISHED", label: "Termines" },
];

const ITEMS_PER_PAGE = 4;

function formatHistoryDate(dateValue: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(dateValue));
}

function formatHistoryTime(dateValue: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateValue));
}

function formatCountdown(ms: number) {
  if (ms <= 0) return "Disponible";
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}j ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
  }

  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
}

function CountryFlag({ countryCode, className = "" }: { countryCode?: string; className?: string }) {
  const country = getCountryOption(countryCode);
  if (!country) return null;

  return <img src={country.flagUrl} alt={country.label} className={className} />;
}

function getWinner(match: MatchPublic) {
  if (!match.winnerId) return null;
  if (match.winnerId === match.player1.id) return match.player1;
  if (match.winnerId === match.player2.id) return match.player2;
  return null;
}

function MatchDetail({ match, now }: { match: MatchPublic; now: number }) {
  const winner = getWinner(match);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">Resume du match</div>
          <div className="mt-2 text-2xl font-black text-white">
            {match.status === "FINISHED" ? "Resultat valide" : match.status === "LIVE" ? "Affrontement en cours" : "Match programme"}
          </div>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${match.status === "FINISHED" ? "border-emerald-300/24 bg-emerald-300/10 text-emerald-100" : match.status === "LIVE" ? "border-rose-300/24 bg-rose-300/10 text-rose-100" : "border-cyan-300/24 bg-cyan-300/10 text-cyan-100"}`}>
          {match.status === "FINISHED" ? "Termine" : match.status === "LIVE" ? "Live" : "A venir"}
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <div className={`rounded-[22px] border p-4 ${winner?.id === match.player1.id ? "border-amber-300/24 bg-amber-300/10" : "border-white/10 bg-black/20"}`}>
          <div className="flex items-center gap-3">
            <Image src={match.player1.logoUrl} alt={match.player1.pseudo} width={84} height={84} className="h-20 w-20 rounded-[18px] border border-white/10 bg-black/20 object-contain p-2" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/42">
                <CountryFlag countryCode={match.player1.countryCode} className="h-4 w-4 rounded-full" />
                Joueur 1
              </div>
              <div className="mt-2 truncate text-xl font-black text-white">{match.player1.pseudo}</div>
              <div className="text-sm text-white/55">ID {match.player1.freefireId}</div>
            </div>
          </div>
        </div>

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 text-lg font-black uppercase tracking-[0.16em] text-white">VS</div>

        <div className={`rounded-[22px] border p-4 ${winner?.id === match.player2.id ? "border-amber-300/24 bg-amber-300/10" : "border-white/10 bg-black/20"}`}>
          <div className="flex items-center gap-3">
            <Image src={match.player2.logoUrl} alt={match.player2.pseudo} width={84} height={84} className="h-20 w-20 rounded-[18px] border border-white/10 bg-black/20 object-contain p-2" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/42">
                <CountryFlag countryCode={match.player2.countryCode} className="h-4 w-4 rounded-full" />
                Joueur 2
              </div>
              <div className="mt-2 truncate text-xl font-black text-white">{match.player2.pseudo}</div>
              <div className="text-sm text-white/55">ID {match.player2.freefireId}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/42">Verdict</div>
          <div className="mt-2 text-sm text-white/68">
            {match.status === "FINISHED"
              ? `${winner?.pseudo ?? "Aucun joueur"} a remporte le duel.`
              : match.status === "LIVE"
                ? "Le match est actuellement en cours."
                : `Debut dans ${formatCountdown(new Date(match.date).getTime() - now)}.`}
          </div>
        </div>
        <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/42">Calendrier</div>
          <div className="mt-2 inline-flex items-center gap-2 text-sm text-white/68">
            <CalendarDays className="h-4 w-4 text-cyan-300" />
            {formatHistoryDate(match.date)} • {formatHistoryTime(match.date)}
          </div>
        </div>
      </div>

      <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/62">
        <CircleDot className="h-4 w-4 text-amber-300" />
        Archive officielle 1v1 King League
      </div>
    </>
  );
}

export default function HistoryArena({ matches }: { matches: MatchPublic[] }) {
  const [activeTab, setActiveTab] = useState<HistoryTab>("FINISHED");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const sortedMatches = useMemo(() => {
    const byTab = matches.filter((match) => match.status === activeTab);
    return [...byTab].sort((left, right) => {
      const leftTime = new Date(left.date).getTime();
      const rightTime = new Date(right.date).getTime();
      return activeTab === "FINISHED" ? rightTime - leftTime : leftTime - rightTime;
    });
  }, [activeTab, matches]);

  const totalPages = Math.max(1, Math.ceil(sortedMatches.length / ITEMS_PER_PAGE));

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedMatches = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedMatches.slice(start, start + ITEMS_PER_PAGE);
  }, [currentPage, sortedMatches]);

  const selectedMatch = useMemo(
    () => matches.find((match) => match.id === selectedMatchId) ?? paginatedMatches[0] ?? null,
    [matches, paginatedMatches, selectedMatchId],
  );

  useEffect(() => {
    if (!paginatedMatches.length) {
      setSelectedMatchId(null);
      return;
    }

    if (!selectedMatchId || !paginatedMatches.some((match) => match.id === selectedMatchId)) {
      setSelectedMatchId(paginatedMatches[0].id);
    }
  }, [paginatedMatches, selectedMatchId]);

  function openDetails(matchId: string) {
    setSelectedMatchId(matchId);
    setDetailOpen(true);
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 pb-12 pt-6 sm:px-5 lg:px-6">
      <section className="relative overflow-hidden rounded-[28px] border border-fuchsia-300/14 bg-[linear-gradient(160deg,rgba(36,18,67,0.92),rgba(10,11,24,0.88)_55%,rgba(7,27,60,0.82))] p-4 shadow-[0_0_40px_rgba(140,66,255,0.12)] sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,164,95,0.12),transparent_25%),radial-gradient(circle_at_top_right,rgba(92,225,255,0.1),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_24%)]" />

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-white sm:text-4xl lg:text-5xl">Historique</h1>
            <p className="mt-3 max-w-2xl text-sm text-white/62 sm:text-base">Sur mobile, les details s'ouvrent dans une fenetre dediee. Sur desktop, le panneau de resume reste visible par defaut.</p>
          </div>

          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrer les matchs par statut">
            {tabMeta.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  className={`rounded-[16px] border px-4 py-3 text-sm font-black uppercase tracking-[0.18em] transition ${active ? "border-cyan-300/28 bg-cyan-300/10 text-white shadow-[0_0_20px_rgba(92,225,255,0.14)]" : "border-white/10 bg-black/20 text-white/62 hover:bg-white/5"}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </motion.div>

        <div className="relative mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-3">
            {paginatedMatches.length ? (
              paginatedMatches.map((match, index) => {
                const winner = getWinner(match);
                const active = selectedMatch?.id === match.id;
                const countdown = formatCountdown(new Date(match.date).getTime() - now);

                return (
                  <motion.article
                    key={match.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, delay: index * 0.04 }}
                    onClick={() => setSelectedMatchId(match.id)}
                    className={`rounded-[22px] border p-4 transition ${active ? "border-fuchsia-300/24 bg-fuchsia-300/10 shadow-[0_0_24px_rgba(195,93,255,0.12)]" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"}`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/44">
                          <span>{formatHistoryDate(match.date)}</span>
                          <span>•</span>
                          <span>{formatHistoryTime(match.date)}</span>
                        </div>

                        <div className="mt-3 flex items-center gap-3 overflow-hidden">
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            {winner?.id === match.player1.id ? <Crown className="h-4 w-4 shrink-0 text-amber-300" /> : null}
                            <Image src={match.player1.logoUrl} alt={match.player1.pseudo} width={64} height={64} className="h-14 w-14 rounded-[18px] border border-white/10 bg-black/20 object-contain p-1.5" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <CountryFlag countryCode={match.player1.countryCode} className="h-4 w-4 rounded-full" />
                                <span className="truncate text-sm font-black text-white">{match.player1.pseudo}</span>
                              </div>
                              <div className="truncate text-xs text-white/45">ID {match.player1.freefireId}</div>
                            </div>
                          </div>

                          <div className="shrink-0 text-sm font-black uppercase tracking-[0.18em] text-amber-200">VS</div>

                          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right">
                            <div className="min-w-0">
                              <div className="flex items-center justify-end gap-2">
                                <span className="truncate text-sm font-black text-white">{match.player2.pseudo}</span>
                                <CountryFlag countryCode={match.player2.countryCode} className="h-4 w-4 rounded-full" />
                              </div>
                              <div className="truncate text-xs text-white/45">ID {match.player2.freefireId}</div>
                            </div>
                            <Image src={match.player2.logoUrl} alt={match.player2.pseudo} width={64} height={64} className="h-14 w-14 rounded-[18px] border border-white/10 bg-black/20 object-contain p-1.5" />
                            {winner?.id === match.player2.id ? <Crown className="h-4 w-4 shrink-0 text-amber-300" /> : null}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${match.status === "FINISHED" ? "border-emerald-300/24 bg-emerald-300/10 text-emerald-100" : match.status === "LIVE" ? "border-rose-300/24 bg-rose-300/10 text-rose-100" : "border-cyan-300/24 bg-cyan-300/10 text-cyan-100"}`}>
                          {match.status === "FINISHED" ? winner ? `Victoire ${winner.pseudo}` : "Termine" : match.status === "LIVE" ? "Live" : `Dans ${countdown}`}
                        </span>
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-[14px] border border-white/10 bg-black/20 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-white"
                          onClick={(event) => {
                            event.stopPropagation();
                            openDetails(match.id);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                          Details match
                        </button>
                      </div>
                    </div>
                  </motion.article>
                );
              })
            ) : (
              <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-10 text-center text-sm text-white/48">Aucun match dans cette section pour le moment.</div>
            )}
          </div>

          <aside className="hidden rounded-[24px] border border-white/10 bg-black/20 p-5 backdrop-blur-md xl:block">
            {selectedMatch ? <MatchDetail match={selectedMatch} now={now} /> : null}
          </aside>
        </div>

        {totalPages > 1 ? (
          <div className="relative mt-5 flex flex-wrap items-center justify-center gap-2">
            <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/20 text-white disabled:opacity-40" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1}>
              <ChevronLeft className="h-4 w-4" />
            </button>

            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
              <button
                key={page}
                type="button"
                className={`h-10 min-w-10 rounded-full border px-3 text-sm font-black ${page === currentPage ? "border-fuchsia-300/24 bg-fuchsia-300/10 text-white" : "border-white/10 bg-black/20 text-white/65"}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}

            <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/20 text-white disabled:opacity-40" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages}>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </section>

      {detailOpen && selectedMatch ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-0 xl:hidden" role="dialog" aria-modal="true">
          <div className="max-h-[88vh] w-full overflow-y-auto rounded-t-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,15,38,0.98),rgba(8,10,24,0.98))] p-5 shadow-[0_-24px_60px_rgba(0,0,0,0.45)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="text-sm font-black uppercase tracking-[0.18em] text-white/68">Details du match</div>
              <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white" onClick={() => setDetailOpen(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <MatchDetail match={selectedMatch} now={now} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

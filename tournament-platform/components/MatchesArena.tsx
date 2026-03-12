"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bolt, Crown, Flame, Shield, Sparkles, Swords, Trophy } from "lucide-react";

import { getCountryOption } from "@/lib/countries";
import type { MatchPublic } from "@/types/match";

type RankingEntry = {
  id: string;
  pseudo: string;
  countryCode?: string;
  credits: number;
  points: number;
  wins: number;
  winStreak: number;
  logoUrl: string;
};

type MatchTab = "PENDING" | "LIVE" | "FINISHED";

const tabMeta: Array<{ key: MatchTab; label: string; subLabel: string }> = [
  { key: "PENDING", label: "Programmes", subLabel: "A venir" },
  { key: "LIVE", label: "En cours", subLabel: "Live" },
  { key: "FINISHED", label: "Termines", subLabel: "Archives" },
];

function formatCountdown(ms: number) {
  if (ms <= 0) return "Disponible";
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}j ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
  }

  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
}

function formatDateLabel(dateValue: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateValue));
}

function CountryFlag({ countryCode, className = "" }: { countryCode?: string; className?: string }) {
  const country = getCountryOption(countryCode);
  if (!country) return null;

  return <img src={country.flagUrl} alt={country.label} className={className} />;
}

function getWinner(match: MatchPublic | null) {
  if (!match?.winnerId) return null;
  if (match.winnerId === match.player1.id) return match.player1;
  if (match.winnerId === match.player2.id) return match.player2;
  return null;
}

function getStatusCopy(match: MatchPublic, now: number) {
  if (match.status === "PENDING") {
    return {
      chip: "Programme",
      subcopy: `Dans ${formatCountdown(new Date(match.date).getTime() - now)}`,
    };
  }

  if (match.status === "LIVE") {
    return {
      chip: "Live",
      subcopy: "Affrontement en cours",
    };
  }

  const winner = getWinner(match);
  return {
    chip: winner ? `Victoire ${winner.pseudo}` : "Termine",
    subcopy: winner ? `${winner.pseudo} a remporte le duel` : "Resultat en attente",
  };
}

export default function MatchesArena({
  matches,
  ranking,
}: {
  matches: MatchPublic[];
  ranking: RankingEntry[];
}) {
  const initialTab = matches.some((match) => match.status === "LIVE") ? "LIVE" : matches.some((match) => match.status === "PENDING") ? "PENDING" : "FINISHED";
  const [activeTab, setActiveTab] = useState<MatchTab>(initialTab);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredMatches = useMemo(() => {
    const current = matches.filter((match) => match.status === activeTab);
    return current.length ? current : matches;
  }, [activeTab, matches]);

  useEffect(() => {
    if (!filteredMatches.length) {
      setSelectedMatchId(null);
      return;
    }

    if (!selectedMatchId || !filteredMatches.some((match) => match.id === selectedMatchId)) {
      setSelectedMatchId(filteredMatches[0].id);
    }
  }, [filteredMatches, selectedMatchId]);

  const featuredMatch = useMemo(
    () => filteredMatches.find((match) => match.id === selectedMatchId) ?? filteredMatches[0] ?? null,
    [filteredMatches, selectedMatchId],
  );

  const lowerMatches = useMemo(() => filteredMatches.filter((match) => match.id !== featuredMatch?.id).slice(0, 3), [featuredMatch?.id, filteredMatches]);
  const featuredWinner = getWinner(featuredMatch);

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 pb-12 pt-6 sm:px-5 lg:px-6">
      <section className="relative overflow-hidden rounded-[28px] border border-fuchsia-300/14 bg-[linear-gradient(160deg,rgba(35,19,66,0.92),rgba(10,10,25,0.88)_55%,rgba(8,28,61,0.82))] p-4 shadow-[0_0_40px_rgba(140,66,255,0.12)] sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,164,95,0.12),transparent_25%),radial-gradient(circle_at_top_right,rgba(92,225,255,0.1),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_24%)]" />

        <div className="relative">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-white/72">
                <Bolt className="h-4 w-4 text-amber-300" />
                1VS1 King League
              </div>
              <h1 className="mt-4 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl lg:text-5xl">Matchs</h1>
              <p className="mt-3 max-w-2xl text-sm text-white/62 sm:text-base">Vue rapide des matchs programmes, live et valides, avec un affichage plus fluide sur mobile comme sur desktop.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {tabMeta.map((tab) => {
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`rounded-[16px] border px-4 py-3 text-left transition ${active ? "border-cyan-300/28 bg-cyan-300/10 text-white shadow-[0_0_20px_rgba(92,225,255,0.14)]" : "border-white/10 bg-black/20 text-white/62 hover:bg-white/5"}`}
                  >
                    <div className="text-[11px] font-black uppercase tracking-[0.22em]">{tab.subLabel}</div>
                    <div className="mt-1 text-sm font-bold">{tab.label}</div>
                  </button>
                );
              })}
            </div>
          </motion.div>

          <div className="mt-6 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)_280px]">
            <aside className="rounded-[24px] border border-white/10 bg-black/20 p-4 backdrop-blur-md">
              <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-white">
                <Flame className="h-4 w-4 text-amber-300" />
                Programme
              </div>

              <div className="mt-4 space-y-3">
                {filteredMatches.length ? (
                  filteredMatches.map((match, index) => {
                    const status = getStatusCopy(match, now);
                    const active = featuredMatch?.id === match.id;

                    return (
                      <motion.button
                        key={match.id}
                        type="button"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.28, delay: index * 0.04 }}
                        onClick={() => setSelectedMatchId(match.id)}
                        className={`w-full rounded-[20px] border p-4 text-left transition ${active ? "border-fuchsia-300/28 bg-fuchsia-300/10 shadow-[0_0_24px_rgba(195,93,255,0.12)]" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/44">
                              <span>Match #{index + 1}</span>
                              <span>•</span>
                              <span>{formatDateLabel(match.date)}</span>
                            </div>
                            <div className="mt-3 flex items-center gap-3 overflow-hidden">
                              <div className="flex min-w-0 flex-1 items-center gap-2">
                                <img src={match.player1.logoUrl} alt={match.player1.pseudo} className="h-12 w-12 rounded-[16px] border border-white/10 bg-black/20 object-contain p-1.5" />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <CountryFlag countryCode={match.player1.countryCode} className="h-4 w-4 rounded-full" />
                                    <span className="truncate text-sm font-black text-white">{match.player1.pseudo}</span>
                                  </div>
                                  <div className="truncate text-xs text-white/45">{match.player1.freefireId}</div>
                                </div>
                              </div>

                              <div className="shrink-0 text-sm font-black uppercase tracking-[0.18em] text-amber-200">VS</div>

                              <div className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right">
                                <div className="min-w-0">
                                  <div className="flex items-center justify-end gap-2">
                                    <span className="truncate text-sm font-black text-white">{match.player2.pseudo}</span>
                                    <CountryFlag countryCode={match.player2.countryCode} className="h-4 w-4 rounded-full" />
                                  </div>
                                  <div className="truncate text-xs text-white/45">{match.player2.freefireId}</div>
                                </div>
                                <img src={match.player2.logoUrl} alt={match.player2.pseudo} className="h-12 w-12 rounded-[16px] border border-white/10 bg-black/20 object-contain p-1.5" />
                              </div>
                            </div>
                          </div>

                          <span className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${match.status === "LIVE" ? "border-rose-300/24 bg-rose-300/10 text-rose-100" : match.status === "FINISHED" ? "border-emerald-300/24 bg-emerald-300/10 text-emerald-100" : "border-cyan-300/24 bg-cyan-300/10 text-cyan-100"}`}>
                            {status.chip}
                          </span>
                        </div>

                        <div className="mt-3 text-xs text-white/52">{status.subcopy}</div>
                      </motion.button>
                    );
                  })
                ) : (
                  <div className="rounded-[20px] border border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-white/48">Aucun affrontement disponible.</div>
                )}
              </div>
            </aside>

            <section className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-4 shadow-[inset_0_0_30px_rgba(255,255,255,0.02)] sm:p-5">
              {featuredMatch ? (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">Resume du match</div>
                      <div className="mt-2 text-2xl font-black text-white sm:text-3xl">
                        {featuredMatch.status === "PENDING" ? "Duel programme" : featuredMatch.status === "LIVE" ? "Duel en cours" : "Resultat confirme"}
                      </div>
                    </div>
                    <div className="rounded-[16px] border border-white/10 bg-black/20 px-4 py-3 text-right">
                      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">Date</div>
                      <div className="mt-1 text-sm font-bold text-white">{formatDateLabel(featuredMatch.date)}</div>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
                    <div className={`rounded-[24px] border p-4 ${featuredWinner?.id === featuredMatch.player1.id ? "border-amber-300/24 bg-amber-300/10" : "border-white/10 bg-black/20"}`}>
                      <div className="flex items-center gap-4">
                        <img src={featuredMatch.player1.logoUrl} alt={featuredMatch.player1.pseudo} className="h-24 w-24 rounded-[22px] border border-white/10 bg-black/20 object-contain p-2 sm:h-28 sm:w-28" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/45">
                            <CountryFlag countryCode={featuredMatch.player1.countryCode} className="h-4 w-4 rounded-full" />
                            Combattant 1
                          </div>
                          <div className="mt-2 truncate text-2xl font-black text-white">{featuredMatch.player1.pseudo}</div>
                          <div className="mt-1 text-sm text-white/55">ID {featuredMatch.player1.freefireId}</div>
                          {featuredWinner?.id === featuredMatch.player1.id ? (
                            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-300/24 bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-100">
                              <Crown className="h-4 w-4" />
                              Victoire
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 text-xl font-black uppercase tracking-[0.16em] text-white shadow-[0_0_20px_rgba(193,108,255,0.18)]">
                      VS
                    </div>

                    <div className={`rounded-[24px] border p-4 ${featuredWinner?.id === featuredMatch.player2.id ? "border-amber-300/24 bg-amber-300/10" : "border-white/10 bg-black/20"}`}>
                      <div className="flex items-center gap-4">
                        <img src={featuredMatch.player2.logoUrl} alt={featuredMatch.player2.pseudo} className="h-24 w-24 rounded-[22px] border border-white/10 bg-black/20 object-contain p-2 sm:h-28 sm:w-28" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/45">
                            <CountryFlag countryCode={featuredMatch.player2.countryCode} className="h-4 w-4 rounded-full" />
                            Combattant 2
                          </div>
                          <div className="mt-2 truncate text-2xl font-black text-white">{featuredMatch.player2.pseudo}</div>
                          <div className="mt-1 text-sm text-white/55">ID {featuredMatch.player2.freefireId}</div>
                          {featuredWinner?.id === featuredMatch.player2.id ? (
                            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-300/24 bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-100">
                              <Crown className="h-4 w-4" />
                              Victoire
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
                      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/42">Statut</div>
                      <div className="mt-2 text-lg font-black text-white">{featuredMatch.status === "PENDING" ? "Programme" : featuredMatch.status === "LIVE" ? "En direct" : "Termine"}</div>
                    </div>
                    <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-4">
                      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/42">Decision</div>
                      <div className="mt-2 text-lg font-black text-white">{featuredWinner ? `Victoire ${featuredWinner.pseudo}` : featuredMatch.status === "PENDING" ? formatCountdown(new Date(featuredMatch.date).getTime() - now) : "Aucune"}</div>
                    </div>
                    <div className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-4 sm:col-span-2 xl:col-span-1">
                      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/42">Impact</div>
                      <div className="mt-2 text-sm text-white/62">Le gagnant prend 1 credit et 3 points. Le perdant perd 1 credit.</div>
                    </div>
                  </div>

                  <button type="button" className="mt-6 inline-flex items-center gap-2 rounded-[16px] border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white">
                    <Swords className="h-4 w-4" />
                    {featuredMatch.status === "LIVE" ? "Suivre le match" : featuredMatch.status === "FINISHED" ? "Voir le resume" : "Preparer le duel"}
                  </button>
                </>
              ) : (
                <div className="rounded-[20px] border border-white/10 bg-white/5 px-4 py-10 text-center text-sm text-white/48">Aucun affrontement disponible pour le moment.</div>
              )}
            </section>

            <aside className="rounded-[24px] border border-white/10 bg-black/20 p-4 backdrop-blur-md">
              <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-white">
                <Trophy className="h-4 w-4 text-amber-300" />
                Top 3 du moment
              </div>

              <div className="mt-4 space-y-3">
                {ranking.slice(0, 3).map((entry, index) => (
                  <div key={entry.id} className="rounded-[18px] border border-white/10 bg-white/[0.03] px-3 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-amber-300/24 bg-amber-300/10 text-sm font-black text-amber-100">#{index + 1}</div>
                      <img src={entry.logoUrl} alt={entry.pseudo} className="h-12 w-12 rounded-[16px] border border-white/10 bg-black/20 object-contain p-1.5" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <CountryFlag countryCode={entry.countryCode} className="h-4 w-4 rounded-full" />
                          <div className="truncate text-sm font-black text-white">{entry.pseudo}</div>
                        </div>
                        <div className="mt-1 text-xs text-white/48">{entry.points} pts • {entry.wins} victoires • serie x{entry.winStreak}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_300px]">
            <section className="rounded-[24px] border border-white/10 bg-black/20 p-4 backdrop-blur-md">
              <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-white">
                <Flame className="h-4 w-4 text-amber-300" />
                A surveiller
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {lowerMatches.length ? (
                  lowerMatches.map((match) => {
                    const winner = getWinner(match);
                    return (
                      <article key={match.id} className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex items-center justify-between gap-3 text-[11px] font-black uppercase tracking-[0.18em] text-white/45">
                          <span>{match.status === "PENDING" ? "A venir" : match.status === "LIVE" ? "Live" : "Resultat"}</span>
                          <span>{formatDateLabel(match.date)}</span>
                        </div>
                        <div className="mt-4 flex items-center justify-between gap-3">
                          <img src={match.player1.logoUrl} alt={match.player1.pseudo} className="h-14 w-14 rounded-[18px] border border-white/10 bg-black/20 object-contain p-2" />
                          <span className="text-sm font-black uppercase tracking-[0.18em] text-amber-200">VS</span>
                          <img src={match.player2.logoUrl} alt={match.player2.pseudo} className="h-14 w-14 rounded-[18px] border border-white/10 bg-black/20 object-contain p-2" />
                        </div>
                        <div className="mt-3 text-sm font-black text-white">{match.player1.pseudo} vs {match.player2.pseudo}</div>
                        <div className="mt-1 text-xs text-white/52">{winner ? `Victoire ${winner.pseudo}` : match.status === "PENDING" ? "Match pret a etre joue" : "Aucun gagnant valide"}</div>
                      </article>
                    );
                  })
                ) : (
                  <div className="rounded-[20px] border border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-white/48 md:col-span-3">Aucun autre match a afficher.</div>
                )}
              </div>
            </section>

            <aside className="rounded-[24px] border border-white/10 bg-black/20 p-4 backdrop-blur-md">
              <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-white">
                <Shield className="h-4 w-4 text-cyan-300" />
                Regles cles
              </div>
              <div className="mt-4 space-y-3 text-sm text-white/62">
                <div className="flex items-start gap-2"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /> Format 1v1 Spam / One Tap.</div>
                <div className="flex items-start gap-2"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /> Gagnant: +1 credit et +3 points.</div>
                <div className="flex items-start gap-2"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /> Perdant: -1 credit.</div>
                <div className="flex items-start gap-2"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /> Les matchs programmes peuvent etre annules par l'admin avant leur lancement.</div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}

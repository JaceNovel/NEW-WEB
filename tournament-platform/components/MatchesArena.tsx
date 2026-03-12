"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
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
  { key: "PENDING", label: "Programme", subLabel: "Upcoming" },
  { key: "LIVE", label: "En cours", subLabel: "Live" },
  { key: "FINISHED", label: "Historiques", subLabel: "Archives" },
];

function formatCountdown(ms: number) {
  if (ms <= 0) return "00j 00h 00m 00s";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(days).padStart(2, "0")}j ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
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

function getWinnerSide(match: MatchPublic | null) {
  if (!match?.winnerId) return null;
  if (match.winnerId === match.player1.id) return "left";
  if (match.winnerId === match.player2.id) return "right";
  return null;
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
  const [now, setNow] = useState(() => Date.now());
  const [soundArmed, setSoundArmed] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const finishedMatches = useMemo(
    () => matches.filter((match) => match.status === "FINISHED" && Boolean(match.winnerId)),
    [matches],
  );

  const filteredMatches = useMemo(() => {
    if (activeTab === "FINISHED") {
      return finishedMatches;
    }

    const list = matches.filter((match) => match.status === activeTab);
    return list.length ? list : matches;
  }, [activeTab, finishedMatches, matches]);

  const featuredMatch = useMemo(() => {
    if (filteredMatches.length) return filteredMatches[0];
    if (activeTab === "FINISHED") return finishedMatches[0] ?? null;
    return matches.find((match) => match.status === "LIVE") ?? matches.find((match) => match.status === "PENDING") ?? finishedMatches[0] ?? matches[0] ?? null;
  }, [activeTab, filteredMatches, finishedMatches, matches]);

  const lowerMatches = useMemo(() => {
    if (!filteredMatches.length) return [] as MatchPublic[];
    if (!featuredMatch) return filteredMatches.slice(0, 3);
    return filteredMatches.filter((match) => match.id !== featuredMatch.id).slice(0, 3);
  }, [featuredMatch, filteredMatches]);

  const winnerSide = getWinnerSide(featuredMatch);
  const isHistoryView = featuredMatch?.status === "FINISHED" && winnerSide !== null;
  const leftWinner = winnerSide === "left";
  const rightWinner = winnerSide === "right";

  useEffect(() => {
    function armSound() {
      setSoundArmed(true);
    }

    window.addEventListener("pointerdown", armSound, { once: true });
    window.addEventListener("keydown", armSound, { once: true });

    return () => {
      window.removeEventListener("pointerdown", armSound);
      window.removeEventListener("keydown", armSound);
    };
  }, []);

  useEffect(() => {
    if (!soundArmed || !featuredMatch || typeof window === "undefined") return;

    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const impact = () => {
      const context = audioContextRef.current ?? new AudioContextClass();
      audioContextRef.current = context;

      if (context.state === "suspended") {
        void context.resume();
      }

      const nowTime = context.currentTime;
      const master = context.createGain();
      master.gain.setValueAtTime(0.0001, nowTime);
      master.gain.exponentialRampToValueAtTime(0.14, nowTime + 0.01);
      master.gain.exponentialRampToValueAtTime(0.0001, nowTime + 0.28);
      master.connect(context.destination);

      const metal = context.createOscillator();
      metal.type = "triangle";
      metal.frequency.setValueAtTime(1140, nowTime);
      metal.frequency.exponentialRampToValueAtTime(280, nowTime + 0.22);

      const metalGain = context.createGain();
      metalGain.gain.setValueAtTime(0.14, nowTime);
      metalGain.gain.exponentialRampToValueAtTime(0.0001, nowTime + 0.22);
      metal.connect(metalGain).connect(master);

      const spark = context.createOscillator();
      spark.type = "square";
      spark.frequency.setValueAtTime(1820, nowTime);
      spark.frequency.exponentialRampToValueAtTime(720, nowTime + 0.1);

      const sparkGain = context.createGain();
      sparkGain.gain.setValueAtTime(0.05, nowTime);
      sparkGain.gain.exponentialRampToValueAtTime(0.0001, nowTime + 0.1);
      spark.connect(sparkGain).connect(master);

      metal.start(nowTime);
      spark.start(nowTime);
      metal.stop(nowTime + 0.24);
      spark.stop(nowTime + 0.12);
    };

    const initialDelay = window.setTimeout(impact, 600);
    const intervalId = window.setInterval(impact, 1800);

    return () => {
      window.clearTimeout(initialDelay);
      window.clearInterval(intervalId);
    };
  }, [featuredMatch, soundArmed]);

  return (
    <div className="tp-matchs-shell w-full pb-12 pt-6">
      <section className="tp-matchs-hero">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="tp-matchs-brand-wrap"
        >
          <div className="tp-matchs-brand-mark">1VS1 KING LEAGUE</div>
          <div className="tp-matchs-brand-subtitle">Combattez. Dominez. Gagnez.</div>
        </motion.div>

        <div className="tp-matchs-top-tabs">
          {tabMeta.map((tab) => {
            const active = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`tp-matchs-top-tab ${active ? "tp-matchs-top-tab-active" : ""}`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="tp-matchs-main-grid">
          <motion.aside
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="tp-matchs-panel tp-matchs-schedule"
          >
            <div className="tp-matchs-panel-head">
              <div className="tp-matchs-panel-title">
                <Bolt className="h-4 w-4" />
                {tabMeta.find((tab) => tab.key === activeTab)?.label}
              </div>
            </div>

            <div className="tp-matchs-schedule-list">
              {filteredMatches.map((match, index) => {
                const isFeatured = featuredMatch?.id === match.id;
                const statusClass =
                  match.status === "LIVE"
                    ? "tp-matchs-chip-live"
                    : match.status === "FINISHED"
                      ? "tp-matchs-chip-finished"
                      : "tp-matchs-chip-pending";
                const matchWinnerSide = getWinnerSide(match);
                const matchWinnerName = matchWinnerSide === "left" ? match.player1.pseudo : matchWinnerSide === "right" ? match.player2.pseudo : null;

                return (
                  <motion.button
                    key={match.id}
                    type="button"
                    onClick={() => setActiveTab(match.status)}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, delay: index * 0.05 }}
                    className={`tp-matchs-schedule-item ${isFeatured ? "tp-matchs-schedule-item-active" : ""}`}
                  >
                    <div className="tp-matchs-schedule-row">
                      <div className="tp-matchs-schedule-team">
                        <Image src={match.player1.logoUrl} alt={match.player1.pseudo} width={36} height={36} className="tp-matchs-schedule-logo" />
                        <div>
                          <div className="tp-matchs-schedule-name">
                            <CountryFlag countryCode={match.player1.countryCode} className="tp-matchs-inline-flag" />
                            <span>{match.player1.pseudo}</span>
                          </div>
                          <div className="tp-matchs-schedule-meta">{match.player1.freefireId}</div>
                        </div>
                      </div>
                      <span className={`tp-matchs-chip ${statusClass}`}>{match.status === "PENDING" ? "+14" : match.status === "LIVE" ? "LIVE" : "VALIDÉ"}</span>
                    </div>
                    <div className="tp-matchs-schedule-row tp-matchs-schedule-row-bottom">
                      <div className="tp-matchs-schedule-team tp-matchs-schedule-team-small">
                        <Image src={match.player2.logoUrl} alt={match.player2.pseudo} width={28} height={28} className="tp-matchs-schedule-logo tp-matchs-schedule-logo-small" />
                        <div>
                          <div className="tp-matchs-schedule-name tp-matchs-schedule-name-small">
                            <CountryFlag countryCode={match.player2.countryCode} className="tp-matchs-inline-flag tp-matchs-inline-flag-small" />
                            <span>{match.player2.pseudo}</span>
                          </div>
                          <div className="tp-matchs-schedule-meta">{match.status === "FINISHED" && matchWinnerName ? `Vainqueur: ${matchWinnerName}` : formatDateLabel(match.date)}</div>
                        </div>
                      </div>
                      <div className="tp-matchs-schedule-score">{match.player1.pseudo.length + match.player2.pseudo.length}</div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.aside>

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.18 }}
            className={`tp-matchs-panel tp-matchs-battle ${isHistoryView ? "tp-matchs-battle-history" : "tp-matchs-battle-shake"}`}
          >
            {featuredMatch ? (
              <>
                <div className="tp-matchs-battle-atmosphere" aria-hidden="true">
                  <span className="tp-matchs-battle-smoke tp-matchs-battle-smoke-left" />
                  <span className="tp-matchs-battle-smoke tp-matchs-battle-smoke-center" />
                  <span className="tp-matchs-battle-smoke tp-matchs-battle-smoke-right" />
                  <span className="tp-matchs-battle-haze tp-matchs-battle-haze-left" />
                  <span className="tp-matchs-battle-haze tp-matchs-battle-haze-center" />
                  <span className="tp-matchs-battle-haze tp-matchs-battle-haze-right" />
                  <span className="tp-matchs-battle-beam tp-matchs-battle-beam-left" />
                  <span className="tp-matchs-battle-beam tp-matchs-battle-beam-right" />
                  <span className="tp-matchs-battle-sweep" />
                  <span className="tp-matchs-battle-orb tp-matchs-battle-orb-1" />
                  <span className="tp-matchs-battle-orb tp-matchs-battle-orb-2" />
                  <span className="tp-matchs-battle-orb tp-matchs-battle-orb-3" />
                  <span className="tp-matchs-battle-particle tp-matchs-battle-particle-1" />
                  <span className="tp-matchs-battle-particle tp-matchs-battle-particle-2" />
                  <span className="tp-matchs-battle-particle tp-matchs-battle-particle-3" />
                  <span className="tp-matchs-battle-particle tp-matchs-battle-particle-4" />
                  <span className="tp-matchs-battle-particle tp-matchs-battle-particle-5" />
                  <span className="tp-matchs-battle-particle tp-matchs-battle-particle-6" />
                  <span className="tp-matchs-battle-particle tp-matchs-battle-particle-7" />
                  <span className="tp-matchs-battle-grid" />
                </div>

                <div className="tp-matchs-battle-label">{featuredMatch.status === "LIVE" ? "Battle en cours" : featuredMatch.status === "FINISHED" ? "Victoire validée" : "Upcoming Battle"}</div>

                <div className="tp-matchs-battle-stage">
                  <div className="tp-matchs-battle-aura tp-matchs-battle-aura-left" />
                  <div className="tp-matchs-battle-aura tp-matchs-battle-aura-right" />
                  <div className={`tp-matchs-battle-clash ${isHistoryView ? "tp-matchs-battle-clash-history" : ""}`} aria-hidden="true">
                    <span className="tp-matchs-battle-clash-core" />
                    <span className="tp-matchs-battle-clash-ring" />
                    <span className="tp-matchs-battle-clash-ring tp-matchs-battle-clash-ring-outer" />
                    <span className="tp-matchs-battle-clash-burst" />
                    <span className="tp-matchs-battle-clash-flame tp-matchs-battle-clash-flame-left" />
                    <span className="tp-matchs-battle-clash-flame tp-matchs-battle-clash-flame-right" />
                    <span className="tp-matchs-battle-clash-spark tp-matchs-battle-clash-spark-left" />
                    <span className="tp-matchs-battle-clash-spark tp-matchs-battle-clash-spark-right" />
                    <span className="tp-matchs-battle-clash-shard tp-matchs-battle-clash-shard-1" />
                    <span className="tp-matchs-battle-clash-shard tp-matchs-battle-clash-shard-2" />
                    <span className="tp-matchs-battle-clash-shard tp-matchs-battle-clash-shard-3" />
                    <span className="tp-matchs-battle-clash-shard tp-matchs-battle-clash-shard-4" />
                    <span className="tp-matchs-battle-clash-shard tp-matchs-battle-clash-shard-5" />
                    <span className="tp-matchs-battle-clash-shard tp-matchs-battle-clash-shard-6" />
                  </div>

                  <motion.div
                    animate={
                      isHistoryView
                        ? leftWinner
                          ? { y: [0, -8, 0], rotate: [0, -3, 0], scale: [1, 1.06, 1] }
                          : { y: [0, 3, 0], rotate: [0, 3, 0], scale: [0.97, 0.94, 0.97], opacity: [0.86, 0.72, 0.86] }
                        : { x: [0, 28, 8, 0], y: [0, -8, -2, 0], rotate: [0, -16, -6, 0], scale: [1, 1.08, 1.03, 1] }
                    }
                    transition={{ duration: isHistoryView ? 2.8 : 1.55, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                    className={`tp-matchs-emblem tp-matchs-emblem-left ${leftWinner ? "tp-matchs-emblem-winner" : ""} ${isHistoryView && !leftWinner ? "tp-matchs-emblem-loser" : ""}`}
                  >
                    {leftWinner ? (
                      <span className="tp-matchs-winner-crown tp-matchs-winner-crown-left">
                        <Crown className="h-5 w-5" />
                      </span>
                    ) : null}
                    <Image src={featuredMatch.player1.logoUrl} alt={featuredMatch.player1.pseudo} width={184} height={184} className="tp-matchs-emblem-logo tp-matchs-emblem-logo-left" />
                  </motion.div>

                  <div className="tp-matchs-versus-wrap">
                    <motion.div
                      animate={
                        isHistoryView
                          ? {
                              scale: [1, 1.08, 1],
                              rotate: [0, -2, 0],
                              letterSpacing: ["-0.08em", "-0.01em", "-0.08em"],
                              textShadow: [
                                "0 0 22px rgba(255,207,126,0.24)",
                                "0 0 40px rgba(255,223,181,0.42), 0 0 90px rgba(255,150,76,0.22), 0 0 120px rgba(193,108,255,0.18)",
                                "0 0 22px rgba(255,207,126,0.24)",
                              ],
                              opacity: [0.94, 1, 0.94],
                            }
                          : {
                              scale: [1, 1.05, 1.24, 0.9, 1],
                              rotate: [0, 0, -5, 4, 0],
                              letterSpacing: ["-0.08em", "-0.08em", "0.01em", "-0.1em", "-0.08em"],
                              textShadow: [
                                "0 0 18px rgba(255,176,102,0.2)",
                                "0 0 22px rgba(255,176,102,0.26)",
                                "0 0 36px rgba(255,224,180,0.72), 0 0 90px rgba(255,141,76,0.46), 0 0 120px rgba(193,108,255,0.24)",
                                "0 0 22px rgba(255,176,102,0.34)",
                                "0 0 18px rgba(255,176,102,0.2)",
                              ],
                              opacity: [1, 1, 1, 0.88, 1],
                            }
                      }
                      transition={{ duration: isHistoryView ? 2.8 : 1.55, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                      className={`tp-matchs-versus ${isHistoryView ? "tp-matchs-versus-history" : ""}`}
                    >
                      {isHistoryView ? "WIN" : "VS"}
                    </motion.div>
                  </div>

                  <motion.div
                    animate={
                      isHistoryView
                        ? rightWinner
                          ? { y: [0, -8, 0], rotate: [0, 3, 0], scale: [1, 1.06, 1] }
                          : { y: [0, 3, 0], rotate: [0, -3, 0], scale: [0.97, 0.94, 0.97], opacity: [0.86, 0.72, 0.86] }
                        : { x: [0, -28, -8, 0], y: [0, 8, 2, 0], rotate: [0, 16, 6, 0], scale: [1, 1.08, 1.03, 1] }
                    }
                    transition={{ duration: isHistoryView ? 2.8 : 1.55, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: isHistoryView ? 0 : 0.06 }}
                    className={`tp-matchs-emblem tp-matchs-emblem-right ${rightWinner ? "tp-matchs-emblem-winner" : ""} ${isHistoryView && !rightWinner ? "tp-matchs-emblem-loser" : ""}`}
                  >
                    {rightWinner ? (
                      <span className="tp-matchs-winner-crown tp-matchs-winner-crown-right">
                        <Crown className="h-5 w-5" />
                      </span>
                    ) : null}
                    <Image src={featuredMatch.player2.logoUrl} alt={featuredMatch.player2.pseudo} width={184} height={184} className="tp-matchs-emblem-logo tp-matchs-emblem-logo-right" />
                  </motion.div>
                </div>

                <div className="tp-matchs-battle-teams">
                  <div className="tp-matchs-emblem-name">
                    <CountryFlag countryCode={featuredMatch.player1.countryCode} className="tp-matchs-emblem-flag" />
                    <span>{featuredMatch.player1.pseudo}</span>
                  </div>
                  <div className="tp-matchs-battle-team-separator">vs</div>
                  <div className="tp-matchs-emblem-name">
                    <CountryFlag countryCode={featuredMatch.player2.countryCode} className="tp-matchs-emblem-flag" />
                    <span>{featuredMatch.player2.pseudo}</span>
                  </div>
                </div>

                <div className="tp-matchs-battle-countdown">
                  {featuredMatch.status === "PENDING"
                    ? `Debut dans ${formatCountdown(new Date(featuredMatch.date).getTime() - now)}`
                    : featuredMatch.status === "LIVE"
                      ? "Match en direct maintenant"
                      : `Valide par l'admin • Gagnant: ${featuredMatch.winnerId === featuredMatch.player1.id ? featuredMatch.player1.pseudo : featuredMatch.winnerId === featuredMatch.player2.id ? featuredMatch.player2.pseudo : "—"}`}
                </div>

                <motion.button
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="tp-matchs-battle-cta"
                >
                  <Swords className="h-4 w-4" />
                  {featuredMatch.status === "LIVE" ? "Rejoindre le combat" : featuredMatch.status === "FINISHED" ? "Voir le resume" : "Pret au combat"}
                </motion.button>
              </>
            ) : (
              <div className="tp-matchs-empty">Aucun affrontement disponible pour le moment.</div>
            )}
          </motion.section>

          <motion.aside
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, delay: 0.14 }}
            className="tp-matchs-panel tp-matchs-ranking"
          >
            <div className="tp-matchs-panel-head">
              <div className="tp-matchs-panel-title">
                <Trophy className="h-4 w-4" />
                Classement 1VS1 KING LEAGUE
              </div>
            </div>

            <div className="tp-matchs-ranking-list">
              {ranking.slice(0, 5).map((entry, index) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, delay: index * 0.06 }}
                  className="tp-matchs-ranking-item"
                >
                  <div className="tp-matchs-ranking-left">
                    <span className="tp-matchs-ranking-rank">#{index + 1}</span>
                    <Image src={entry.logoUrl} alt={entry.pseudo} width={34} height={34} className="tp-matchs-ranking-logo" />
                    <div>
                      <div className="tp-matchs-ranking-name">
                        <CountryFlag countryCode={entry.countryCode} className="tp-matchs-inline-flag" />
                        <span>{entry.pseudo}</span>
                      </div>
                      <div className="tp-matchs-ranking-meta">{entry.wins} victoires • Serie x{entry.winStreak}</div>
                    </div>
                  </div>
                  <div className="tp-matchs-ranking-score">{entry.points} pts</div>
                </motion.div>
              ))}
            </div>

            <button type="button" className="tp-matchs-ranking-button">
              Voir toutes les regles
            </button>
          </motion.aside>
        </div>

        <div className="tp-matchs-bottom-grid">
          <section className="tp-matchs-panel tp-matchs-lower-battles">
            <div className="tp-matchs-panel-head">
              <div className="tp-matchs-panel-title">
                <Flame className="h-4 w-4" />
                Batailles a surveiller
              </div>
            </div>

            <div className="tp-matchs-cards-grid">
              {lowerMatches.map((match, index) => (
                <motion.article
                  key={match.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.38, delay: index * 0.08 }}
                  className="tp-matchs-duel-card"
                >
                  {getWinnerSide(match) === "left" ? (
                    <span className="tp-matchs-duel-crown tp-matchs-duel-crown-left">
                      <Crown className="h-4 w-4" />
                    </span>
                  ) : null}
                  {getWinnerSide(match) === "right" ? (
                    <span className="tp-matchs-duel-crown tp-matchs-duel-crown-right">
                      <Crown className="h-4 w-4" />
                    </span>
                  ) : null}
                  <div className="tp-matchs-duel-top">
                    <span className="tp-matchs-duel-level">Lvl {index + 3}</span>
                    <span className="tp-matchs-duel-badge">{match.status === "LIVE" ? "Live" : match.status === "FINISHED" ? "Valide" : "A suivre"}</span>
                  </div>
                  <div className="tp-matchs-duel-logos">
                    <Image src={match.player1.logoUrl} alt={match.player1.pseudo} width={54} height={54} className="tp-matchs-duel-logo" />
                    <span className="tp-matchs-duel-vs">VS</span>
                    <Image src={match.player2.logoUrl} alt={match.player2.pseudo} width={54} height={54} className="tp-matchs-duel-logo" />
                  </div>
                  <div className="tp-matchs-duel-names">{match.player1.pseudo} <span>vs</span> {match.player2.pseudo}</div>
                  <button type="button" className="tp-matchs-duel-action">Suivre l&apos;affrontement</button>
                </motion.article>
              ))}
            </div>
          </section>

          <aside className="tp-matchs-panel tp-matchs-rules">
            <div className="tp-matchs-panel-title">
              <Shield className="h-4 w-4" />
              Reglement 1VS1 KING LEAGUE
            </div>
            <div className="tp-matchs-rules-list">
              <div className="tp-matchs-rule-item"><Sparkles className="h-4 w-4" /> Format: 1v1 Spam / One Tap</div>
              <div className="tp-matchs-rule-item"><Sparkles className="h-4 w-4" /> Le gagnant prend 1 credit et 3 points</div>
              <div className="tp-matchs-rule-item"><Sparkles className="h-4 w-4" /> Le perdant perd 1 credit</div>
              <div className="tp-matchs-rule-item"><Sparkles className="h-4 w-4" /> Avant le ROI, les joueurs peuvent defier qui ils veulent</div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

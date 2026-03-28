"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, CircleDot, Crown, Eye, Swords } from "lucide-react";

import { getCountryOption } from "@/lib/countries";
import { getTournamentDisplayDate } from "@/lib/match-scheduling";
import type { MatchPublic } from "@/types/match";

type HistoryTab = "PENDING" | "LIVE" | "FINISHED";

const tabMeta: Array<{ key: HistoryTab; label: string }> = [
  { key: "PENDING", label: "Programmes" },
  { key: "LIVE", label: "En cours" },
  { key: "FINISHED", label: "Archives" },
];

const ITEMS_PER_PAGE = 4;

function formatHistoryDate(dateValue: string) {
  const displayDate = getTournamentDisplayDate(dateValue);

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(displayDate);
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

function getLoser(match: MatchPublic) {
  const winner = getWinner(match);
  if (!winner) return null;
  return winner.id === match.player1.id ? match.player2 : match.player1;
}

function getPendingLabel(match: MatchPublic, now: number) {
  if (match.sourceType === "CHALLENGE") {
    return match.challengeStatus === "ACCEPTED" ? "A venir" : "A venir";
  }

  void now;
  return "A venir";
}

function getFighterStatus(match: MatchPublic, fighterId: string, now: number) {
  if (match.status === "PENDING") {
    return { label: getPendingLabel(match, now), className: "tp-history-pill-pending" };
  }

  if (match.status === "LIVE") {
    return { label: "En cours", className: "tp-history-pill-live" };
  }

  if (match.winnerId === fighterId) {
    return { label: "Victoire", className: "tp-history-pill-winner" };
  }

  return { label: "Defaite", className: "tp-history-pill-loser" };
}

export default function HistoryArena({ matches }: { matches: MatchPublic[] }) {
  const [activeTab, setActiveTab] = useState<HistoryTab>("FINISHED");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
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

  return (
    <div className="tp-history-shell">
      <section className="tp-history-hero">
        <div className="tp-history-backdrop" aria-hidden="true" />

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="tp-history-header"
        >
          <div className="tp-history-title-wrap">
            <h1 className="tp-history-title">Historique</h1>
            <p className="tp-history-subtitle">Archives officielles des duels 1v1 KING League et memoire du trone</p>
          </div>

          <div className="tp-history-tabs" role="tablist" aria-label="Filtrer les matchs par statut">
            {tabMeta.map((tab) => {
              const active = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  className={`tp-history-tab ${active ? "tp-history-tab-active" : ""}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </motion.div>

        <div className="tp-history-main">
          <div className="tp-history-list">
            {paginatedMatches.length ? (
              paginatedMatches.map((match, index) => {
                const winner = getWinner(match);
                const isSelected = selectedMatch?.id === match.id;
                const player1Status = getFighterStatus(match, match.player1.id, now);
                const player2Status = getFighterStatus(match, match.player2.id, now);

                return (
                  <motion.article
                    key={match.id}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    className={`tp-history-card ${isSelected ? "tp-history-card-active" : ""}`}
                  >
                    <div className="tp-history-card-main">
                      <div className="tp-history-fighter tp-history-fighter-left">
                        {winner?.id === match.player1.id ? (
                          <span className="tp-history-crown"><Crown className="h-4 w-4" /></span>
                        ) : null}
                        <Image src={match.player1.logoUrl} alt={match.player1.pseudo} width={72} height={72} className="tp-history-avatar" />
                        <div className="tp-history-fighter-copy">
                          <div className="tp-history-name-row">
                            <CountryFlag countryCode={match.player1.countryCode} className="tp-history-flag" />
                            <span className="tp-history-name" title={match.player1.pseudo}>{match.player1.pseudo}</span>
                          </div>
                          <div className="tp-history-id">ID. {match.player1.freefireId}</div>
                          <span className={`tp-history-pill ${player1Status.className}`}>{player1Status.label}</span>
                        </div>
                      </div>

                      <div className="tp-history-versus">VS</div>

                      <div className="tp-history-fighter tp-history-fighter-right">
                        {winner?.id === match.player2.id ? (
                          <span className="tp-history-crown tp-history-crown-right"><Crown className="h-4 w-4" /></span>
                        ) : null}
                        <Image src={match.player2.logoUrl} alt={match.player2.pseudo} width={72} height={72} className="tp-history-avatar" />
                        <div className="tp-history-fighter-copy">
                          <div className="tp-history-name-row">
                            <CountryFlag countryCode={match.player2.countryCode} className="tp-history-flag" />
                            <span className="tp-history-name" title={match.player2.pseudo}>{match.player2.pseudo}</span>
                          </div>
                          <div className="tp-history-id">ID. {match.player2.freefireId}</div>
                          <span className={`tp-history-pill ${player2Status.className}`}>{player2Status.label}</span>
                        </div>
                      </div>
                    </div>

                    <div className="tp-history-card-side">
                      <div className="tp-history-card-side-meta">
                        <div className="tp-history-date">{formatHistoryDate(match.date)}</div>
                        <div className="tp-history-time">{formatHistoryTime(match.date)}</div>
                      </div>
                      <button type="button" className="tp-history-detail-button" onClick={() => setSelectedMatchId(match.id)}>
                        <Eye className="h-4 w-4" />
                        Fiche
                      </button>
                    </div>
                  </motion.article>
                );
              })
            ) : (
              <div className="tp-history-empty">Aucun duel n'est encore visible dans cette section.</div>
            )}
          </div>

          <aside className="tp-history-detail-panel">
            {selectedMatch ? (
              <>
                <div className="tp-history-detail-head">
                  <div>
                    <div className="tp-history-detail-kicker">{selectedMatch.sourceType === "CHALLENGE" ? "Lecture officielle du defi" : "Lecture officielle du duel"}</div>
                    <div className="tp-history-detail-status">
                      {selectedMatch.sourceType === "CHALLENGE"
                        ? selectedMatch.challengeStatus === "ACCEPTED"
                          ? "Defi accepte en attente de duel"
                          : "Defi depose en attente de confirmation"
                        : selectedMatch.status === "FINISHED"
                          ? "Résultat validé"
                          : selectedMatch.status === "LIVE"
                            ? "Affrontement en direct"
                            : "Match programmé"}
                    </div>
                  </div>
                  <span className={`tp-history-state-chip tp-history-state-chip-${selectedMatch.status.toLowerCase()}`}>
                    {selectedMatch.sourceType === "CHALLENGE"
                      ? selectedMatch.challengeStatus === "ACCEPTED"
                        ? "Defi confirme"
                        : "Defi en attente"
                      : selectedMatch.status === "FINISHED"
                        ? "Archive validee"
                        : selectedMatch.status === "LIVE"
                          ? "En cours"
                          : "Programme"}
                  </span>
                </div>

                <div className="tp-history-detail-scoreboard">
                  <div className="tp-history-detail-player">
                    <Image src={selectedMatch.player1.logoUrl} alt={selectedMatch.player1.pseudo} width={84} height={84} className="tp-history-detail-avatar" />
                    <div className="tp-history-detail-name">{selectedMatch.player1.pseudo}</div>
                    <div className="tp-history-detail-id">ID. {selectedMatch.player1.freefireId}</div>
                  </div>

                  <div className="tp-history-detail-center">
                    <div className="tp-history-detail-vs">VS</div>
                    <div className="tp-history-detail-meta">
                      <CalendarDays className="h-4 w-4" />
                      <span>{formatHistoryDate(selectedMatch.date)} • {formatHistoryTime(selectedMatch.date)}</span>
                    </div>
                  </div>

                  <div className="tp-history-detail-player">
                    <Image src={selectedMatch.player2.logoUrl} alt={selectedMatch.player2.pseudo} width={84} height={84} className="tp-history-detail-avatar" />
                    <div className="tp-history-detail-name">{selectedMatch.player2.pseudo}</div>
                    <div className="tp-history-detail-id">ID. {selectedMatch.player2.freefireId}</div>
                  </div>
                </div>

                <div className="tp-history-detail-grid">
                  <div className="tp-history-detail-block">
                    <div className="tp-history-detail-label">Verdict</div>
                    <div className="tp-history-detail-value">
                      {selectedMatch.sourceType === "CHALLENGE"
                        ? selectedMatch.challengeStatus === "ACCEPTED"
                          ? "Le defi a ete accepte. Il attend maintenant la creation ou la validation du duel officiel."
                          : "Le defi a ete depose et reste en attente de traitement ou de confirmation."
                        : selectedMatch.status === "FINISHED"
                          ? `${getWinner(selectedMatch)?.pseudo ?? "Aucun"} a impose sa loi dans le duel`
                          : selectedMatch.status === "LIVE"
                            ? "Le duel est en cours de validation en direct"
                            : `Début dans ${formatCountdown(new Date(selectedMatch.date).getTime() - now)}`}
                    </div>
                  </div>

                  <div className="tp-history-detail-block">
                    <div className="tp-history-detail-label">Impact</div>
                    <div className="tp-history-detail-value">
                      {selectedMatch.sourceType === "CHALLENGE"
                        ? "Aucun score n'est encore applique. Les effets classement et credits arriveront seulement apres creation puis validation du match."
                        : selectedMatch.status === "FINISHED"
                          ? "Le classement et les crédits ont été mis à jour automatiquement."
                          : "Dès validation, le classement et les credits seront recalcules automatiquement."}
                    </div>
                  </div>
                </div>

                <div className="tp-history-detail-actions">
                  <span className="tp-history-detail-hint"><CircleDot className="h-4 w-4" /> Archive officielle 1v1 KING League</span>
                  <button type="button" className="tp-history-detail-cta">
                    <Swords className="h-4 w-4" />
                    {selectedMatch.sourceType === "CHALLENGE"
                      ? selectedMatch.challengeStatus === "ACCEPTED"
                        ? "Surveiller la programmation"
                        : "Attendre la reponse"
                      : selectedMatch.status === "FINISHED"
                        ? "Relire le duel"
                        : selectedMatch.status === "LIVE"
                          ? "Suivre l'affrontement"
                          : "Entrer en veille"}
                  </button>
                </div>
              </>
            ) : null}
          </aside>
        </div>

        {totalPages > 1 ? (
          <div className="tp-history-pagination">
            <button type="button" className="tp-history-page-nav" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1}>
              <ChevronLeft className="h-4 w-4" />
            </button>

            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
              <button
                key={page}
                type="button"
                className={`tp-history-page-number ${page === currentPage ? "tp-history-page-number-active" : ""}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}

            <button type="button" className="tp-history-page-nav" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages}>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

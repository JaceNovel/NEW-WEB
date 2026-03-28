"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type PlayerOpt = { id: string; pseudo: string; freefireId: string; gameMode?: string; logoUrl?: string };
type ChallengeRow = {
  id: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "FINISHED";
  createdAt: string;
  challengerId: string;
  defenderId: string;
  challenger: PlayerOpt;
  defender: PlayerOpt;
};
type MatchRow = {
  id: string;
  status: "PENDING" | "LIVE" | "FINISHED";
  date: string;
  player1: PlayerOpt;
  player2: PlayerOpt;
  winnerId: string | null;
};

export default function AdminMatchManager({
  players,
  challenges,
  matches,
}: {
  players: PlayerOpt[];
  challenges: ChallengeRow[];
  matches: MatchRow[];
}) {
  const router = useRouter();
  const [player1Id, setPlayer1Id] = useState(players[0]?.id ?? "");
  const [player2Id, setPlayer2Id] = useState(players[1]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [challengeStatusFilter, setChallengeStatusFilter] = useState<ChallengeRow["status"] | "ALL">("ALL");
  const [matchStatusFilter, setMatchStatusFilter] = useState<MatchRow["status"] | "ALL">("ALL");
  const [quickMatchId, setQuickMatchId] = useState("");
  const [quickWinnerId, setQuickWinnerId] = useState("");
  const [quickStatus, setQuickStatus] = useState<"LIVE" | "FINISHED">("FINISHED");

  const sortedMatches = useMemo(() => {
    return [...matches].sort((a, b) => b.date.localeCompare(a.date));
  }, [matches]);

  const sortedChallenges = useMemo(() => {
    return [...challenges].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [challenges]);

  const activeMatches = useMemo(() => {
    return sortedMatches.filter((match) => match.status !== "FINISHED");
  }, [sortedMatches]);

  const filteredChallenges = useMemo(() => {
    return sortedChallenges.filter((challenge) => {
      const target = `${challenge.challenger.pseudo} ${challenge.challenger.freefireId} ${challenge.defender.pseudo} ${challenge.defender.freefireId}`.toLowerCase();
      const matchesQuery = target.includes(query.toLowerCase());
      const matchesStatus = challengeStatusFilter === "ALL" ? true : challenge.status === challengeStatusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [challengeStatusFilter, query, sortedChallenges]);

  const filteredMatches = useMemo(() => {
    return sortedMatches.filter((match) => {
      const target = `${match.player1.pseudo} ${match.player1.freefireId} ${match.player2.pseudo} ${match.player2.freefireId}`.toLowerCase();
      const matchesQuery = target.includes(query.toLowerCase());
      const matchesStatus = matchStatusFilter === "ALL" ? true : match.status === matchStatusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [matchStatusFilter, query, sortedMatches]);

  const quickMatch = useMemo(() => {
    return activeMatches.find((match) => match.id === quickMatchId) ?? null;
  }, [activeMatches, quickMatchId]);

  useEffect(() => {
    if (!activeMatches.length) {
      setQuickMatchId("");
      setQuickWinnerId("");
      return;
    }

    setQuickMatchId((current) => (activeMatches.some((match) => match.id === current) ? current : activeMatches[0].id));
  }, [activeMatches]);

  useEffect(() => {
    if (!quickMatch) {
      setQuickWinnerId("");
      return;
    }

    if (quickWinnerId === quickMatch.player1.id || quickWinnerId === quickMatch.player2.id) {
      return;
    }

    setQuickWinnerId(quickMatch.player1.id);
  }, [quickMatch, quickWinnerId]);

  async function createMatch() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/match/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ player1Id, player2Id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Erreur");
      if (json?.match?.id) {
        setQuickMatchId(json.match.id);
        setQuickWinnerId(json.match.player1?.id ?? player1Id);
        setQuickStatus("FINISHED");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function createMatchFromChallenge(challenge: ChallengeRow) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/match/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          player1Id: challenge.challengerId,
          player2Id: challenge.defenderId,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Erreur");
      if (json?.match?.id) {
        setQuickMatchId(json.match.id);
        setQuickWinnerId(json.match.player1?.id ?? challenge.challengerId);
        setQuickStatus("FINISHED");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function setResult(matchId: string, winnerId: string, status: "LIVE" | "FINISHED") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/match/result", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ matchId, winnerId, status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Erreur");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function validateQuickResult() {
    if (!quickMatch || !quickWinnerId) {
      setError("Choisis un match et un gagnant.");
      return;
    }

    await setResult(quickMatch.id, quickWinnerId, quickStatus);
  }

  async function cancelMatch(matchId: string) {
    if (!confirm("Annuler ce match programmé ?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/match/cancel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ matchId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Erreur");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function rescheduleMatch(matchId: string) {
    if (!confirm("Reporter ce match au prochain créneau disponible ?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/match/reschedule", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ matchId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Erreur");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un défi ou un match..." className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none placeholder:text-slate-400" />
          <select value={challengeStatusFilter} onChange={(e) => setChallengeStatusFilter(e.target.value as ChallengeRow["status"] | "ALL")} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none">
            <option value="ALL">Tous les défis</option>
            <option value="PENDING">Défis en attente</option>
            <option value="ACCEPTED">Défis acceptés</option>
            <option value="REJECTED">Défis refusés</option>
            <option value="FINISHED">Défis terminés</option>
          </select>
          <select value={matchStatusFilter} onChange={(e) => setMatchStatusFilter(e.target.value as MatchRow["status"] | "ALL")} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none">
            <option value="ALL">Tous les matchs</option>
            <option value="PENDING">Matchs planifiés</option>
            <option value="LIVE">Matchs en cours</option>
            <option value="FINISHED">Matchs terminés</option>
          </select>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-bold text-slate-950">Tous les défis</div>
            <div className="text-sm text-slate-500">Les défis envoyés apparaissent ici. Les matchs démarrent à partir de 21h00 GMT et s'enchaînent jusqu'à ce que tous les joueurs puissent passer.</div>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            {sortedChallenges.length} défis
          </div>
        </div>

        {error ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <div className="mt-5 space-y-3">
            {filteredChallenges.length ? (
            filteredChallenges.map((challenge) => (
              <div key={challenge.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      {challenge.status} • {new Date(challenge.createdAt).toLocaleString("fr-FR")}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-slate-950">
                      <span className="font-bold">{challenge.challenger.pseudo}</span>
                      <span className="text-lg font-black text-transparent [background:linear-gradient(180deg,#ffd4ae_0%,#ff8fd8_100%)] [-webkit-background-clip:text] [background-clip:text]">VS</span>
                      <span className="font-bold">{challenge.defender.pseudo}</span>
                      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-500">
                        {challenge.challenger.gameMode ?? "Mode inconnu"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button disabled={busy || challenge.status === "FINISHED"} onClick={() => void createMatchFromChallenge(challenge)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60">
                      Créer le match
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-slate-500">Aucun défi ne correspond aux filtres.</div>
          )}
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-lg font-bold text-slate-950">Créer un match</div>
        <div className="mt-1 text-sm text-slate-500">Le créneau est attribué automatiquement à partir de 21h00 GMT, puis continue par ordre jusqu'à ce que tous les matchs puissent être joués.</div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-500">Joueur 1</label>
            <select value={player1Id} onChange={(e) => setPlayer1Id(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none">
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.pseudo} ({p.freefireId})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-500">Joueur 2</label>
            <select value={player2Id} onChange={(e) => setPlayer2Id(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none">
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.pseudo} ({p.freefireId})
                </option>
              ))}
            </select>
          </div>
        </div>
        {error ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        <div className="mt-5 flex justify-end">
          <button disabled={busy} onClick={() => void createMatch()} className="tp-button-primary disabled:opacity-60">
            Créer
          </button>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-lg font-bold text-slate-950">Validation rapide du gagnant</div>
        <div className="mt-1 text-sm text-slate-500">Après création, sélectionne le match, choisis le gagnant puis valide le statut sans passer par la liste complète.</div>

        {activeMatches.length ? (
          <>
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm text-slate-500">Match</label>
                <select value={quickMatchId} onChange={(e) => setQuickMatchId(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none">
                  {activeMatches.map((match) => (
                    <option key={match.id} value={match.id}>
                      {match.player1.pseudo} vs {match.player2.pseudo} ({new Date(match.date).toLocaleString("fr-FR")})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-500">Gagnant</label>
                <select value={quickWinnerId} onChange={(e) => setQuickWinnerId(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none" disabled={!quickMatch}>
                  {quickMatch ? (
                    [quickMatch.player1, quickMatch.player2].map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.pseudo} ({player.freefireId})
                      </option>
                    ))
                  ) : (
                    <option value="">Aucun match</option>
                  )}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-500">Statut à appliquer</label>
                <select value={quickStatus} onChange={(e) => setQuickStatus(e.target.value as "LIVE" | "FINISHED")} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none">
                  <option value="LIVE">Mettre en direct</option>
                  <option value="FINISHED">Valider en terminé</option>
                </select>
              </div>
            </div>

            {quickMatch ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Match sélectionné: <span className="font-bold text-slate-950">{quickMatch.player1.pseudo} vs {quickMatch.player2.pseudo}</span> le {new Date(quickMatch.date).toLocaleString("fr-FR")}
              </div>
            ) : null}

            <div className="mt-5 flex justify-end">
              <button disabled={busy || !quickMatch || !quickWinnerId} onClick={() => void validateQuickResult()} className="tp-button-primary disabled:opacity-60">
                Valider le gagnant
              </button>
            </div>
          </>
        ) : (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            Aucun match en attente ou en direct à valider pour le moment.
          </div>
        )}
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-lg font-bold text-slate-950">Tous les matchs et choix du gagnant</div>
        <div className="mt-1 text-sm text-slate-500">Quand un gagnant est validé en FINISHED, le classement et les crédits sont mis à jour automatiquement.</div>
        <div className="mt-4 space-y-3">
          {filteredMatches.length ? (
            filteredMatches.map((m) => (
              <div key={m.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="text-sm text-slate-700">
                    <div className="font-bold text-slate-950">
                      {m.player1.pseudo} vs {m.player2.pseudo}
                      <span className="ml-2 text-xs text-slate-500">({m.status})</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Date: {new Date(m.date).toLocaleString("fr-FR")} — Gagnant actuel: {m.winnerId === m.player1.id ? m.player1.pseudo : m.winnerId === m.player2.id ? m.player2.pseudo : "—"}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {m.status === "PENDING" ? (
                      <>
                        <button
                          disabled={busy}
                          onClick={() => void rescheduleMatch(m.id)}
                          className="tp-button-ghost disabled:opacity-60"
                        >
                          Reporter
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => void cancelMatch(m.id)}
                          className="tp-button-ghost disabled:opacity-60"
                        >
                          Annuler
                        </button>
                      </>
                    ) : null}
                    <button
                      disabled={busy}
                      onClick={() => void setResult(m.id, m.player1.id, "LIVE")}
                      className="tp-button-ghost disabled:opacity-60"
                    >
                      DIRECT: {m.player1.pseudo}
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => void setResult(m.id, m.player2.id, "LIVE")}
                      className="tp-button-ghost disabled:opacity-60"
                    >
                      DIRECT: {m.player2.pseudo}
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => void setResult(m.id, m.player1.id, "FINISHED")}
                      className="tp-button-ghost disabled:opacity-60"
                    >
                      FIN: {m.player1.pseudo}
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => void setResult(m.id, m.player2.id, "FINISHED")}
                      className="tp-button-ghost disabled:opacity-60"
                    >
                      FIN: {m.player2.pseudo}
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-slate-500">Aucun match ne correspond aux filtres.</div>
          )}
        </div>
      </div>
    </div>
  );
}

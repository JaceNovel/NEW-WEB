"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type MatchHistoryRow = {
  id: string;
  status: "FINISHED";
  date: string;
  winnerId: string | null;
  player1: { id: string; pseudo: string; freefireId: string; logoUrl: string };
  player2: { id: string; pseudo: string; freefireId: string; logoUrl: string };
};

export default function AdminHistoryManager({ matches }: { matches: MatchHistoryRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "FINISHED">("FINISHED");

  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      const target = `${match.player1.pseudo} ${match.player1.freefireId} ${match.player2.pseudo} ${match.player2.freefireId}`.toLowerCase();
      const matchesQuery = target.includes(query.toLowerCase());
      const matchesStatus = statusFilter === "ALL" ? true : match.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [matches, query, statusFilter]);

  async function updateWinner(matchId: string, winnerId: string) {
    setBusyId(matchId);
    setError(null);
    try {
      const res = await fetch("/api/match/result", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ matchId, winnerId, status: "FINISHED" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Erreur");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="tp-glass rounded-3xl p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-lg font-bold text-white">Historique des matchs joués</div>
          <div className="text-sm text-white/60">Tous les matchs déjà joués sont archivés ici. Tu peux encore corriger le gagnant si besoin.</div>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white/55">
          {matches.length} matchs terminés
        </div>
      </div>

      {error ? <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div> : null}

      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un match archivé..." className="tp-input" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "ALL" | "FINISHED")} className="tp-input">
          <option value="FINISHED">Terminés</option>
          <option value="ALL">Tous les archivés</option>
        </select>
      </div>

      <div className="mt-5 space-y-3">
        {filteredMatches.length ? (
          filteredMatches.map((match) => {
            const winnerName = match.winnerId === match.player1.id ? match.player1.pseudo : match.winnerId === match.player2.id ? match.player2.pseudo : "—";

            return (
              <div key={match.id} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-white/45">{new Date(match.date).toLocaleString("fr-FR")}</div>
                    <div className="mt-2 text-base font-bold text-white">
                      {match.player1.pseudo} <span className="mx-2 bg-[linear-gradient(180deg,#ffd4ae_0%,#ff8fd8_100%)] bg-clip-text text-transparent">VS</span> {match.player2.pseudo}
                    </div>
                    <div className="mt-1 text-sm text-white/60">Gagnant enregistré: {winnerName}</div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button disabled={busyId === match.id} onClick={() => void updateWinner(match.id, match.player1.id)} className="tp-button-ghost disabled:opacity-60">
                      Gagnant: {match.player1.pseudo}
                    </button>
                    <button disabled={busyId === match.id} onClick={() => void updateWinner(match.id, match.player2.id)} className="tp-button-ghost disabled:opacity-60">
                      Gagnant: {match.player2.pseudo}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-sm text-white/50">Aucun match archivé ne correspond aux filtres.</div>
        )}
      </div>
    </div>
  );
}
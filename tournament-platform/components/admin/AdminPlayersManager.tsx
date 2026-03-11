"use client";

import { useEffect, useState } from "react";

type PlayerRow = {
  id: string;
  pseudo: string;
  freefireId: string;
  countryCode: string;
  gameMode: string;
  logoUrl: string;
  credits: number;
  status: string;
  wins: number;
  losses: number;
  isSeededTop10?: boolean;
  finalRank?: number | null;
  createdAt: string;
};

export default function AdminPlayersManager() {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [modeFilter, setModeFilter] = useState("ALL");

  async function load() {
    setError(null);
    const res = await fetch("/api/player/list");
    const json = await res.json();
    if (!res.ok) {
      setError(json?.error ?? "Erreur");
      return;
    }
    setPlayers(json.players);
  }

  useEffect(() => {
    void load();
  }, []);

  const modes = [...new Set(players.map((player) => player.gameMode).filter(Boolean))].sort((left, right) => left.localeCompare(right));

  const filteredPlayers = players.filter((player) => {
    const target = `${player.pseudo} ${player.freefireId} ${player.gameMode} ${player.countryCode}`.toLowerCase();
    const matchesQuery = target.includes(query.toLowerCase());
    const matchesStatus = statusFilter === "ALL" ? true : player.status === statusFilter;
    const matchesMode = modeFilter === "ALL" ? true : player.gameMode === modeFilter;
    return matchesQuery && matchesStatus && matchesMode;
  });

  async function updateCredits(playerId: string, delta: number) {
    setBusyId(playerId);
    setError(null);
    try {
      const res = await fetch("/api/credit/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ playerId, delta }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Erreur");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusyId(null);
    }
  }

  async function ban(playerId: string) {
    setBusyId(playerId);
    setError(null);
    try {
      const res = await fetch("/api/credit/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ playerId, setCredits: 0 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Erreur");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(playerId: string) {
    if (!confirm("Supprimer ce joueur ?")) return;
    setBusyId(playerId);
    setError(null);
    try {
      const res = await fetch("/api/player/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Erreur");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="tp-glass rounded-3xl p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-lg font-bold text-white">Tous les joueurs inscrits</div>
          <div className="text-sm text-white/60">Liste complète des inscrits avec crédits, statut, bilan et actions</div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un joueur..." className="tp-input min-w-[260px]" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="tp-input min-w-[180px]">
            <option value="ALL">Tous les statuts</option>
            {[...new Set(players.map((player) => player.status))].sort((left, right) => left.localeCompare(right)).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)} className="tp-input min-w-[180px]">
            <option value="ALL">Tous les modes</option>
            {modes.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
          <button onClick={() => void load()} className="tp-button-ghost">
            Rafraîchir
          </button>
        </div>
      </div>

      {error ? <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div> : null}

      <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
        <table className="min-w-[980px] w-full text-left text-sm">
          <thead className="bg-slate-950/60 text-xs uppercase tracking-wider text-white/60">
            <tr>
              <th className="px-4 py-3">Logo</th>
              <th className="px-4 py-3">Pseudo</th>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Mode</th>
              <th className="px-4 py-3">Crédits</th>
              <th className="px-4 py-3">Bilan</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Inscription</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {filteredPlayers.map((p) => (
              <tr key={p.id} className="hover:bg-white/5">
                <td className="px-4 py-3">
                  <img src={p.logoUrl} alt={p.pseudo} className="h-12 w-12 rounded-2xl border border-white/10 bg-black/20 object-contain p-1" />
                </td>
                <td className="px-4 py-3 text-white">
                  <div className="font-bold">{p.pseudo}</div>
                  <div className="text-xs text-white/45">{p.countryCode}</div>
                </td>
                <td className="px-4 py-3 text-white/70">{p.freefireId}</td>
                <td className="px-4 py-3 text-white/70">{p.gameMode}</td>
                <td className="px-4 py-3 text-white">{p.credits}</td>
                <td className="px-4 py-3 text-white/70">
                  {p.wins}V / {p.losses}D
                </td>
                <td className="px-4 py-3 text-white/70">
                  <div>{p.status}</div>
                  {p.isSeededTop10 ? <div className="text-xs text-amber-200/80">Top 10</div> : null}
                  {p.finalRank ? <div className="text-xs text-fuchsia-200/80">Rang final #{p.finalRank}</div> : null}
                </td>
                <td className="px-4 py-3 text-white/60">{new Date(p.createdAt).toLocaleDateString("fr-FR")}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button disabled={busyId === p.id} onClick={() => void updateCredits(p.id, +1)} className="tp-button-ghost disabled:opacity-60">
                      +1
                    </button>
                    <button disabled={busyId === p.id} onClick={() => void updateCredits(p.id, -1)} className="tp-button-ghost disabled:opacity-60">
                      -1
                    </button>
                    <button disabled={busyId === p.id} onClick={() => void ban(p.id)} className="tp-button-ghost disabled:opacity-60">
                      Bannir
                    </button>
                    <button disabled={busyId === p.id} onClick={() => void remove(p.id)} className="tp-button-ghost disabled:opacity-60">
                      Supprimer
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!filteredPlayers.length ? <div className="mt-4 text-sm text-white/45">Aucun joueur ne correspond à la recherche.</div> : null}
    </div>
  );
}

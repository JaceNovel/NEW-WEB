"use client";

import { useEffect, useState } from "react";
import { Coins, Copy, RefreshCw, Search, ShieldAlert, Trash2, Trophy, Users } from "lucide-react";

type PlayerRow = {
  id: string;
  pseudo: string;
  email: string | null;
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [modeFilter, setModeFilter] = useState("ALL");

  async function load() {
    setError(null);
    const res = await fetch("/api/player/list", { cache: "no-store" });
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
    const target = `${player.pseudo} ${player.email ?? ""} ${player.freefireId} ${player.gameMode} ${player.countryCode}`.toLowerCase();
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

    const previousPlayers = players;
    setPlayers((current) => current.filter((player) => player.id !== playerId));
    setBusyId(playerId);
    setError(null);

    try {
      const res = await fetch("/api/player/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      const json = await res.json();
      if (!res.ok && res.status !== 404) {
        throw new Error(json?.error ?? "Erreur");
      }
      if (res.status === 404) {
        setError("Ce joueur etait deja supprime. La liste a ete synchronisee.");
      }
      await load();
    } catch (e) {
      setPlayers(previousPlayers);
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusyId(null);
    }
  }

  async function copyEmail(playerId: string, email: string | null) {
    if (!email) {
      setError("Aucun email disponible pour ce joueur.");
      return;
    }

    try {
      await navigator.clipboard.writeText(email);
      setCopiedId(playerId);
      setError(null);
      window.setTimeout(() => {
        setCopiedId((current) => (current === playerId ? null : current));
      }, 1800);
    } catch {
      setError("Impossible de copier l'email.");
    }
  }

  const totalCredits = filteredPlayers.reduce((sum, player) => sum + player.credits, 0);
  const roiCount = filteredPlayers.filter((player) => player.status === "ROI").length;
  const top10Count = filteredPlayers.filter((player) => player.isSeededTop10).length;

  return (
    <section className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Joueurs visibles</div>
              <div className="mt-3 text-4xl font-black text-slate-950">{filteredPlayers.length}</div>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <Users className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-500">Résultat courant selon les filtres actifs.</p>
        </article>

        <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Crédits cumulés</div>
              <div className="mt-3 text-4xl font-black text-slate-950">{totalCredits}</div>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <Coins className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-500">Total des crédits des joueurs listés.</p>
        </article>

        <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">ROI actifs</div>
              <div className="mt-3 text-4xl font-black text-slate-950">{roiCount}</div>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <Trophy className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-500">Joueurs actuellement marqués ROI.</p>
        </article>

        <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Top 10 seedés</div>
              <div className="mt-3 text-4xl font-black text-slate-950">{top10Count}</div>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
              <ShieldAlert className="h-6 w-6" />
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-500">Joueurs protégés dans la phase Top 10.</p>
        </article>
      </div>

      <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-2xl font-black tracking-tight text-slate-950">Tous les joueurs inscrits</div>
            <div className="mt-1 text-sm text-slate-500">Liste complète des inscrits avec crédits, statut, bilan et actions admin.</div>
          </div>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <label className="flex min-w-[260px] items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un joueur..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="min-w-[180px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none">
            <option value="ALL">Tous les statuts</option>
            {[...new Set(players.map((player) => player.status))].sort((left, right) => left.localeCompare(right)).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
            <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)} className="min-w-[180px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none">
            <option value="ALL">Tous les modes</option>
            {modes.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
            <button onClick={() => void load()} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
              <RefreshCw className="h-4 w-4" />
              Rafraîchir
            </button>
          </div>
        </div>

        {error ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <div className="mt-5 overflow-x-auto rounded-[26px] border border-slate-200">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Pseudo</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Mode</th>
              <th className="px-4 py-3">Bilan</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
            {filteredPlayers.map((p) => (
              <tr key={p.id} className="transition hover:bg-slate-50/80">
                <td className="px-4 py-3 text-slate-900">
                  <div className="font-bold">{p.pseudo}</div>
                  <div className="text-xs text-slate-400">Compte joueur</div>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <div className="flex items-center gap-2">
                    <div className="max-w-[240px] break-all">{p.email ?? "-"}</div>
                    <button
                      type="button"
                      disabled={!p.email}
                      onClick={() => void copyEmail(p.id, p.email)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {copiedId === p.id ? "Copié" : "Copier"}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">{p.gameMode}</td>
                <td className="px-4 py-3 text-slate-600">
                  {p.wins}V / {p.losses}D
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button disabled={busyId === p.id} onClick={() => void updateCredits(p.id, +1)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
                      +1
                    </button>
                    <button disabled={busyId === p.id} onClick={() => void updateCredits(p.id, -1)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
                      -1
                    </button>
                    <button disabled={busyId === p.id} onClick={() => void ban(p.id)} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 transition hover:bg-amber-100 disabled:opacity-60">
                      Bannir
                    </button>
                    <button disabled={busyId === p.id} onClick={() => void remove(p.id)} className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-60">
                      <Trash2 className="h-3.5 w-3.5" />
                      Supprimer
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

        {!filteredPlayers.length ? <div className="mt-4 text-sm text-slate-500">Aucun joueur ne correspond à la recherche.</div> : null}
      </div>
    </section>
  );
}

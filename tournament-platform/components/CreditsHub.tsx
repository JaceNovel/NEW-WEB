"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, ShoppingBag, Sparkles, Swords, Trophy, UserPlus2 } from "lucide-react";

type CreditPackView = {
  key: string;
  label: string;
  credits: number;
  priceFcfa: number;
  limit: number | null;
  description: string;
  usedCount: number;
};

type MarketPlayer = {
  id: string;
  pseudo: string;
  freefireId: string;
  logoUrl: string;
  credits: number;
  points: number;
  wins: number;
  rankingPosition: number;
  recruitmentCost: number;
  recruitedPlayers: Array<{ id: string; pseudo: string }>;
};

type CurrentPlayer = {
  id: string;
  pseudo: string;
  credits: number;
  points: number;
  gameMode: string;
  recruitedPlayers: Array<{ id: string; pseudo: string; logoUrl: string; freefireId: string; alliancePending: boolean }>;
  purchasedBy: { pseudo: string } | null;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export default function CreditsHub({
  currentPlayer,
  packs,
  marketPlayers,
}: {
  currentPlayer: CurrentPlayer;
  packs: CreditPackView[];
  marketPlayers: MarketPlayer[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredPlayers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return marketPlayers.slice(0, 3);
    return marketPlayers.filter((player) => {
      return player.pseudo.toLowerCase().includes(needle) || player.freefireId.toLowerCase().includes(needle);
    });
  }, [marketPlayers, query]);

  async function buyPack(packKey: string) {
    setLoadingKey(packKey);
    setError(null);
    try {
      const res = await fetch("/api/credit/purchase", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ packKey }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Achat impossible");
      router.refresh();
    } catch (purchaseError) {
      setError(purchaseError instanceof Error ? purchaseError.message : "Achat impossible");
    } finally {
      setLoadingKey(null);
    }
  }

  async function buyPlayer(targetPlayerId: string) {
    setLoadingKey(targetPlayerId);
    setError(null);
    try {
      const res = await fetch("/api/player/buy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetPlayerId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Recrutement impossible");
      router.refresh();
    } catch (purchaseError) {
      setError(purchaseError instanceof Error ? purchaseError.message : "Recrutement impossible");
    } finally {
      setLoadingKey(null);
    }
  }

  const acceptedRecruit = currentPlayer.recruitedPlayers.find((player) => !player.alliancePending) ?? null;
  const pendingRecruit = currentPlayer.recruitedPlayers.find((player) => player.alliancePending) ?? null;
  const hasAnyRecruit = currentPlayer.recruitedPlayers.length > 0;

  return (
    <main className="relative mx-auto max-w-[1280px] px-4 py-8 sm:py-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-90 [background:radial-gradient(900px_circle_at_15%_10%,rgba(255,136,81,0.18),transparent_38%),radial-gradient(820px_circle_at_85%_0%,rgba(79,220,255,0.16),transparent_32%),radial-gradient(900px_circle_at_50%_12%,rgba(202,92,255,0.18),transparent_38%)]" />

      <section className="relative overflow-hidden rounded-[32px] border border-fuchsia-300/18 bg-[linear-gradient(140deg,rgba(63,19,97,0.92),rgba(17,18,58,0.84)_42%,rgba(6,36,96,0.82))] p-5 shadow-[0_0_48px_rgba(140,66,255,0.18)] sm:p-7">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,171,92,0.12),transparent_26%),radial-gradient(circle_at_top_right,rgba(92,224,255,0.12),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_28%)]" />
        <div className="relative grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-white/75">
              <Sparkles className="h-4 w-4 text-cyan-300" />
              PRIME League Credit Market
            </div>
            <h1 className="mt-4 text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">Crédits et Renforts</h1>
            <p className="mt-4 max-w-2xl text-sm text-white/70 sm:text-base">
              Renforce ta position, recrute un joueur avec ton capital et alimente ta progression avec une boutique pensée pour la PRIME League.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 backdrop-blur-md">
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/45">Tes crédits</div>
                <div className="mt-3 text-3xl font-black text-amber-100">{currentPlayer.credits}</div>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 backdrop-blur-md">
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/45">Tes points</div>
                <div className="mt-3 text-3xl font-black text-cyan-100">{currentPlayer.points}</div>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 backdrop-blur-md">
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/45">Mode</div>
                <div className="mt-3 text-3xl font-black text-white">{currentPlayer.gameMode}</div>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-black/20 p-5 backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-black uppercase tracking-[0.2em] text-white">Position consolidée</div>
                <div className="mt-2 text-sm text-white/60">Une alliance te permet de tenir une position a deux.</div>
              </div>
              <img src="https://img.icons8.com/?size=100&id=ylmrPU9Ov4OS&format=png&color=000000" alt="Alliance" className="h-14 w-14 rounded-2xl bg-white/90 p-2" />
            </div>

            <div className="mt-5 space-y-3">
              {currentPlayer.purchasedBy ? (
                <div className="rounded-[20px] border border-cyan-300/18 bg-cyan-300/10 px-4 py-4 text-sm text-cyan-50">
                  Tu renforces actuellement la position de <span className="font-black">{currentPlayer.purchasedBy.pseudo}</span>.
                </div>
              ) : null}

              {acceptedRecruit ? (
                <div className="rounded-[22px] border border-amber-300/18 bg-amber-300/10 px-4 py-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-100/70">Alliance active</div>
                  <div className="mt-2 text-2xl font-black text-white">{currentPlayer.pseudo} X {acceptedRecruit.pseudo}</div>
                  <div className="mt-2 text-sm text-white/65">Si cette place est défiée, elle est considérée comme une position renforcée.</div>
                </div>
              ) : pendingRecruit ? (
                <div className="rounded-[22px] border border-cyan-300/18 bg-cyan-300/10 px-4 py-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-100/70">Demande envoyée</div>
                  <div className="mt-2 text-2xl font-black text-white">{currentPlayer.pseudo} → {pendingRecruit.pseudo}</div>
                  <div className="mt-2 text-sm text-white/65">En attente de la réponse du joueur.</div>
                </div>
              ) : (
                <div className="rounded-[22px] border border-fuchsia-300/18 bg-fuchsia-300/10 px-4 py-4 text-sm text-white/72">
                  Débloque l&apos;achat de joueur à partir de <span className="font-black text-white">20 crédits</span>. Top 10: <span className="font-black text-amber-100">18 crédits</span>. Hors top 10: <span className="font-black text-cyan-100">13 crédits</span>.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {error ? <div className="mt-5 rounded-[20px] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

      <section className="mt-7 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[28px] border border-fuchsia-300/16 bg-[linear-gradient(180deg,rgba(20,11,41,0.92),rgba(10,12,32,0.82))] p-5 shadow-[0_0_42px_rgba(120,72,255,0.12)]">
          <div className="flex items-center gap-3 text-white">
            <ShoppingBag className="h-5 w-5 text-amber-300" />
            <div>
              <h2 className="text-xl font-black uppercase tracking-[0.14em]">Boutique de crédits</h2>
              <p className="mt-1 text-sm text-white/55">1 crédit = 500 FCFA, avec un pack secours limité à trois achats.</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {packs.map((pack, index) => (
              <motion.article
                key={pack.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: index * 0.04 }}
                className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">{pack.label}</div>
                    <div className="mt-2 text-3xl font-black text-white">{pack.credits} <span className="text-lg text-cyan-200">crédits</span></div>
                    <div className="mt-2 text-sm text-white/62">{pack.description}</div>
                  </div>
                  <div className="rounded-[18px] border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-right">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-100/65">Prix</div>
                    <div className="mt-1 text-xl font-black text-amber-100">{formatNumber(pack.priceFcfa)} FCFA</div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="text-xs text-white/45">
                    {pack.limit !== null ? `${pack.usedCount}/${pack.limit} achats utilisés` : "Achat illimité"}
                  </div>
                  <button
                    type="button"
                    disabled={loadingKey === pack.key || (pack.limit !== null && pack.usedCount >= pack.limit)}
                    onClick={() => buyPack(pack.key)}
                    className="rounded-[14px] border border-cyan-300/20 bg-[linear-gradient(180deg,rgba(62,87,255,0.28),rgba(22,35,88,0.22))] px-4 py-2 text-sm font-black uppercase tracking-[0.14em] text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loadingKey === pack.key ? "Traitement..." : "Acheter"}
                  </button>
                </div>
              </motion.article>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-cyan-300/14 bg-[linear-gradient(180deg,rgba(10,12,32,0.94),rgba(18,11,39,0.84))] p-5 shadow-[0_0_42px_rgba(72,174,255,0.12)]">
          <div className="flex items-center gap-3 text-white">
            <UserPlus2 className="h-5 w-5 text-cyan-300" />
            <div>
              <h2 className="text-xl font-black uppercase tracking-[0.14em]">Acheter un joueur</h2>
              <p className="mt-1 text-sm text-white/55">Recherche par pseudo ou ID Free Fire puis consolide ta place avec un renfort.</p>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3 rounded-[20px] border border-white/10 bg-black/20 px-4 py-3">
            <Search className="h-4 w-4 text-fuchsia-200/70" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Chercher un joueur par pseudo ou ID"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
            />
          </div>

          <div className="mt-5 space-y-3">
            {filteredPlayers.length ? (
              filteredPlayers.map((player, index) => (
                <motion.article
                  key={player.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: index * 0.03 }}
                  className="grid gap-4 rounded-[22px] border border-white/10 bg-white/[0.04] p-4 lg:grid-cols-[1fr_auto] lg:items-center"
                >
                  <div className="flex items-center gap-4">
                    <img src={player.logoUrl} alt={player.pseudo} className="h-16 w-16 rounded-[18px] border border-white/10 bg-black/20 object-contain p-2" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-lg font-black text-white">{player.pseudo}</div>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/65">#{player.rankingPosition}</span>
                        {player.rankingPosition <= 10 ? <span className="rounded-full border border-amber-300/18 bg-amber-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-100">Top 10</span> : null}
                      </div>
                      <div className="mt-1 text-sm text-white/55">ID {player.freefireId}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/52">
                        <span className="inline-flex items-center gap-1"><Trophy className="h-3.5 w-3.5 text-amber-300" /> {player.wins} victoires</span>
                        <span className="inline-flex items-center gap-1"><Sparkles className="h-3.5 w-3.5 text-cyan-300" /> {player.points} points</span>
                        <span className="inline-flex items-center gap-1"><Swords className="h-3.5 w-3.5 text-fuchsia-300" /> {player.credits} crédits</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-3 lg:items-end">
                    <div className="rounded-[16px] border border-fuchsia-300/16 bg-fuchsia-300/10 px-4 py-3 text-right">
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/48">Coût</div>
                      <div className="mt-1 text-xl font-black text-white">{player.recruitmentCost} crédits</div>
                    </div>
                    <button
                      type="button"
                      disabled={loadingKey === player.id || hasAnyRecruit || Boolean(currentPlayer.purchasedBy) || currentPlayer.credits < player.recruitmentCost || currentPlayer.credits < 20}
                      onClick={() => buyPlayer(player.id)}
                      className="rounded-[14px] border border-amber-300/20 bg-[linear-gradient(180deg,rgba(255,141,70,0.25),rgba(112,34,16,0.18))] px-4 py-2 text-sm font-black uppercase tracking-[0.14em] text-white disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {loadingKey === player.id ? "Achat..." : "Recruter"}
                    </button>
                  </div>
                </motion.article>
              ))
            ) : (
              <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-white/50">Aucun joueur ne correspond à cette recherche.</div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
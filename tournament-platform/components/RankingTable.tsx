"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUp, Crown, Gamepad2, Search, Shield, Skull, Swords } from "lucide-react";

import { getAllianceLabel } from "@/lib/economy";
import type { PlayerPublic } from "@/types/player";

function statusMeta(status: PlayerPublic["status"]) {
  switch (status) {
    case "ROI":
      return {
        label: "ROI",
        icon: <Crown className="h-5 w-5 text-amber-300" />,
        action: "DÉFIER",
        actionClass: "tp-ranking-action tp-ranking-action-primary",
      };
    case "CHALLENGER":
      return {
        label: "Challenger",
        icon: <Swords className="h-5 w-5 text-white/75" />,
        action: "DÉFIER",
        actionClass: "tp-ranking-action tp-ranking-action-secondary",
      };
    case "ELIMINATED":
      return {
        label: "Joueur",
        icon: <Skull className="h-5 w-5 text-rose-300" />,
        action: "DÉFIER",
        actionClass: "tp-ranking-action tp-ranking-action-danger",
      };
    default:
      return {
        label: "Joueur",
        icon: <Skull className="h-5 w-5 text-rose-300" />,
        action: "DÉFIER",
        actionClass: "tp-ranking-action tp-ranking-action-neutral",
      };
  }
}

export default function RankingTable({
  players,
  currentUserId,
}: {
  players: PlayerPublic[];
  currentUserId?: string | null;
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showClash, setShowClash] = useState(false);
  const [query, setQuery] = useState("");
  const roi = useMemo(() => players.find((p) => p.status === "ROI") ?? null, [players]);
  const currentUser = useMemo(() => players.find((p) => p.id === currentUserId) ?? null, [currentUserId, players]);
  const hasActiveChallenge = useMemo(() => players.some((p) => p.status === "CHALLENGER"), [players]);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const filteredPlayers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return players;

    return players.filter((player) => {
      const allianceLabel = getAllianceLabel(player.pseudo, player.recruitedPlayers?.[0]?.pseudo ?? null).toLowerCase();
      return player.pseudo.toLowerCase().includes(needle) || player.freefireId.toLowerCase().includes(needle) || allianceLabel.includes(needle);
    });
  }, [players, query]);

  useEffect(() => {
    function onScroll() {
      setShowBackToTop(window.scrollY > 320);
    }

    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    const row = rowRefs.current[currentUserId];
    if (!row) return;

    const timeoutId = window.setTimeout(() => {
      row.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [currentUserId, players]);

  function playClashSound() {
    if (typeof window === "undefined") return;

    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    master.connect(ctx.destination);

    const metallic = ctx.createOscillator();
    metallic.type = "triangle";
    metallic.frequency.setValueAtTime(880, now);
    metallic.frequency.exponentialRampToValueAtTime(180, now + 0.45);

    const metallicGain = ctx.createGain();
    metallicGain.gain.setValueAtTime(0.22, now);
    metallicGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    metallic.connect(metallicGain).connect(master);

    const spark = ctx.createOscillator();
    spark.type = "square";
    spark.frequency.setValueAtTime(1240, now);
    spark.frequency.exponentialRampToValueAtTime(520, now + 0.18);

    const sparkGain = ctx.createGain();
    sparkGain.gain.setValueAtTime(0.1, now);
    sparkGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    spark.connect(sparkGain).connect(master);

    metallic.start(now);
    spark.start(now);
    metallic.stop(now + 0.5);
    spark.stop(now + 0.2);

    window.setTimeout(() => {
      void ctx.close();
    }, 900);
  }

  async function challengeRoi() {
    if (!roi || !currentUser) return;
    setLoadingId(roi.id);
    setShowClash(true);
    playClashSound();
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 1250));
      const res = await fetch("/api/challenge/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ defenderId: roi.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Erreur");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur");
    } finally {
      window.setTimeout(() => setShowClash(false), 150);
      setLoadingId(null);
    }
  }

  return (
    <>
      {showClash && roi && currentUser ? (
        <div className="tp-challenge-clash-overlay" aria-hidden="true">
          <div className="tp-challenge-clash-flash" />
          <div className="tp-challenge-clash-arena">
            <div className="tp-challenge-clash-side tp-challenge-clash-side-left">
              <div className="tp-challenge-clash-label">Challenger</div>
              <img src={currentUser.logoUrl} alt="" className="tp-challenge-clash-logo" />
              <div className="tp-challenge-clash-name">{currentUser.pseudo}</div>
            </div>
            <div className="tp-challenge-clash-center">
              <div className="tp-challenge-clash-burst" />
              <Swords className="tp-challenge-clash-swords" />
            </div>
            <div className="tp-challenge-clash-side tp-challenge-clash-side-right">
              <div className="tp-challenge-clash-label">ROI</div>
              <img src={roi.logoUrl} alt="" className="tp-challenge-clash-logo" />
              <div className="tp-challenge-clash-name">{roi.pseudo}</div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mb-5 flex items-center gap-3 rounded-[22px] border border-white/10 bg-black/20 px-4 py-3 backdrop-blur-md">
        <Search className="h-4 w-4 text-fuchsia-200/70" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Chercher un joueur par pseudo ou ID Free Fire"
          className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
        />
      </div>

      <div className="tp-ranking-shell overflow-hidden rounded-[18px] border border-violet-300/18">
      <div className="tp-ranking-roi-banner relative flex items-center justify-center gap-5 overflow-hidden px-4 py-4 text-center md:px-6 md:text-left">
        <div className="tp-ranking-roi-streak" />
        <div className="tp-ranking-roi-particles" aria-hidden="true">
          <span className="tp-ranking-roi-particle tp-ranking-roi-particle-1" />
          <span className="tp-ranking-roi-particle tp-ranking-roi-particle-2" />
          <span className="tp-ranking-roi-particle tp-ranking-roi-particle-3" />
          <span className="tp-ranking-roi-particle tp-ranking-roi-particle-4" />
          <span className="tp-ranking-roi-particle tp-ranking-roi-particle-5" />
          <span className="tp-ranking-roi-particle tp-ranking-roi-particle-6" />
          <span className="tp-ranking-roi-particle tp-ranking-roi-particle-7" />
          <span className="tp-ranking-roi-particle tp-ranking-roi-particle-8" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="tp-ranking-roi-icon-wrap"
        >
          <motion.div
            animate={{
              y: [0, -10, 2, -6, 0],
              scale: [1, 1.14, 0.98, 1.09, 1],
              rotate: [0, -6, 6, -3, 0],
              filter: ["brightness(1)", "brightness(1.28)", "brightness(0.98)", "brightness(1.22)", "brightness(1)"],
            }}
            transition={{ duration: 1.45, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            className="flex shrink-0 items-center justify-center"
          >
            <img
              src="https://img.icons8.com/3d-fluency/94/crown.png"
              alt="crown"
              width="72"
              height="72"
              className="tp-ranking-roi-icon h-[58px] w-[58px] object-contain md:h-[68px] md:w-[68px]"
            />
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, delay: 0.1, ease: "easeOut" }}
          className="relative z-[1] flex flex-col items-center justify-center md:items-start"
        >
          <motion.div
            animate={{
              letterSpacing: ["0.04em", "0.14em", "0.05em"],
              textShadow: [
                "0 0 16px rgba(255,206,122,0.18)",
                "0 0 44px rgba(255,206,122,0.78)",
                "0 0 26px rgba(244,114,182,0.38)",
                "0 0 52px rgba(255,149,76,0.52)",
                "0 0 16px rgba(255,206,122,0.18)"
              ],
              y: [0, -2, 1, 0],
              scale: [1, 1.02, 1],
            }}
            transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            className="tp-ranking-roi-title text-[1.05rem] font-black uppercase tracking-wide text-amber-100"
          >
            Joueur premier en crédits
          </motion.div>
          <motion.div
            animate={{
              opacity: [0.72, 1, 0.78],
              y: [0, -3, 1, 0],
              textShadow: [
                "0 0 10px rgba(255,255,255,0.08)",
                "0 0 28px rgba(244,114,182,0.34)",
                "0 0 18px rgba(255,160,82,0.24)",
                "0 0 10px rgba(255,255,255,0.08)"
              ],
            }}
            transition={{ duration: 1.35, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            className="tp-ranking-roi-subtitle mt-1 text-[1.1rem] font-medium text-white/88"
          >
            Il est le ROI tant qu&apos;il gagne
          </motion.div>
        </motion.div>
      </div>

      <div className="hidden md:grid grid-cols-[86px_120px_1.2fr_1.1fr_110px_140px_130px] border-t border-white/10 bg-black/12 px-4 py-3 text-[0.95rem] font-bold uppercase tracking-wide text-white/76">
        <div>Rank</div>
        <div>Avatar</div>
        <div>Pseudo</div>
        <div>ID Free Fire</div>
        <div>Crédits</div>
        <div>Statut</div>
        <div>Action</div>
      </div>

      <div className="hidden md:block">
        {filteredPlayers.map((player, idx) => {
          const meta = statusMeta(player.status);
          const isRoi = player.status === "ROI";
          const isSecond = idx === 1;
          const isThird = idx === 2;
          const podiumTone = isSecond ? "second" : isThird ? "third" : null;
          const canChallenge = Boolean(
            currentUserId &&
              roi &&
              !isRoi &&
              currentUser &&
              currentUser.status !== "CHALLENGER" &&
              currentUser.status !== "ELIMINATED" &&
              !hasActiveChallenge,
          );
          const isCurrentUser = currentUserId === player.id;
          const allianceLabel = getAllianceLabel(player.pseudo, player.recruitedPlayers?.[0]?.pseudo ?? null);
          const isDuo = Boolean(player.recruitedPlayers?.length);

          return (
            <motion.div
              key={player.id}
              ref={(element) => {
                rowRefs.current[player.id] = element;
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: idx * 0.03 }}
              className={`tp-ranking-row ${isRoi ? "tp-ranking-row-roi" : ""} ${isSecond ? "tp-ranking-row-second" : ""} ${isThird ? "tp-ranking-row-third" : ""} grid grid-cols-[86px_120px_1.2fr_1.1fr_110px_140px_130px] items-center px-4 py-3 ${isCurrentUser ? "tp-ranking-row-current" : ""}`}
            >
              {isRoi ? (
                <div className="tp-ranking-row-roi-rails" aria-hidden="true">
                  <span className="tp-ranking-row-roi-border" />
                  <span className="tp-ranking-row-roi-border-glow" />
                </div>
              ) : null}
              {isSecond || isThird ? (
                <div className={`tp-ranking-row-podium-rails tp-ranking-row-podium-rails-${podiumTone}`} aria-hidden="true">
                  <span className={`tp-ranking-row-podium-border tp-ranking-row-podium-border-${podiumTone}`} />
                  <span className={`tp-ranking-row-podium-border-glow tp-ranking-row-podium-border-glow-${podiumTone}`} />
                </div>
              ) : null}

              <div className={`text-[1.15rem] font-black text-amber-200 md:text-[2.1rem] ${isRoi ? "tp-ranking-rank-roi" : ""} ${isSecond ? "tp-ranking-rank-second" : ""} ${isThird ? "tp-ranking-rank-third" : ""}`}>
                {player.rankingPosition ?? idx + 1}
              </div>

              <div className="flex items-center">
                <Image
                  src={player.logoUrl}
                  alt={player.pseudo}
                  width={78}
                  height={52}
                  className={`h-14 w-auto max-w-[92px] object-contain drop-shadow-[0_0_16px_rgba(255,136,76,0.18)] ${isRoi ? "tp-ranking-logo-roi" : ""} ${isSecond ? "tp-ranking-logo-second" : ""} ${isThird ? "tp-ranking-logo-third" : ""}`}
                />
              </div>

              <div className="min-w-0">
                <div className={`flex items-center gap-2 truncate text-[1.2rem] font-bold text-white md:text-[1.6rem] ${isRoi ? "tp-ranking-name-roi" : ""} ${isSecond ? "tp-ranking-name-second" : ""} ${isThird ? "tp-ranking-name-third" : ""}`}>
                  {isSecond ? <Image src="/podium-silver.svg" alt="2e place" width={28} height={28} className="tp-ranking-podium-icon tp-ranking-podium-icon-second" /> : null}
                  {isThird ? <Image src="/podium-bronze.svg" alt="3e place" width={28} height={28} className="tp-ranking-podium-icon tp-ranking-podium-icon-third" /> : null}
                  {isRoi ? <Crown className="h-5 w-5 shrink-0 text-amber-300" /> : player.status === "CHALLENGER" ? <Shield className="h-5 w-5 shrink-0 text-violet-200" /> : player.status === "ELIMINATED" ? <Skull className="h-5 w-5 shrink-0 text-rose-300" /> : null}
                  <span className="truncate">{allianceLabel}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 truncate text-[0.96rem] text-white/72">
                  <Gamepad2 className="h-[1.05rem] w-[1.05rem] shrink-0 text-violet-200/80" />
                  <span className="truncate">{player.freefireId}</span>
                </div>
                {isDuo ? <div className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-cyan-200/70">Position renforcée 1v2</div> : null}
              </div>

              <div className="truncate text-[1.05rem] tracking-wide text-white/82">{player.freefireId}</div>

              <div className={`text-[1.2rem] font-black text-amber-100 md:text-[1.6rem] ${isRoi ? "tp-ranking-credits-roi" : ""} ${isSecond ? "tp-ranking-credits-second" : ""} ${isThird ? "tp-ranking-credits-third" : ""}`}>
                {player.credits} <span className="text-[0.95rem] font-medium text-white/78">crédits</span>
              </div>

              <div className={`flex items-center gap-2 text-[1.05rem] font-semibold text-white/90 ${isRoi ? "tp-ranking-status-roi" : ""}`}>
                {isRoi ? (
                  <span className="tp-ranking-status-roi-icon" aria-hidden="true">
                    <img src="https://img.icons8.com/3d-fluency/94/crown.png" alt="" width="26" height="26" className="h-6 w-6 object-contain" />
                  </span>
                ) : (
                  meta.icon
                )}
                <span className={isRoi ? "tp-ranking-status-roi-label" : ""}>{meta.label}</span>
              </div>

              <div>
                <button
                  disabled={!canChallenge || loadingId === roi?.id}
                  onClick={challengeRoi}
                  className={`${meta.actionClass} ${isRoi ? "tp-ranking-action-roi" : ""} ${isSecond ? "tp-ranking-action-second" : ""} ${isThird ? "tp-ranking-action-third" : ""} ${!canChallenge ? "opacity-70" : ""}`}
                >
                  {meta.action}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="space-y-3 p-3 md:hidden">
        {filteredPlayers.length ? filteredPlayers.map((player, idx) => {
          const meta = statusMeta(player.status);
          const isRoi = player.status === "ROI";
          const isSecond = idx === 1;
          const isThird = idx === 2;
          const canChallenge = Boolean(
            currentUserId &&
              roi &&
              !isRoi &&
              currentUser &&
              currentUser.status !== "CHALLENGER" &&
              currentUser.status !== "ELIMINATED" &&
              !hasActiveChallenge,
          );
          const isCurrentUser = currentUserId === player.id;
          const allianceLabel = getAllianceLabel(player.pseudo, player.recruitedPlayers?.[0]?.pseudo ?? null);
          const isDuo = Boolean(player.recruitedPlayers?.length);

          return (
            <motion.div
              key={`mobile-${player.id}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: idx * 0.03 }}
              className={`rounded-[22px] border px-4 py-4 ${isCurrentUser ? "border-fuchsia-300/30 bg-fuchsia-300/10" : "border-white/10 bg-white/[0.03]"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl font-black ${isRoi ? "bg-amber-300/12 text-amber-200" : "bg-white/5 text-white"}`}>
                    #{player.rankingPosition ?? idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-lg font-black text-white">
                      {isRoi ? <Crown className="h-4 w-4 shrink-0 text-amber-300" /> : null}
                      <span className="truncate">{allianceLabel}</span>
                    </div>
                    <div className="mt-1 truncate text-sm text-white/55">{player.freefireId}</div>
                    {isDuo ? <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200/75">Position 1v2</div> : null}
                  </div>
                </div>
                <Image src={player.logoUrl} alt={player.pseudo} width={56} height={56} className="h-14 w-14 shrink-0 object-contain" />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-2.5">
                  <div className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-white/38">Crédits</div>
                  <div className="mt-1 text-lg font-black text-amber-100">{player.credits}</div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-2.5">
                  <div className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-white/38">Statut</div>
                  <div className="mt-1 flex items-center gap-2 text-sm font-bold text-white">
                    {meta.icon}
                    <span>{meta.label}</span>
                  </div>
                </div>
              </div>

              <button
                disabled={!canChallenge || loadingId === roi?.id}
                onClick={challengeRoi}
                className={`${meta.actionClass} mt-4 w-full justify-center ${!canChallenge ? "opacity-70" : ""}`}
              >
                {meta.action}
              </button>
            </motion.div>
          );
        }) : <div className="rounded-[20px] border border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-white/50">Aucun joueur ne correspond à cette recherche.</div>}
      </div>

      {showBackToTop ? (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="tp-back-to-top"
          aria-label="Revenir en haut"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      ) : null}
      </div>
    </>
  );
}

"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

import type { MatchPublic } from "@/types/match";

function formatCountdown(ms: number) {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function MatchCard({ match }: { match: MatchPublic }) {
  const date = useMemo(() => new Date(match.date), [match.date]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const timer = formatCountdown(date.getTime() - now);
  const statusTone =
    match.status === "LIVE"
      ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
      : match.status === "FINISHED"
        ? "border-white/15 bg-white/5 text-white/70"
        : "border-blue-400/25 bg-blue-500/10 text-blue-100";

  const winnerLabel =
    match.status === "FINISHED"
      ? match.winnerId === match.player1.id
        ? match.player1.pseudo
        : match.winnerId === match.player2.id
          ? match.player2.pseudo
          : "—"
      : "—";

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="tp-glass rounded-3xl p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs ${statusTone}`}
        >
          {match.status}
        </span>
        <div className="text-xs text-white/60">{timer}</div>
      </div>

      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex items-center gap-3">
          <Image src={match.player1.logoUrl} alt={match.player1.pseudo} width={44} height={44} className="h-11 w-11 rounded-2xl object-cover" />
          <div className="min-w-0">
            <div className="truncate font-semibold text-white">{match.player1.pseudo}</div>
            <div className="truncate text-xs text-white/60">{match.player1.freefireId}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white/80">
          VS
        </div>

        <div className="flex items-center justify-end gap-3 text-right">
          <div className="min-w-0">
            <div className="truncate font-semibold text-white">{match.player2.pseudo}</div>
            <div className="truncate text-xs text-white/60">{match.player2.freefireId}</div>
          </div>
          <Image src={match.player2.logoUrl} alt={match.player2.pseudo} width={44} height={44} className="h-11 w-11 rounded-2xl object-cover" />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between text-sm">
        <div className="text-white/60">Résultat</div>
        <div className="font-semibold text-white">{winnerLabel}</div>
      </div>
    </motion.div>
  );
}

export function MatchCardCompact({ match }: { match: MatchPublic }) {
  const date = new Date(match.date);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const timer = formatCountdown(date.getTime() - now);
  const statusTone =
    match.status === "LIVE"
      ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
      : match.status === "FINISHED"
        ? "border-white/15 bg-white/5 text-white/70"
        : "border-blue-400/25 bg-blue-500/10 text-blue-100";

  const winnerLabel =
    match.status === "FINISHED"
      ? match.winnerId === match.player1.id
        ? match.player1.pseudo
        : match.winnerId === match.player2.id
          ? match.player2.pseudo
          : "—"
      : "—";

  return (
    <motion.div
      whileHover={{ y: -1 }}
      transition={{ duration: 0.15 }}
      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
    >
      <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] ${statusTone}`}>
        {match.status}
      </span>

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-white">
          {match.player1.pseudo} <span className="text-white/50">vs</span> {match.player2.pseudo}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-white/55">
          <span className="tabular-nums">{timer}</span>
          <span className="text-white/25">•</span>
          <span>Résultat: <span className="text-white/70">{winnerLabel}</span></span>
        </div>
      </div>

      <div className="hidden shrink-0 items-center gap-2 sm:flex">
        <Image
          src={match.player1.logoUrl}
          alt={match.player1.pseudo}
          width={28}
          height={28}
          className="h-7 w-7 rounded-xl object-cover"
        />
        <Image
          src={match.player2.logoUrl}
          alt={match.player2.pseudo}
          width={28}
          height={28}
          className="h-7 w-7 rounded-xl object-cover"
        />
      </div>
    </motion.div>
  );
}

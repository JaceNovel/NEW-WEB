"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Crown, Swords, Users } from "lucide-react";

export default function TournamentRules({
  roi,
}: {
  roi?: { pseudo: string; credits: number } | null;
}) {
  return (
    <section className="mx-auto max-w-[1200px] px-4 pb-10">
      <div className="grid gap-6 md:grid-cols-3">
        <motion.div
          whileHover={{ scale: 1.05, y: -2 }}
          transition={{ duration: 0.25 }}
          className="tp-glass tp-border-glow rounded-3xl p-6 transition-all duration-300"
        >
          <div className="tp-panel-title mb-3 text-white">
            <Users className="h-4 w-4 text-violet-300" /> Inscriptions
          </div>
          <ul className="space-y-2 text-sm text-white/70">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-blue-300" /> Le tournoi est limité à 20 joueurs
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-blue-300" /> Pseudo, ID Free Fire, logo
            </li>
          </ul>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.05, y: -2 }}
          transition={{ duration: 0.25 }}
          className="tp-glass tp-border-glow rounded-3xl p-6 transition-all duration-300"
        >
          <div className="tp-panel-title mb-3 text-white">
            <Swords className="h-4 w-4 text-violet-300" /> Règles du tournoi
          </div>
          <ul className="space-y-2 text-sm text-white/70">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-blue-300" /> Mode : 1v1 — Spam / One Tap
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-blue-300" /> Gagnant : +1 crédit — Perdant : -1 crédit
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-blue-300" /> Crédits &lt; 5 : joueur éliminé
            </li>
          </ul>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.05, y: -2 }}
          transition={{ duration: 0.25 }}
          className="tp-glass tp-border-glow rounded-3xl p-6 transition-all duration-300"
        >
          <div className="tp-panel-title mb-3 text-white">
            <Crown className="h-4 w-4 text-yellow-200" /> Le ROI
          </div>
          <ul className="space-y-2 text-sm text-white/70">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-blue-300" /> Le #1 du classement devient ROI
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-blue-300" /> Les joueurs peuvent le défier
            </li>
            <li className="flex items-start gap-2">
              <Crown className="mt-0.5 h-4 w-4 text-yellow-200" />
              <span>
                ROI actuel : <span className="font-semibold text-white">{roi?.pseudo ?? "—"}</span>
                {roi ? <span className="text-white/50"> ({roi.credits} crédits)</span> : null}
              </span>
            </li>
          </ul>
        </motion.div>
      </div>
    </section>
  );
}

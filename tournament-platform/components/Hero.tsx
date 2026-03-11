"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { LogIn } from "lucide-react";

export default function Hero() {
  return (
    <section className="mx-auto max-w-[1200px] px-4 pt-10 pb-8">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden tp-glass tp-neon tp-border-glow rounded-3xl p-8 md:p-14"
      >
        <div className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(900px_circle_at_50%_10%,rgba(124,58,237,0.35),transparent_60%),radial-gradient(700px_circle_at_90%_30%,rgba(245,158,11,0.18),transparent_55%)]" />

        <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
          <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-white/70">
            Système de crédits
          </div>

          <h1 className="tp-text-glow mt-6 text-4xl font-extrabold leading-tight tracking-tight text-white md:text-6xl">
            <span className="block text-white/90">TOURNOI</span>
            <span className="block bg-gradient-to-r from-violet-300 via-fuchsia-200 to-amber-200 bg-clip-text text-transparent">
              1v1
            </span>
            <span className="mt-2 block bg-gradient-to-r from-amber-200 via-fuchsia-200 to-blue-200 bg-clip-text text-transparent">
              SPAM / ONE TAP
            </span>
          </h1>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/inscription" className="tp-button-primary px-7 py-3">
              S&apos;inscrire
            </Link>
            <Link href="/login" className="tp-button-ghost px-7 py-3">
              <LogIn className="h-4 w-4" /> Connexion
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

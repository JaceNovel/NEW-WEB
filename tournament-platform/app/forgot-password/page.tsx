"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { KeyRound, Mail, ShieldCheck } from "lucide-react";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Envoi impossible");
      setSent(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Envoi impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="tp-auth-shell tp-auth-shell-login-page">
      <div className="tp-auth-backdrop" aria-hidden="true">
        <span className="tp-auth-orb tp-auth-orb-a" />
        <span className="tp-auth-orb tp-auth-orb-b" />
        <span className="tp-auth-grid" />
      </div>

      <div className="mx-auto max-w-[1080px] px-4 py-8 lg:px-6 lg:py-12">
        <div className="tp-auth-layout tp-auth-layout-login">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="tp-auth-showcase"
          >
            <div className="tp-auth-kicker">Récupération sécurisée</div>
            <h1 className="tp-auth-title">Réinitialise ton mot de passe sans perdre l'accès à ton arène.</h1>
            <p className="tp-auth-copy">
              Entre ton pseudo ou ton adresse email. Si un compte correspondant existe, un lien de réinitialisation te sera envoyé.
            </p>

            <div className="tp-auth-feature-list">
              <div className="tp-auth-feature-item">
                <Mail className="h-5 w-5" />
                <span>Le lien est envoyé par email et expire automatiquement après une heure.</span>
              </div>
              <div className="tp-auth-feature-item">
                <ShieldCheck className="h-5 w-5" />
                <span>Les anciens liens sont invalidés à chaque nouvelle demande.</span>
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.08 }}
            className="tp-auth-panel tp-auth-panel-login"
          >
            <div className="tp-auth-panel-head">
              <div>
                <div className="tp-auth-form-kicker">Mot de passe oublié</div>
                <h2 className="tp-auth-form-title">Recevoir un lien</h2>
              </div>
              <Link href="/login" className="tp-auth-alt-link">
                Retour connexion
              </Link>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label className="tp-auth-label">Pseudo ou email</label>
                <input value={identifier} onChange={(event) => setIdentifier(event.target.value)} className="tp-input tp-auth-input" placeholder="Pseudo ou email" required />
              </div>

              {sent ? <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">Si le compte existe, le lien de réinitialisation a été envoyé.</div> : null}
              {error ? <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div> : null}

              <div className="tp-auth-inline-note">
                <KeyRound className="h-4 w-4" /> Vérifie aussi tes spams si l'email n'arrive pas immédiatement.
              </div>

              <button disabled={busy} className="tp-auth-submit w-full justify-center disabled:opacity-60">
                {busy ? "Envoi du lien..." : "Envoyer le lien de réinitialisation"}
              </button>
            </form>
          </motion.section>
        </div>
      </div>
    </main>
  );
}
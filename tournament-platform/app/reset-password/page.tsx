"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { KeyRound, ShieldCheck } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError("Lien de réinitialisation invalide.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setBusy(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Réinitialisation impossible");
      router.push("/login");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Réinitialisation impossible");
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
            <div className="tp-auth-kicker">Nouveau mot de passe</div>
            <h1 className="tp-auth-title">Choisis un nouveau secret et retourne immédiatement dans la ligue.</h1>
            <p className="tp-auth-copy">
              Le lien n'est valable qu'une seule fois. Dès validation, l'ancien mot de passe devient inutilisable.
            </p>

            <div className="tp-auth-feature-list">
              <div className="tp-auth-feature-item">
                <ShieldCheck className="h-5 w-5" />
                <span>Le nouveau mot de passe remplace immédiatement l'ancien.</span>
              </div>
              <div className="tp-auth-feature-item">
                <KeyRound className="h-5 w-5" />
                <span>Choisis un mot de passe fort d'au moins 6 caractères.</span>
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
                <div className="tp-auth-form-kicker">Réinitialisation</div>
                <h2 className="tp-auth-form-title">Définir un nouveau mot de passe</h2>
              </div>
              <Link href="/login" className="tp-auth-alt-link">
                Retour connexion
              </Link>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label className="tp-auth-label">Nouveau mot de passe</label>
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="tp-input tp-auth-input" placeholder="6 caractères minimum" minLength={6} required />
              </div>

              <div>
                <label className="tp-auth-label">Confirmer le mot de passe</label>
                <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="tp-input tp-auth-input" placeholder="Confirme le mot de passe" minLength={6} required />
              </div>

              {error ? <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div> : null}

              <button disabled={busy} className="tp-auth-submit w-full justify-center disabled:opacity-60">
                {busy ? "Mise à jour..." : "Enregistrer le nouveau mot de passe"}
              </button>
            </form>
          </motion.section>
        </div>
      </div>
    </main>
  );
}
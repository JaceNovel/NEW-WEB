"use client";

import Link from "next/link";
import { getSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { Crown, LogIn, ShieldCheck, Sparkles, Swords, UserCircle2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [pseudo, setPseudo] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signIn("credentials", {
      redirect: false,
      pseudo,
      password,
    });
    setBusy(false);
    if (res?.error) {
      setError("Pseudo ou mot de passe invalide");
      return;
    }

    const session = await getSession();
    if (!(session?.user as any)?.id) {
      setError("Connexion acceptee mais session introuvable. Reessaie dans quelques secondes.");
      return;
    }

    const isAdmin = (session?.user as any)?.role === "ADMIN";
    router.push(isAdmin ? "/admin" : "/profile");
  }

  return (
    <main className="tp-auth-shell tp-auth-shell-login-page">
      <div className="tp-auth-backdrop" aria-hidden="true">
        <span className="tp-auth-orb tp-auth-orb-a" />
        <span className="tp-auth-orb tp-auth-orb-b" />
        <span className="tp-auth-grid" />
      </div>

      <div className="mx-auto max-w-[1320px] px-4 py-8 lg:px-6 lg:py-12">
        <div className="tp-auth-layout tp-auth-layout-login">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="tp-auth-showcase"
          >
            <div className="tp-auth-kicker">Acces officiel KING League</div>
            <h1 className="tp-auth-title">Reconnecte-toi et reprends ta marche vers le trone.</h1>
            <p className="tp-auth-copy">
              Retrouve ton profil, tes credits, ton historique de defis et les duels qui comptent vraiment dans la course au ROI.
            </p>

            <div className="tp-auth-feature-list">
              <div className="tp-auth-feature-item">
                <UserCircle2 className="h-5 w-5" />
                <span>Acces immediat a ton profil, au classement et a ton espace joueur.</span>
              </div>
              <div className="tp-auth-feature-item">
                <ShieldCheck className="h-5 w-5" />
                <span>Connexion securisee par identifiant joueur et mot de passe.</span>
              </div>
              <div className="tp-auth-feature-item">
                <Crown className="h-5 w-5" />
                <span>Depuis ton profil, tu peux viser le ROI et lire chaque duel qui faconne la saison.</span>
              </div>
            </div>

            <div className="tp-auth-preview-card">
              <div className="tp-auth-preview-head">
                <span className="tp-auth-preview-badge">Brief de session</span>
                <span className="tp-auth-mode-chip tp-auth-mode-chip-spam">Acces immediat</span>
              </div>
              <div className="space-y-3 text-sm text-white/72">
                <div className="flex items-center gap-3"><Sparkles className="h-4 w-4 text-fuchsia-200" /> Reprends tes défis en attente.</div>
                <div className="flex items-center gap-3"><Swords className="h-4 w-4 text-amber-300" /> Consulte les affrontements programmés et les résultats validés.</div>
                <div className="flex items-center gap-3"><LogIn className="h-4 w-4 text-cyan-200" /> Passe directement de la connexion à ton espace joueur.</div>
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
                <div className="tp-auth-form-kicker">Connexion joueur</div>
                <h2 className="tp-auth-form-title">Retour dans l&apos;arène</h2>
              </div>
              <Link href="/inscription" className="tp-auth-alt-link">
                Créer un compte
              </Link>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label className="tp-auth-label">Pseudo ou email</label>
                <input value={pseudo} onChange={(e) => setPseudo(e.target.value)} className="tp-input tp-auth-input" placeholder="Ton pseudo joueur ou ton email" autoComplete="username" required />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="tp-auth-label !mb-0">Mot de passe</label>
                  <Link href="/forgot-password" className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200/80 transition hover:text-cyan-100">
                    Mot de passe oublié ?
                  </Link>
                </div>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="tp-input tp-auth-input" placeholder="Mot de passe" required />
              </div>

              {error ? <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div> : null}

              <button disabled={busy} className="tp-auth-submit w-full justify-center disabled:opacity-60">
                {busy ? "Connexion au serveur..." : "Se connecter"}
              </button>
            </form>
          </motion.section>
        </div>
      </div>
    </main>
  );
}

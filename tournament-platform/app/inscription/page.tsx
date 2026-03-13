"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BadgeCheck, Camera, Crown, Flag, Flame, ShieldCheck, Swords, UploadCloud } from "lucide-react";

import { COUNTRY_OPTIONS } from "@/lib/countries";

async function uploadLogo(file: File) {
  const form = new FormData();
  form.append("file", file);

  const upRes = await fetch("/api/upload/logo", {
    method: "POST",
    body: form,
  });
  const upJson = await upRes.json();
  if (!upRes.ok) throw new Error(upJson?.error ?? "Upload failed");

  return upJson.url as string;
}

export default function InscriptionPage() {
  const router = useRouter();
  const [pseudo, setPseudo] = useState("");
  const [email, setEmail] = useState("");
  const [freefireId, setFreefireId] = useState("");
  const [countryCode, setCountryCode] = useState("FR");
  const [gameMode, setGameMode] = useState<"SPAM" | "ONETAP">("SPAM");
  const [password, setPassword] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(logoFile);
    setLogoPreview(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [logoFile]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (!logoFile) throw new Error("Logo requis");
      const logoUrl = await uploadLogo(logoFile);

      const res = await fetch("/api/player/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pseudo, email, freefireId, countryCode, gameMode, password, logoUrl }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Inscription impossible");

      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="tp-auth-shell tp-auth-shell-register">
      <div className="tp-auth-backdrop" aria-hidden="true">
        <span className="tp-auth-orb tp-auth-orb-a" />
        <span className="tp-auth-orb tp-auth-orb-b" />
        <span className="tp-auth-grid" />
      </div>

      <div className="mx-auto max-w-[1380px] px-4 py-8 lg:px-6 lg:py-12">
        <div className="tp-auth-layout">
          <motion.section
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, ease: "easeOut" }}
            className="tp-auth-showcase"
          >
            <div className="tp-auth-kicker">Acces officiel KING League</div>
            <h1 className="tp-auth-title">Entre dans l&apos;arène et verrouille ta place dans le top 20.</h1>
            <p className="tp-auth-copy">
              Ton profil devient ton identité de combat. Choisis ton mode, ton drapeau, ton emblème et prépare ton entrée dans un tournoi pensé comme une scène e-sport.
            </p>

            <div className="tp-auth-stats-grid">
              <div className="tp-auth-stat-card">
                <div className="tp-auth-stat-label">Accès prioritaire</div>
                <div className="tp-auth-stat-value">Top 20</div>
                <div className="tp-auth-stat-meta">Les 20 premiers inscrits forment la base du tournoi.</div>
              </div>
              <div className="tp-auth-stat-card">
                <div className="tp-auth-stat-label">Formats</div>
                <div className="tp-auth-stat-value">Spam / One Tap</div>
                <div className="tp-auth-stat-meta">Ton matchmaking reste aligné sur ton style de jeu.</div>
              </div>
            </div>

            <div className="tp-auth-feature-list">
              <div className="tp-auth-feature-item">
                <ShieldCheck className="h-5 w-5" />
                <span>Un seul ID Free Fire par inscription, une seule identité par mode.</span>
              </div>
              <div className="tp-auth-feature-item">
                <Flag className="h-5 w-5" />
                <span>Ton pays et ton pseudo sont mis en scène directement sur les pages matchs et classement.</span>
              </div>
              <div className="tp-auth-feature-item">
                <Crown className="h-5 w-5" />
                <span>Chaque victoire validee te rapproche du ROI et du sommet du classement.</span>
              </div>
            </div>

            <div className="tp-auth-preview-card">
              <div className="tp-auth-preview-head">
                <span className="tp-auth-preview-badge">Apercu joueur</span>
                <span className={`tp-auth-mode-chip ${gameMode === "SPAM" ? "tp-auth-mode-chip-spam" : "tp-auth-mode-chip-onetap"}`}>{gameMode}</span>
              </div>
              <div className="tp-auth-preview-body">
                <div className="tp-auth-preview-avatar-wrap">
                  {logoPreview ? <img src={logoPreview} alt="Aperçu logo" className="tp-auth-preview-avatar" /> : <Camera className="h-10 w-10 text-white/45" />}
                </div>
                <div>
                  <div className="tp-auth-preview-name">{pseudo || "Ton pseudo"}</div>
                  <div className="tp-auth-preview-meta">ID. {freefireId || "XXXXXXXX"}</div>
                  <div className="tp-auth-preview-meta">Pays: {COUNTRY_OPTIONS.find((country) => country.code === countryCode)?.label ?? countryCode}</div>
                </div>
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, ease: "easeOut", delay: 0.08 }}
            className="tp-auth-panel"
          >
            <div className="tp-auth-panel-head">
              <div>
                <div className="tp-auth-form-kicker">Inscription compétitive</div>
                <h2 className="tp-auth-form-title">Crée ton profil de combat</h2>
              </div>
              <Link href="/login" className="tp-auth-alt-link">
                Déjà inscrit ? Connexion
              </Link>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="tp-auth-label">Pseudo</label>
                  <input value={pseudo} onChange={(e) => setPseudo(e.target.value)} className="tp-input tp-auth-input" placeholder="Ton blaze" required />
                </div>
                <div>
                  <label className="tp-auth-label">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="tp-input tp-auth-input" placeholder="ton@email.com" required />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="tp-auth-label">ID Free Fire</label>
                  <input value={freefireId} onChange={(e) => setFreefireId(e.target.value)} className="tp-input tp-auth-input" placeholder="ID officiel" required />
                </div>
                <div>
                  <label className="tp-auth-label">Pays</label>
                  <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="tp-input tp-auth-input" required>
                    {COUNTRY_OPTIONS.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="tp-auth-label">Mot de passe</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="tp-input tp-auth-input"
                    placeholder="6 caractères minimum"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div>
                <label className="tp-auth-label">Mode de duel</label>
                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setGameMode("SPAM")}
                    className={`tp-auth-mode-card ${gameMode === "SPAM" ? "tp-auth-mode-card-active-spam" : ""}`}
                  >
                    <Flame className="h-5 w-5" />
                    <div>
                      <div className="tp-auth-mode-title">Spam</div>
                      <div className="tp-auth-mode-copy">Cadence élevée, pression constante, duel nerveux.</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGameMode("ONETAP")}
                    className={`tp-auth-mode-card ${gameMode === "ONETAP" ? "tp-auth-mode-card-active-onetap" : ""}`}
                  >
                    <BadgeCheck className="h-5 w-5" />
                    <div>
                      <div className="tp-auth-mode-title">One Tap</div>
                      <div className="tp-auth-mode-copy">Précision maximale, exécution rapide, duel propre.</div>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="tp-auth-label">Logo joueur</label>
                <label className="tp-auth-upload-zone">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                    className="hidden"
                    required
                  />
                  <UploadCloud className="h-6 w-6 text-amber-300" />
                  <div>
                    <div className="tp-auth-upload-title">Upload ton emblème</div>
                    <div className="tp-auth-upload-copy">PNG, JPG ou WebP. Suppression de fond tentée automatiquement.</div>
                  </div>
                  <span className="tp-auth-upload-file">{logoFile?.name ?? "Choisir un fichier"}</span>
                </label>
                <p className="mt-2 text-xs text-white/45">Le même ID Free Fire ne peut pas s&apos;inscrire plusieurs fois dans le même écosystème.</p>
              </div>

              {error ? <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div> : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="tp-auth-inline-note">
                  <Swords className="h-4 w-4" /> Les vainqueurs montent, les éliminés tombent sous 5 crédits.
                </div>
                <button disabled={busy} className="tp-auth-submit disabled:opacity-60">
                  {busy ? "Déploiement du profil..." : "Entrer dans la ligue"}
                </button>
              </div>
            </form>
          </motion.section>
        </div>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Apple, BadgeCheck, Download, Monitor, ShieldCheck, Smartphone, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const STORAGE_KEY = "tp-hide-install-popup";

type DownloadInfo = {
  available: boolean;
  filename: string | null;
  url: string | null;
  label: string;
  note: string;
};

type DownloadsPayload = {
  android: DownloadInfo;
  desktopLinux: DownloadInfo;
  web: DownloadInfo;
  ios: DownloadInfo;
  assets: { loader: string | null };
};

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
}

function readPopupPreference() {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function writePopupPreference(value: boolean) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, value ? "true" : "false");
  } catch {
    // Ignore storage failures in restricted browser contexts.
  }
}

function getIosInstallHint() {
  return "Sur iPhone, utilise Safari puis Partager > Sur l'ecran d'accueil pour installer l'app sans fichier externe.";
}

export default function AppInstallPopup() {
  const [isVisible, setIsVisible] = useState(false);
  const [doNotShowAgain, setDoNotShowAgain] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showManualSteps, setShowManualSteps] = useState(false);
  const [downloads, setDownloads] = useState<DownloadsPayload | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsInstalled(isStandaloneMode());
    setIsIos(/iphone|ipad|ipod/i.test(window.navigator.userAgent));

    const hidden = readPopupPreference();
    if (hidden || isStandaloneMode()) return;

    const timer = window.setTimeout(() => setIsVisible(true), 1800);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setIsVisible(false);
      writePopupPreference(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    void fetch("/api/app/downloads", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Downloads endpoint returned ${response.status}`);
        }

        return response.json();
      })
      .then((payload: DownloadsPayload) => setDownloads(payload))
      .catch(() => setDownloads(null));

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const helperText = useMemo(() => {
    if (deferredPrompt) {
      return "Installation officielle depuis le navigateur: aucune archive externe, aucun executable douteux, aucune alerte de fichier dangereux.";
    }

    if (isIos) {
      return getIosInstallHint();
    }

    return "Si le navigateur ne propose pas encore l'installation, ouvre le menu du navigateur puis choisis Installer l'application ou Ajouter a l'ecran d'accueil.";
  }, [deferredPrompt, isIos]);

  const loaderAsset = downloads?.assets.loader ?? "/icons8-chargement-infini-50.apng.png";

  function closePopup() {
    if (doNotShowAgain) {
      writePopupPreference(true);
    }
    setIsVisible(false);
  }

  async function installWebApp() {
    if (!deferredPrompt) {
      setShowManualSteps(true);
      return;
    }

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === "accepted") {
      writePopupPreference(true);
      setIsVisible(false);
      setDeferredPrompt(null);
    }
  }

  if (!isVisible || isInstalled) return null;

  return (
    <div className="tp-app-popup-backdrop" role="presentation">
      <section className="tp-app-popup" role="dialog" aria-modal="true" aria-labelledby="tp-app-popup-title">
        <button type="button" className="tp-app-popup-close" onClick={closePopup} aria-label="Fermer la fenetre d'installation">
          <X className="h-4 w-4" />
        </button>

        <div className="tp-app-popup-kicker">App officielle KING League</div>
        <div className="tp-app-popup-hero">
          <div className="tp-app-popup-visual">
            <div className="tp-app-popup-icon-chip">
              <img src="/pp1-removebg-preview%20(1).png" alt="Logo KING League" className="tp-app-popup-icon-image" />
            </div>
            <div className="tp-app-popup-device">
              <img src="/Design%20sans%20titre%20(1).png" alt="Splash officiel KING League" className="tp-app-popup-splash" />
              <img src={loaderAsset} alt="Chargement KING League" className="tp-app-popup-loader-image" />
            </div>
            <div className="tp-app-popup-device-badge">
              <Smartphone className="h-4 w-4" />
              <span>Mobile + Desktop</span>
            </div>
          </div>

          <div className="tp-app-popup-content">
            <h2 id="tp-app-popup-title" className="tp-app-popup-title">Installe KING League en app officielle mobile ou desktop.</h2>
            <p className="tp-app-popup-copy">
              La version disponible maintenant s'installe proprement depuis le navigateur. J'ai aussi prepare la base de packaging pour un shell mobile et desktop officiel autour du site, sans passer par des convertisseurs qui declenchent des alertes dangereuses.
            </p>
          </div>
        </div>

        <div className="tp-app-popup-points">
          <div className="tp-app-popup-point">
            <ShieldCheck className="h-4 w-4" />
            <span>Installation depuis ton domaine, sans executable telecharge depuis un convertisseur.</span>
          </div>
          <div className="tp-app-popup-point">
            <Smartphone className="h-4 w-4" />
            <span>Ajout sur mobile et desktop quand le navigateur autorise l'installation.</span>
          </div>
          <div className="tp-app-popup-point">
            <Monitor className="h-4 w-4" />
            <span>APK Android et AppImage Linux peuvent maintenant etre servis en telechargement direct quand les fichiers sont presents.</span>
          </div>
          <div className="tp-app-popup-point">
            <Download className="h-4 w-4" />
            <span>{helperText}</span>
          </div>
          <div className="tp-app-popup-point">
            <BadgeCheck className="h-4 w-4" />
            <span>Le telechargement client direct est actif. Les versions actuelles restent des wrappers locaux hors publication store.</span>
          </div>
        </div>

        <div className="tp-app-popup-downloads">
          <div className="tp-app-popup-download-card">
            <div className="tp-app-popup-download-head">
              <Smartphone className="h-4 w-4" />
              <span>Android</span>
            </div>
            <p className="tp-app-popup-download-copy">{downloads?.android.note ?? "Preparation de l'APK Android..."}</p>
            {downloads?.android.available && downloads.android.url ? (
              <a className="tp-app-popup-download-link" href={downloads.android.url} download>
                <Download className="h-4 w-4" />
                Telecharger l'APK
              </a>
            ) : (
              <button type="button" className="tp-app-popup-download-link is-disabled" disabled>
                APK indisponible
              </button>
            )}
          </div>

          <div className="tp-app-popup-download-card">
            <div className="tp-app-popup-download-head">
              <Monitor className="h-4 w-4" />
              <span>Desktop Linux</span>
            </div>
            <p className="tp-app-popup-download-copy">{downloads?.desktopLinux.note ?? "Preparation du wrapper desktop..."}</p>
            {downloads?.desktopLinux.available && downloads.desktopLinux.url ? (
              <a className="tp-app-popup-download-link" href={downloads.desktopLinux.url} download>
                <Download className="h-4 w-4" />
                Telecharger l'AppImage
              </a>
            ) : (
              <button type="button" className="tp-app-popup-download-link is-disabled" disabled>
                Desktop indisponible
              </button>
            )}
          </div>

          <div className="tp-app-popup-download-card">
            <div className="tp-app-popup-download-head">
              <Download className="h-4 w-4" />
              <span>Web App</span>
            </div>
            <p className="tp-app-popup-download-copy">{downloads?.web.note ?? helperText}</p>
            <button type="button" className="tp-app-popup-download-link" onClick={() => void installWebApp()}>
              <Download className="h-4 w-4" />
              Installer via navigateur
            </button>
          </div>

          <div className="tp-app-popup-download-card">
            <div className="tp-app-popup-download-head">
              <Apple className="h-4 w-4" />
              <span>iPhone / iPad</span>
            </div>
            <p className="tp-app-popup-download-copy">{downloads?.ios.note ?? getIosInstallHint()}</p>
            <button type="button" className="tp-app-popup-download-link" onClick={() => setShowManualSteps(true)}>
              Voir le guide iOS
            </button>
          </div>
        </div>

        {showManualSteps ? (
          <div className="tp-app-popup-manual">
            <div className="tp-app-popup-manual-title">Installation manuelle</div>
            <div className="tp-app-popup-manual-step">Chrome ou Edge desktop: menu du navigateur puis Installer KING League.</div>
            <div className="tp-app-popup-manual-step">Android: menu du navigateur puis Installer l'application ou Ajouter a l'ecran d'accueil.</div>
            <div className="tp-app-popup-manual-step">iPhone: Safari puis Partager et enfin Sur l'ecran d'accueil.</div>
          </div>
        ) : null}

        <div className="tp-app-popup-actions">
          <button type="button" className="tp-app-popup-install" onClick={() => void installWebApp()}>
            <Download className="h-4 w-4" />
            {deferredPrompt ? "Installer la web app" : "Voir le guide d'installation"}
          </button>
          <button type="button" className="tp-app-popup-dismiss" onClick={closePopup}>
            Plus tard
          </button>
        </div>

        <div className="tp-app-popup-note">
          Android et desktop sont servis en telechargement direct depuis ton domaine quand les wrappers sont presents dans le dossier public.
        </div>

        <label className="tp-app-popup-checkbox">
          <input type="checkbox" checked={doNotShowAgain} onChange={(event) => setDoNotShowAgain(event.target.checked)} />
          <span>Ne plus afficher</span>
        </label>
      </section>
    </div>
  );
}
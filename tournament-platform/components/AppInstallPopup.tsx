"use client";

import { useEffect, useMemo, useState } from "react";
import { Apple, Download, Monitor, Smartphone, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const STORAGE_KEY = "tp-hide-install-popup-permanent";
const SESSION_STORAGE_KEY = "tp-hide-install-popup-session";

type RelatedApp = {
  id?: string;
  platform?: string;
  url?: string;
};

type BrowserNavigator = Navigator & {
  getInstalledRelatedApps?: () => Promise<RelatedApp[]>;
  standalone?: boolean;
};

type BrowserWindow = Window & {
  Capacitor?: unknown;
  kingLeagueApp?: {
    shell?: string;
    platform?: string;
  };
};

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

type InstallTarget = {
  key: "android" | "desktopLinux" | "ios" | "web";
  label: string;
  note: string;
  buttonLabel: string;
  mode: "download" | "install" | "guide";
  url: string | null;
};

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  const browserWindow = window as BrowserWindow;
  const browserNavigator = window.navigator as BrowserNavigator;

  return (
    window.matchMedia("(display-mode: standalone)").matches
    || Boolean(browserNavigator.standalone)
    || Boolean(browserWindow.Capacitor)
    || browserWindow.kingLeagueApp?.shell === "electron"
  );
}

function readPopupPreference() {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function readSessionPopupPreference() {
  if (typeof window === "undefined") return false;

  try {
    return window.sessionStorage.getItem(SESSION_STORAGE_KEY) === "true";
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

function writeSessionPopupPreference(value: boolean) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, value ? "true" : "false");
  } catch {
    // Ignore storage failures in restricted browser contexts.
  }
}

async function detectInstalledApp() {
  if (typeof window === "undefined") return false;
  if (isStandaloneMode()) return true;

  const browserNavigator = window.navigator as BrowserNavigator;

  if (typeof browserNavigator.getInstalledRelatedApps !== "function") {
    return false;
  }

  try {
    const installedApps = await browserNavigator.getInstalledRelatedApps();
    return installedApps.length > 0;
  } catch {
    return false;
  }
}

function getIosInstallHint() {
  return "Sur iPhone, utilise Safari puis Partager > Sur l'ecran d'accueil pour installer l'app sans fichier externe.";
}

function getTargetIcon(target: InstallTarget["key"]) {
  if (target === "android") return Smartphone;
  if (target === "desktopLinux") return Monitor;
  if (target === "ios") return Apple;
  return Download;
}

export default function AppInstallPopup() {
  const [isVisible, setIsVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [showManualSteps, setShowManualSteps] = useState(false);
  const [hideForever, setHideForever] = useState(false);
  const [downloads, setDownloads] = useState<DownloadsPayload | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;

    setIsIos(/iphone|ipad|ipod/i.test(window.navigator.userAgent));

    void detectInstalledApp().then((installed) => {
      if (cancelled) return;

      setIsInstalled(installed);

      const permanentlyHidden = readPopupPreference();
      const sessionHidden = readSessionPopupPreference();

      if (!installed && !permanentlyHidden && !sessionHidden) {
        setIsVisible(true);
      }
    });

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (readPopupPreference() || readSessionPopupPreference() || isStandaloneMode()) return;
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setIsVisible(false);
      writePopupPreference(true);
      writeSessionPopupPreference(true);
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
      cancelled = true;
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const installTarget = useMemo<InstallTarget>(() => {
    if (typeof window === "undefined") {
      return {
        key: "web",
        label: "Web app",
        note: "App officielle KING League, simple et rapide a installer.",
        buttonLabel: "Installer",
        mode: "install",
        url: null,
      };
    }

    const userAgent = window.navigator.userAgent;
    const isAndroid = /android/i.test(userAgent);
    const isLinuxDesktop = /linux/i.test(userAgent) && !isAndroid;

    if (isIos) {
      return {
        key: "ios",
        label: "iPhone / iPad",
        note: getIosInstallHint(),
        buttonLabel: "Installer",
        mode: "guide",
        url: null,
      };
    }

    if (isAndroid && downloads?.android.available && downloads.android.url) {
      return {
        key: "android",
        label: "Android",
        note: downloads.android.note,
        buttonLabel: "Telecharger",
        mode: "download",
        url: downloads.android.url,
      };
    }

    if (isLinuxDesktop && downloads?.desktopLinux.available && downloads.desktopLinux.url) {
      return {
        key: "desktopLinux",
        label: "PC Linux",
        note: downloads.desktopLinux.note,
        buttonLabel: "Telecharger",
        mode: "download",
        url: downloads.desktopLinux.url,
      };
    }

    if (deferredPrompt) {
      return {
        key: "web",
        label: isAndroid ? "Android" : "Navigateur",
        note: "App officielle KING League avec installation directe depuis le navigateur.",
        buttonLabel: "Installer",
        mode: "install",
        url: null,
      };
    }

    return {
      key: "web",
      label: isAndroid ? "Android" : "Navigateur",
      note: "App officielle KING League. Utilise le menu du navigateur pour l'ajouter a l'ecran d'accueil.",
      buttonLabel: "Installer",
      mode: "guide",
      url: null,
    };
  }, [deferredPrompt, downloads, isIos]);

  const InstallIcon = getTargetIcon(installTarget.key);

  function dismissPopup() {
    if (hideForever) {
      writePopupPreference(true);
    }

    writeSessionPopupPreference(true);
    setIsVisible(false);
  }

  function closePopup() {
    dismissPopup();
  }

  async function installWebApp() {
    if (!deferredPrompt) {
      setShowManualSteps(true);
      return;
    }

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === "accepted") {
      writeSessionPopupPreference(true);
      setIsVisible(false);
      setDeferredPrompt(null);
    }
  }

  function handlePrimaryAction() {
    if (installTarget.mode === "download" && installTarget.url) {
      dismissPopup();
      window.location.href = installTarget.url;
      return;
    }

    if (installTarget.mode === "install") {
      void installWebApp();
      return;
    }

    setShowManualSteps(true);
  }

  if (!isVisible || isInstalled !== false) return null;

  return (
    <div className="tp-app-popup-backdrop" role="presentation">
      <section className="tp-app-popup" role="dialog" aria-labelledby="tp-app-popup-title">
        <button type="button" className="tp-app-popup-close" onClick={closePopup} aria-label="Fermer la fenetre d'installation">
          <X className="h-4 w-4" />
        </button>

        <div className="tp-app-popup-head">
          <div className="tp-app-popup-content">
            <div className="tp-app-popup-kicker">App officielle</div>
            <h2 id="tp-app-popup-title" className="tp-app-popup-title">Installer KING League</h2>
            <div className="tp-app-popup-platform">
              <InstallIcon className="h-3.5 w-3.5" />
              <span>{installTarget.label}</span>
            </div>
          </div>
        </div>

        <p className="tp-app-popup-copy">{installTarget.note}</p>

        {showManualSteps ? (
          <div className="tp-app-popup-manual">
            <div className="tp-app-popup-manual-step">Chrome ou Edge: menu du navigateur puis Installer l'application.</div>
            <div className="tp-app-popup-manual-step">Android: menu du navigateur puis Ajouter a l'ecran d'accueil.</div>
            <div className="tp-app-popup-manual-step">iPhone: Safari puis Partager et Sur l'ecran d'accueil.</div>
          </div>
        ) : null}

        <label className="tp-app-popup-optout">
          <input
            type="checkbox"
            checked={hideForever}
            onChange={(event) => setHideForever(event.target.checked)}
          />
          <span>Ne plus recevoir cette popup</span>
        </label>

        <div className="tp-app-popup-actions">
          <button type="button" className="tp-app-popup-install" onClick={handlePrimaryAction}>
            <Download className="h-4 w-4" />
            {installTarget.buttonLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
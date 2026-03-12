"use client";

import { useEffect, useMemo, useState } from "react";
import { Apple, Download, Monitor, Smartphone, X } from "lucide-react";

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

function getTargetIcon(target: InstallTarget["key"]) {
  if (target === "android") return Smartphone;
  if (target === "desktopLinux") return Monitor;
  if (target === "ios") return Apple;
  return Download;
}

export default function AppInstallPopup() {
  const [isVisible, setIsVisible] = useState(false);
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

  const installTarget = useMemo<InstallTarget>(() => {
    if (typeof window === "undefined") {
      return {
        key: "web",
        label: "Web app",
        note: "Installe la version navigateur officielle.",
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
        note: "Installation directe depuis le navigateur officiel KING League.",
        buttonLabel: "Installer",
        mode: "install",
        url: null,
      };
    }

    return {
      key: "web",
      label: isAndroid ? "Android" : "Navigateur",
      note: "Ouvre le menu du navigateur puis choisis Installer l'application ou Ajouter a l'ecran d'accueil.",
      buttonLabel: "Installer",
      mode: "guide",
      url: null,
    };
  }, [deferredPrompt, downloads, isIos]);

  const InstallIcon = getTargetIcon(installTarget.key);

  function closePopup() {
    writePopupPreference(true);
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

  function handlePrimaryAction() {
    if (installTarget.mode === "download" && installTarget.url) {
      writePopupPreference(true);
      setIsVisible(false);
      window.location.href = installTarget.url;
      return;
    }

    if (installTarget.mode === "install") {
      void installWebApp();
      return;
    }

    setShowManualSteps(true);
  }

  if (!isVisible || isInstalled) return null;

  return (
    <div className="tp-app-popup-backdrop" role="presentation">
      <section className="tp-app-popup" role="dialog" aria-labelledby="tp-app-popup-title">
        <button type="button" className="tp-app-popup-close" onClick={closePopup} aria-label="Fermer la fenetre d'installation">
          <X className="h-4 w-4" />
        </button>

        <div className="tp-app-popup-head">
          <div className="tp-app-popup-logo-wrap">
            <img src="/pp1-removebg-preview%20(1).png" alt="Logo KING League" className="tp-app-popup-logo" />
          </div>
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
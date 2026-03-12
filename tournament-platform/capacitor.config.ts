import type { CapacitorConfig } from "@capacitor/cli";

function normalizeAppUrl(value?: string) {
  const fallback = "https://kingleague.space";

  if (!value) return fallback;

  const trimmed = value.trim();

  try {
    const url = new URL(trimmed);
    if (url.hostname === "kingleaguespace" || url.hostname === "kingleaguespace.com") {
      return fallback;
    }

    return url.toString().replace(/\/$/, "");
  } catch {
    return fallback;
  }
}

const appUrl = normalizeAppUrl(process.env.KING_LEAGUE_APP_URL || process.env.NEXT_PUBLIC_SITE_URL);

const config: CapacitorConfig = {
  appId: "space.kingleague.app",
  appName: "KING League",
  webDir: "out",
  server: {
    url: appUrl,
    cleartext: appUrl.startsWith("http://"),
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    contentInset: "automatic",
    scrollEnabled: true,
  },
};

export default config;
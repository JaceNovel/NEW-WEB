import type { CapacitorConfig } from "@capacitor/cli";

const appUrl = process.env.KING_LEAGUE_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://kingleague.space";

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
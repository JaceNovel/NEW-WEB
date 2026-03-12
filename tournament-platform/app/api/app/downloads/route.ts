import { access, readdir } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { applyRateLimit, apiError } from "@/app/api/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DownloadInfo = {
  available: boolean;
  filename: string | null;
  url: string | null;
  label: string;
  note: string;
};

const appDownloadsRoot = path.join(process.cwd(), "public", "app-downloads");

async function findFirstMatchingFile(dirName: string, matcher: (name: string) => boolean) {
  const dirPath = path.join(appDownloadsRoot, dirName);
  try {
    const files = await readdir(dirPath, { withFileTypes: true });
    const match = files.find((entry) => entry.isFile() && matcher(entry.name));
    return match?.name ?? null;
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function hasPublicFile(relativePath: string) {
  try {
    await access(path.join(process.cwd(), "public", relativePath));
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    applyRateLimit("app-downloads");

    const androidFilename = await findFirstMatchingFile("android", (name) => name.toLowerCase().endsWith(".apk"));
    const desktopFilename = await findFirstMatchingFile("desktop", (name) => /\.appimage$/i.test(name));
    const loaderAvailable = await hasPublicFile("icons8-chargement-infini-50.apng.png");

    const payload: {
      android: DownloadInfo;
      desktopLinux: DownloadInfo;
      web: DownloadInfo;
      ios: DownloadInfo;
      assets: { loader: string | null };
    } = {
      android: {
        available: Boolean(androidFilename),
        filename: androidFilename,
        url: androidFilename ? "/api/app/download?platform=android" : null,
        label: "App Android",
        note: androidFilename
          ? "App KING League pour Android. Installation rapide sur ton telephone."
          : "L'app Android n'est pas encore disponible.",
      },
      desktopLinux: {
        available: Boolean(desktopFilename),
        filename: desktopFilename,
        url: desktopFilename ? "/api/app/download?platform=desktop-linux" : null,
        label: "App PC Linux",
        note: desktopFilename
          ? "App KING League pour PC Linux. Lance la plateforme en version bureau."
          : "L'app PC Linux n'est pas encore disponible.",
      },
      web: {
        available: true,
        filename: null,
        url: null,
        label: "Web App",
        note: "App web KING League avec installation directe depuis le navigateur.",
      },
      ios: {
        available: false,
        filename: null,
        url: null,
        label: "iPhone / iPad",
        note: "App KING League sur iPhone via Safari puis Sur l'ecran d'accueil.",
      },
      assets: {
        loader: loaderAvailable ? "/icons8-chargement-infini-50.apng.png" : null,
      },
    };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
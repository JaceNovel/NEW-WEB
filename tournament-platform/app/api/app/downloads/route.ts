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
        label: "Android APK",
        note: androidFilename
          ? "APK debug du wrapper KING League, telechargeable directement depuis le site."
          : "APK Android pas encore genere dans le dossier public.",
      },
      desktopLinux: {
        available: Boolean(desktopFilename),
        filename: desktopFilename,
        url: desktopFilename ? "/api/app/download?platform=desktop-linux" : null,
        label: "Desktop Linux",
        note: desktopFilename
          ? "AppImage Linux du wrapper desktop KING League."
          : "Binaire desktop Linux pas encore present dans le dossier public.",
      },
      web: {
        available: true,
        filename: null,
        url: null,
        label: "Web App",
        note: "Installation instantanee depuis le navigateur via le prompt PWA quand disponible.",
      },
      ios: {
        available: false,
        filename: null,
        url: null,
        label: "iPhone / iPad",
        note: "iOS ne permet pas ce type d'installation APK directe. Utilise Safari puis Sur l'ecran d'accueil.",
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
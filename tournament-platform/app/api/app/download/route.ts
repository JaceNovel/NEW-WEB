import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { NextRequest } from "next/server";

import { applyRateLimit, apiError } from "@/app/api/_utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const downloadMap = {
  android: {
    relativePath: path.join("public", "app-downloads", "android", "KING-League-debug.apk"),
    filename: "KING-League-debug.apk",
    contentType: "application/vnd.android.package-archive",
  },
  "desktop-linux": {
    relativePath: path.join("public", "app-downloads", "desktop", "KING-League-0.1.0-linux-x86_64.AppImage"),
    filename: "KING-League-0.1.0-linux-x86_64.AppImage",
    contentType: "application/octet-stream",
  },
} as const;

export async function GET(request: NextRequest) {
  try {
    applyRateLimit("app-download");

    const platform = request.nextUrl.searchParams.get("platform") as keyof typeof downloadMap | null;
    if (!platform || !(platform in downloadMap)) {
      const error = new Error("Unknown platform");
      // @ts-expect-error status attachment
      error.status = 404;
      throw error;
    }

    const target = downloadMap[platform];
    const filePath = path.join(process.cwd(), target.relativePath);

    await access(filePath);
    const file = await readFile(filePath);

    return new Response(file, {
      status: 200,
      headers: {
        "Content-Type": target.contentType,
        "Content-Disposition": `attachment; filename="${target.filename}"`,
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
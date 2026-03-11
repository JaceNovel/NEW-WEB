import { NextResponse } from "next/server";

import { apiError, applyRateLimit } from "@/app/api/_utils";

export async function POST() {
  try {
    applyRateLimit("upload-signature");

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const folder = process.env.CLOUDINARY_FOLDER ?? "tournament-platform";

    if (!cloudName || !apiKey || !apiSecret) {
      const error = new Error("Cloudinary env vars missing");
      // @ts-expect-error attach status
      error.status = 500;
      throw error;
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const crypto = await import("crypto");
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
    const signature = crypto.createHash("sha1").update(paramsToSign + apiSecret).digest("hex");

    return NextResponse.json({
      ok: true,
      cloudName,
      apiKey,
      timestamp,
      folder,
      signature,
    });
  } catch (error) {
    return apiError(error);
  }
}

import { NextResponse } from "next/server";

import { apiError, applyRateLimit } from "@/app/api/_utils";

async function createSignatureResponse() {
  applyRateLimit("upload-signature");

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const folder = process.env.CLOUDINARY_FOLDER ?? "tournament-platform";

  if (!cloudName || !apiKey || !apiSecret) {
    const missing = [
      !cloudName ? "CLOUDINARY_CLOUD_NAME" : null,
      !apiKey ? "CLOUDINARY_API_KEY" : null,
      !apiSecret ? "CLOUDINARY_API_SECRET" : null,
    ].filter(Boolean);

    const error = new Error(
      `Cloudinary env vars missing: ${missing.join(", ")}. Configure them in your deployment environment variables.`
    );
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
}

export async function POST() {
  try {
    return await createSignatureResponse();
  } catch (error) {
    return apiError(error);
  }
}

export async function GET() {
  try {
    return await createSignatureResponse();
  } catch (error) {
    return apiError(error);
  }
}

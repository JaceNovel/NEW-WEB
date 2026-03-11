import { NextResponse } from "next/server";

import { apiError, applyRateLimit } from "@/app/api/_utils";

const MAX_BYTES = 3 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function inferExtension(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/webp") return "webp";

  const name = file.name ?? "";
  const dot = name.lastIndexOf(".");
  if (dot >= 0 && dot < name.length - 1) {
    const ext = name.slice(dot + 1).toLowerCase();
    if (/^[a-z0-9]{1,5}$/.test(ext)) return ext;
  }
  return "bin";
}

export async function POST(request: Request) {
  try {
    applyRateLimit("upload-logo");

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      const error = new Error("Vercel Blob is not configured (missing BLOB_READ_WRITE_TOKEN)");
      // @ts-expect-error attach status
      error.status = 500;
      throw error;
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      const error = new Error("Missing file");
      // @ts-expect-error attach status
      error.status = 400;
      throw error;
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      const error = new Error("Unsupported file type. Use PNG, JPG, or WEBP.");
      // @ts-expect-error attach status
      error.status = 400;
      throw error;
    }

    if (file.size > MAX_BYTES) {
      const error = new Error("File too large (max 3MB)");
      // @ts-expect-error attach status
      error.status = 400;
      throw error;
    }

    const { put } = await import("@vercel/blob");
    const crypto = await import("crypto");

    const ext = inferExtension(file);
    const key = crypto.randomUUID();
    const pathname = `logos/${key}.${ext}`;

    const blob = await put(pathname, file, {
      access: "public",
      contentType: file.type,
    });

    return NextResponse.json({ ok: true, url: blob.url, pathname: blob.pathname });
  } catch (error) {
    return apiError(error);
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, hint: 'POST multipart/form-data with field "file"' });
}

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { ok: false, error: "Deprecated: use /api/upload/logo (Vercel Blob)" },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json(
    { ok: false, error: "Deprecated: use /api/upload/logo (Vercel Blob)" },
    { status: 410 }
  );
}

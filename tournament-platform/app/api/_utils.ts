import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { rateLimitOrThrow } from "@/lib/rateLimit";

export function getClientIp() {
  const h = headers();
  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  return h.get("x-real-ip") ?? "unknown";
}

export function apiError(error: unknown) {
  const status = typeof error === "object" && error && "status" in error ? (error as any).status : 400;
  const message = error instanceof Error ? error.message : "Invalid request";
  return NextResponse.json({ ok: false, error: message }, { status });
}

export function applyRateLimit(keyPrefix: string) {
  const ip = getClientIp();
  rateLimitOrThrow({
    key: `${keyPrefix}:${ip}`,
    limit: 30,
    windowMs: 60_000,
  });
}

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    const error = new Error("Unauthorized");
    // @ts-expect-error attach status
    error.status = 401;
    throw error;
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") {
    const error = new Error("Forbidden");
    // @ts-expect-error attach status
    error.status = 403;
    throw error;
  }
  return session;
}

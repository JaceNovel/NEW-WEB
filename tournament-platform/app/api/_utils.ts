import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { rateLimitOrThrow } from "@/lib/rateLimit";

type ErrorWithMetadata = {
  status?: number;
  httpStatus?: number | null;
  message?: string;
  errorMessage?: string;
  errors?: unknown;
};

function formatErrorDetails(value: unknown) {
  if (!value) return null;
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function getApiErrorInfo(error: unknown) {
  const candidate = (typeof error === "object" && error ? error : null) as ErrorWithMetadata | null;
  const status = typeof candidate?.status === "number"
    ? candidate.status
    : typeof candidate?.httpStatus === "number"
      ? candidate.httpStatus
      : 400;

  const baseMessage =
    typeof candidate?.errorMessage === "string" && candidate.errorMessage.trim()
      ? candidate.errorMessage.trim()
      : error instanceof Error
        ? error.message
        : typeof candidate?.message === "string" && candidate.message.trim()
          ? candidate.message.trim()
          : "Invalid request";

  const detailMessage = formatErrorDetails(candidate?.errors);

  return {
    status,
    message: detailMessage ? `${baseMessage} (${detailMessage})` : baseMessage,
    details: candidate?.errors ?? null,
  };
}

export function getClientIp() {
  const h = headers();
  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  return h.get("x-real-ip") ?? "unknown";
}

export function apiError(error: unknown) {
  const { status, message } = getApiErrorInfo(error);
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

import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_PUBLIC_SITE_URL = "https://kingleague.space";
const FEDAPAY_SANDBOX_BASE_URL = "https://sandbox-api.fedapay.com/v1";
const FEDAPAY_LIVE_BASE_URL = "https://api.fedapay.com/v1";
const PAID_STATUSES = new Set([
  "approved",
  "transferred",
  "refunded",
  "approved_partially_refunded",
  "transferred_partially_refunded",
]);

type HostedTransactionInput = {
  amountFcfa: number;
  merchantReference: string;
  callbackUrl: string;
  description: string;
  metadata?: Record<string, unknown>;
};

type FedaPayEnvironment = "sandbox" | "live";

function normalizeUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function normalizeEnvironment(value: string | null | undefined): FedaPayEnvironment {
  const normalized = (value ?? "sandbox").trim().toLowerCase();
  return normalized === "live" || normalized === "production" ? "live" : "sandbox";
}

function inferEnvironmentFromSecret(value: string | null | undefined): FedaPayEnvironment | null {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (!normalized) return null;
  if (normalized.startsWith("sk_live") || normalized.startsWith("wh_live")) return "live";
  if (
    normalized.startsWith("sk_sandbox") ||
    normalized.startsWith("sk_test") ||
    normalized.startsWith("wh_sandbox") ||
    normalized.startsWith("wh_test")
  ) {
    return "sandbox";
  }
  return null;
}

function getVariantValue(baseName: string, environment: FedaPayEnvironment) {
  const suffix = environment === "live" ? "LIVE" : "TEST";
  return process.env[`${baseName}_${suffix}`]?.trim() ?? "";
}

function getEnvValue(baseName: string, environment: FedaPayEnvironment) {
  const direct = process.env[baseName]?.trim();
  if (direct) return direct;

  const preferred = getVariantValue(baseName, environment);
  if (preferred) return preferred;

  return getVariantValue(baseName, environment === "live" ? "sandbox" : "live");
}

function serializeResource<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getFedaPayBaseUrl(environment: FedaPayEnvironment) {
  return environment === "live" ? FEDAPAY_LIVE_BASE_URL : FEDAPAY_SANDBOX_BASE_URL;
}

function buildFedaPayError(errorPayload: unknown, fallbackStatus: number): never {
  const payload = errorPayload && typeof errorPayload === "object" ? (errorPayload as Record<string, unknown>) : null;
  const message =
    typeof payload?.message === "string"
      ? payload.message
      : fallbackStatus === 401
        ? "Clé FedaPay invalide ou environnement FedaPay incorrect."
        : "Erreur FedaPay.";

  const error = new Error(message);
  // @ts-expect-error attach status
  error.status = fallbackStatus;
  // @ts-expect-error attach details
  error.details = payload?.errors ?? payload ?? {};
  throw error;
}

function resolveFedaPayConfig() {
  const requestedEnvironment = normalizeEnvironment(process.env.FEDAPAY_ENVIRONMENT);
  const directApiKey = process.env.FEDAPAY_SECRET_KEY?.trim() ?? "";
  const apiKey = directApiKey || getEnvValue("FEDAPAY_SECRET_KEY", requestedEnvironment);

  if (!apiKey) {
    const error = new Error("Configuration FedaPay incomplète: clé secrète manquante.");
    // @ts-expect-error attach status
    error.status = 500;
    throw error;
  }

  const environment = inferEnvironmentFromSecret(apiKey) ?? requestedEnvironment;
  const webhookSecret = getEnvValue("FEDAPAY_WEBHOOK_SECRET", environment);

  return {
    environment,
    apiKey,
    webhookSecret,
    baseUrl: getFedaPayBaseUrl(environment),
  };
}

async function fedapayRequest<T>(
  path: string,
  options?: {
    method?: "GET" | "POST";
    body?: Record<string, unknown>;
  },
) {
  const config = resolveFedaPayConfig();

  const res = await fetch(`${config.baseUrl}${path}`, {
    method: options?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "content-type": "application/json",
      "x-source": "KING League",
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  let payload: unknown = null;

  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    buildFedaPayError(payload, res.status);
  }

  return payload as T;
}

function parseSignatureHeader(header: string) {
  const timestamps: string[] = [];
  const signatures: string[] = [];

  for (const part of header.split(",")) {
    const [key, value] = part.split("=");
    if (!key || !value) continue;
    if (key === "t") timestamps.push(value);
    if (key === "s") signatures.push(value);
  }

  return {
    timestamp: timestamps[0] ?? null,
    signatures,
  };
}

function secureCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function getPublicSiteUrl() {
  const candidate =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.KING_LEAGUE_APP_URL?.trim() ||
    DEFAULT_PUBLIC_SITE_URL;

  return normalizeUrl(candidate);
}

export function ensureFedaPayConfigured() {
  const config = resolveFedaPayConfig();
  return {
    environment: config.environment,
    baseUrl: config.baseUrl,
  };
}

function ensureFedaPayWebhookConfigured() {
  const config = resolveFedaPayConfig();
  if (!config.webhookSecret) {
    const error = new Error("Configuration FedaPay incomplète: secret webhook manquant.");
    // @ts-expect-error attach status
    error.status = 500;
    throw error;
  }

  return config;
}

export async function createHostedCreditTransaction(input: HostedTransactionInput) {
  ensureFedaPayConfigured();

  const transactionPayload = await fedapayRequest<Record<string, unknown>>("/transactions", {
    method: "POST",
    body: {
      description: input.description,
      amount: input.amountFcfa,
      currency: { iso: "XOF" },
      callback_url: input.callbackUrl,
      merchant_reference: input.merchantReference,
      custom_metadata: input.metadata ?? {},
    },
  });

  const transaction = (transactionPayload["v1/transaction"] ?? transactionPayload.transaction ?? transactionPayload) as Record<string, unknown>;
  const transactionId = transaction.id ? String(transaction.id) : null;

  if (!transactionId) {
    const error = new Error("FedaPay n'a pas retourné d'identifiant de transaction.");
    // @ts-expect-error attach status
    error.status = 502;
    throw error;
  }

  const token = await fedapayRequest<Record<string, unknown>>(`/transactions/${encodeURIComponent(transactionId)}/token`, {
    method: "POST",
  });

  return {
    transactionId,
    transactionKey: transaction.transaction_key ? String(transaction.transaction_key) : null,
    reference: transaction.reference ? String(transaction.reference) : null,
    token: token.token ? String(token.token) : null,
    checkoutUrl: token.url ? String(token.url) : null,
    status: transaction.status ? String(transaction.status) : "pending",
    rawTransaction: serializeResource(transaction),
    rawToken: serializeResource(token),
  };
}

export function constructWebhookEvent(payload: string, signature: string) {
  const config = ensureFedaPayWebhookConfigured();
  const { timestamp, signatures } = parseSignatureHeader(signature);

  if (!timestamp || !signatures.length) {
    const error = new Error("Signature webhook FedaPay invalide.");
    // @ts-expect-error attach status
    error.status = 400;
    throw error;
  }

  const expected = createHmac("sha256", config.webhookSecret)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest("hex");

  if (!signatures.some((candidate) => secureCompare(candidate, expected))) {
    const error = new Error("Signature webhook FedaPay invalide.");
    // @ts-expect-error attach status
    error.status = 400;
    throw error;
  }

  const ageSeconds = Math.floor(Date.now() / 1000) - Number(timestamp);
  if (Number.isFinite(ageSeconds) && ageSeconds > 300) {
    const error = new Error("Signature webhook FedaPay expirée.");
    // @ts-expect-error attach status
    error.status = 400;
    throw error;
  }

  return JSON.parse(payload) as Record<string, unknown>;
}

export async function retrieveTransaction(transactionId: string) {
  ensureFedaPayConfigured();
  const payload = await fedapayRequest<Record<string, unknown>>(`/transactions/${encodeURIComponent(transactionId)}`);
  const transaction = (payload["v1/transaction"] ?? payload.transaction ?? payload) as Record<string, unknown>;

  return {
    transactionId,
    status: typeof transaction.status === "string" ? transaction.status.toLowerCase() : "pending",
    reference: typeof transaction.reference === "string" ? transaction.reference : null,
    merchantReference: typeof transaction.merchant_reference === "string" ? transaction.merchant_reference : null,
    transactionKey: typeof transaction.transaction_key === "string" ? transaction.transaction_key : null,
    payload: serializeResource(transaction),
    wasPaid: PAID_STATUSES.has(String(transaction.status ?? "").toLowerCase()),
  };
}

export function isPaidTransactionStatus(status: string) {
  return PAID_STATUSES.has(status.toLowerCase());
}
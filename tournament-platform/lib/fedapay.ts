import { FedaPay, Transaction, Webhook } from "fedapay";

const DEFAULT_PUBLIC_SITE_URL = "https://kingleague.space";
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

function normalizeUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function getFedaPayEnvironment() {
  const value = (process.env.FEDAPAY_ENVIRONMENT ?? "sandbox").trim().toLowerCase();
  return value === "live" ? "live" : "sandbox";
}

function getEnvValue(baseName: string) {
  const environment = getFedaPayEnvironment();
  const direct = process.env[baseName]?.trim();
  if (direct) return direct;

  const suffix = environment === "live" ? "LIVE" : "TEST";
  return process.env[`${baseName}_${suffix}`]?.trim() ?? "";
}

function serializeResource<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
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
  const apiKey = getEnvValue("FEDAPAY_SECRET_KEY");
  const webhookSecret = getEnvValue("FEDAPAY_WEBHOOK_SECRET");

  if (!apiKey) {
    const error = new Error("Configuration FedaPay incomplète: clé secrète manquante.");
    // @ts-expect-error attach status
    error.status = 500;
    throw error;
  }

  if (!webhookSecret) {
    const error = new Error("Configuration FedaPay incomplète: secret webhook manquant.");
    // @ts-expect-error attach status
    error.status = 500;
    throw error;
  }

  FedaPay.setEnvironment(getFedaPayEnvironment());
  FedaPay.setApiKey(apiKey);
}

function getWebhookSecret() {
  const secret = getEnvValue("FEDAPAY_WEBHOOK_SECRET");
  if (!secret) {
    const error = new Error("Secret webhook FedaPay manquant.");
    // @ts-expect-error attach status
    error.status = 500;
    throw error;
  }

  return secret;
}

export async function createHostedCreditTransaction(input: HostedTransactionInput) {
  ensureFedaPayConfigured();

  const transaction = await Transaction.create({
    description: input.description,
    amount: input.amountFcfa,
    currency: { iso: "XOF" },
    callback_url: input.callbackUrl,
    merchant_reference: input.merchantReference,
    custom_metadata: input.metadata ?? {},
  });

  const token = await transaction.generateToken();

  return {
    transactionId: transaction.id ? String(transaction.id) : null,
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
  ensureFedaPayConfigured();
  return Webhook.constructEvent(payload, signature, getWebhookSecret());
}

export async function retrieveTransaction(transactionId: string) {
  ensureFedaPayConfigured();
  const transaction = await Transaction.retrieve(transactionId);
  const serialized = serializeResource(transaction) as Record<string, unknown>;

  return {
    transactionId,
    status: typeof serialized.status === "string" ? serialized.status.toLowerCase() : "pending",
    reference: typeof serialized.reference === "string" ? serialized.reference : null,
    merchantReference: typeof serialized.merchant_reference === "string" ? serialized.merchant_reference : null,
    transactionKey: typeof serialized.transaction_key === "string" ? serialized.transaction_key : null,
    payload: serialized,
    wasPaid: typeof transaction.wasPaid === "function" ? transaction.wasPaid() : PAID_STATUSES.has(String(serialized.status ?? "").toLowerCase()),
  };
}

export function isPaidTransactionStatus(status: string) {
  return PAID_STATUSES.has(status.toLowerCase());
}
const BREVO_BASE_URL = "https://api.brevo.com/v3";
const DEFAULT_SENDER_NAME = "KING League";

export type BrevoRecipient = {
  email: string;
  name?: string | null;
};

type SendBrevoEmailInput = {
  to?: BrevoRecipient[];
  bcc?: BrevoRecipient[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  tags?: string[];
  replyTo?: BrevoRecipient;
  headers?: Record<string, string>;
};

function normalizeUrl(value: string) {
  return value.replace(/\/+$/, "");
}

export function getAppBaseUrl() {
  const candidate =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.KING_LEAGUE_APP_URL?.trim() ||
    "https://kingleague.space";

  return normalizeUrl(candidate);
}

export function isBrevoConfigured() {
  return Boolean(process.env.BREVO_API_KEY?.trim() && process.env.BREVO_SENDER_EMAIL?.trim());
}

export function getBrevoSender() {
  const email = process.env.BREVO_SENDER_EMAIL?.trim();
  if (!email) {
    throw new Error("Configuration Brevo incomplète: BREVO_SENDER_EMAIL manquant.");
  }

  return {
    email,
    name: process.env.BREVO_SENDER_NAME?.trim() || DEFAULT_SENDER_NAME,
  };
}

function getBrevoApiKey() {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Configuration Brevo incomplète: BREVO_API_KEY manquant.");
  }

  return apiKey;
}

function normalizeRecipient(recipient: BrevoRecipient) {
  return {
    email: recipient.email.trim().toLowerCase(),
    ...(recipient.name?.trim() ? { name: recipient.name.trim() } : {}),
  };
}

export async function sendBrevoEmail(input: SendBrevoEmailInput) {
  const sender = getBrevoSender();
  const apiKey = getBrevoApiKey();

  const to = (input.to ?? []).map(normalizeRecipient);
  const bcc = (input.bcc ?? []).map(normalizeRecipient);

  if (!to.length && !bcc.length) {
    return null;
  }

  const body = {
    sender,
    to: to.length ? to : [sender],
    ...(bcc.length ? { bcc } : {}),
    subject: input.subject,
    htmlContent: input.htmlContent,
    ...(input.textContent ? { textContent: input.textContent } : {}),
    ...(input.tags?.length ? { tags: input.tags } : {}),
    ...(input.replyTo ? { replyTo: normalizeRecipient(input.replyTo) } : {}),
    ...(input.headers ? { headers: input.headers } : {}),
  };

  const res = await fetch(`${BREVO_BASE_URL}/smtp/email`, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    let errorPayload: unknown = null;

    try {
      errorPayload = await res.json();
    } catch {
      errorPayload = await res.text();
    }

    const details = typeof errorPayload === "string" ? errorPayload : JSON.stringify(errorPayload);
    const error = new Error(`Brevo error ${res.status}: ${details}`);
    // @ts-expect-error attach status
    error.status = res.status;
    throw error;
  }

  return res.status === 204 ? null : res.json();
}

export async function sendBrevoBroadcastEmail(input: Omit<SendBrevoEmailInput, "to" | "bcc"> & { recipients: BrevoRecipient[] }) {
  const recipients = input.recipients
    .map(normalizeRecipient)
    .filter((recipient, index, list) => list.findIndex((entry) => entry.email === recipient.email) === index);

  if (!recipients.length) {
    return null;
  }

  return sendBrevoEmail({
    subject: input.subject,
    htmlContent: input.htmlContent,
    textContent: input.textContent,
    tags: input.tags,
    headers: input.headers,
    replyTo: input.replyTo,
    bcc: recipients,
  });
}
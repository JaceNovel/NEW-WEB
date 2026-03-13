import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const ENV_FILES = [".env.local", ".env"];
const BREVO_BASE_URL = "https://api.brevo.com/v3";

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || key in process.env) continue;

    let value = trimmed.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

for (const envFile of ENV_FILES) {
  readEnvFile(path.join(projectRoot, envFile));
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const normalized = value?.trim();
    if (normalized) return normalized;
  }
  return "";
}

function looksLikeBrevoApiKey(value) {
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith("xkeysib-") || normalized.startsWith("xkeysib_");
}

function getConfig() {
  const senderEmail = firstNonEmpty(process.env.BREVO_SENDER_EMAIL, process.env.MAIL_FROM_ADDRESS);
  const senderName = firstNonEmpty(process.env.BREVO_SENDER_NAME, process.env.MAIL_FROM_NAME) || "KING League";
  const apiKey = firstNonEmpty(process.env.BREVO_API_KEY, process.env.MAIL_PASSWORD, process.env.MAIL_USERNAME);
  const missing = [];

  if (!senderEmail) missing.push("BREVO_SENDER_EMAIL ou MAIL_FROM_ADDRESS");
  if (!apiKey) missing.push("BREVO_API_KEY ou MAIL_PASSWORD ou MAIL_USERNAME");
  if (apiKey && !looksLikeBrevoApiKey(apiKey)) missing.push("Format de cle API Brevo invalide (attendu: xkeysib-...)");

  return {
    senderEmail,
    senderName,
    apiKey,
    missing,
  };
}

function getArg(name) {
  const prefix = `--${name}=`;
  const entry = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return entry ? entry.slice(prefix.length).trim() : "";
}

async function main() {
  const config = getConfig();
  const targetEmail = getArg("to");

  console.log("Etat Brevo:");
  console.log(JSON.stringify({
    senderEmail: config.senderEmail || null,
    senderName: config.senderName,
    apiKeyConfigured: Boolean(config.apiKey),
    apiKeyLooksValid: config.apiKey ? looksLikeBrevoApiKey(config.apiKey) : false,
    missing: config.missing,
    envFilesChecked: ENV_FILES,
  }, null, 2));

  if (config.missing.length) {
    process.exitCode = 1;
    return;
  }

  if (!targetEmail) {
    console.log("Ajoute --to=adresse@example.com pour envoyer un email de test.");
    return;
  }

  const response = await fetch(`${BREVO_BASE_URL}/smtp/email`, {
    method: "POST",
    headers: {
      "api-key": config.apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        email: config.senderEmail,
        name: config.senderName,
      },
      to: [{ email: targetEmail }],
      subject: "Test Brevo KING League",
      htmlContent: "<p>Test Brevo depuis le diagnostic local KING League.</p>",
      textContent: "Test Brevo depuis le diagnostic local KING League.",
      tags: ["diagnostic"],
    }),
  });

  if (!response.ok) {
    let details;
    try {
      details = await response.json();
    } catch {
      details = await response.text();
    }

    console.error("Echec Brevo:");
    console.error(typeof details === "string" ? details : JSON.stringify(details, null, 2));
    process.exitCode = 1;
    return;
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  console.log("Envoi accepte par Brevo.");
  if (payload) {
    console.log(JSON.stringify(payload, null, 2));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
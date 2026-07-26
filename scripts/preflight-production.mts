import { createHash } from "node:crypto";

const required = [
  "DATABASE_URL",
  "PAYMENT_CALLBACK_SECRET",
  "ERP_WEBHOOK_SECRET",
  "EMAIL_SETTINGS_ENCRYPTION_KEY",
  "SUPER_ADMIN_EMAIL",
  "SUPER_ADMIN_PASSWORD",
  "VANSTRO_CORS_ORIGINS"
] as const;

const failures: string[] = [];
for (const name of required) {
  const value = process.env[name]?.trim();
  if (!value) failures.push(`${name} is required.`);
}

if (process.env.VANSTRO_RUNTIME_MODE !== "deployment") {
  failures.push("VANSTRO_RUNTIME_MODE must be deployment.");
}
if (process.env.ENABLE_PAYMENT_SIMULATION?.toLowerCase() === "true") {
  failures.push("ENABLE_PAYMENT_SIMULATION must be false.");
}
if (process.env.NEXT_PUBLIC_ENABLE_PAYMENT_SIMULATION?.toLowerCase() === "true") {
  failures.push("NEXT_PUBLIC_ENABLE_PAYMENT_SIMULATION must be false.");
}

for (const name of ["PAYMENT_CALLBACK_SECRET", "ERP_WEBHOOK_SECRET"] as const) {
  const value = process.env[name]?.trim() ?? "";
  if (value.length < 32 || /replace|example|changeme/i.test(value)) {
    failures.push(`${name} must be a non-placeholder secret of at least 32 characters.`);
  }
}

const encryptionKey = process.env.EMAIL_SETTINGS_ENCRYPTION_KEY?.trim();
if (encryptionKey) {
  try {
    if (Buffer.from(encryptionKey, "base64").length !== 32) throw new Error();
  } catch {
    failures.push("EMAIL_SETTINGS_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  }
}

const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl) {
  try {
    const url = new URL(databaseUrl);
    if (!url.protocol.startsWith("postgres")) failures.push("DATABASE_URL must use PostgreSQL.");
    if (/localhost|127\.0\.0\.1/.test(url.hostname)) failures.push("Production DATABASE_URL must not point to localhost.");
  } catch {
    failures.push("DATABASE_URL is invalid.");
  }
}

const moneris = ["MONERIS_STORE_ID", "MONERIS_API_TOKEN", "MONERIS_CHECKOUT_ID"];
const monerisConfigured = moneris.every((name) => Boolean(process.env[name]?.trim()));
if (process.env.MONERIS_ENVIRONMENT === "prod" && !monerisConfigured) {
  failures.push("All MONERIS credentials are required for production card payments.");
}

if (failures.length) {
  console.error("Production preflight failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  runtimeMode: process.env.VANSTRO_RUNTIME_MODE,
  monerisConfigured,
  configurationFingerprint: createHash("sha256")
    .update(required.map((name) => `${name}:${Boolean(process.env[name]?.trim())}`).join("|"))
    .digest("hex")
    .slice(0, 16)
}, null, 2));

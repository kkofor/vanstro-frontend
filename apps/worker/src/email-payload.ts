import { decryptSecret } from "@vanstro/db";

export function resolveEmailPayload(payload: unknown, encryptionKey?: string) {
  const values = payload && typeof payload === "object" && !Array.isArray(payload)
    ? { ...(payload as Record<string, unknown>) }
    : {};

  if (!values.encryptedSecurityPayload) return values;
  if (!encryptionKey) {
    throw new Error("EMAIL_SETTINGS_ENCRYPTION_KEY is required for security email payloads.");
  }

  const decrypted = JSON.parse(
    decryptSecret(values.encryptedSecurityPayload, encryptionKey)
  ) as Record<string, unknown>;
  delete values.encryptedSecurityPayload;
  return { ...values, ...decrypted };
}

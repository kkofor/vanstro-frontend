import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

type EncryptedSecret = {
  version: 1;
  iv: string;
  ciphertext: string;
  tag: string;
};

function encryptionKey(value: string) {
  const key = Buffer.from(value, "base64");
  if (key.length !== 32) {
    throw new Error("EMAIL_SETTINGS_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  }
  return key;
}

export function encryptSecret(value: string, encodedKey: string): EncryptedSecret {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(encodedKey), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return {
    version: 1,
    iv: iv.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
    tag: cipher.getAuthTag().toString("base64")
  };
}

export function decryptSecret(value: unknown, encodedKey: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Encrypted secret payload is invalid.");
  }
  const record = value as Record<string, unknown>;
  if (
    record.version !== 1 ||
    typeof record.iv !== "string" ||
    typeof record.ciphertext !== "string" ||
    typeof record.tag !== "string"
  ) {
    throw new Error("Encrypted secret payload is invalid.");
  }
  const decipher = createDecipheriv(
    ALGORITHM,
    encryptionKey(encodedKey),
    Buffer.from(record.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(record.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(record.ciphertext, "base64")),
    decipher.final()
  ]).toString("utf8");
}

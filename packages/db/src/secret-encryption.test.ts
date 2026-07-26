import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { decryptSecret, encryptSecret } from "./secret-encryption.js";

test("SMTP secret encryption round trips without plaintext storage", () => {
  const key = randomBytes(32).toString("base64");
  const encrypted = encryptSecret("smtp-password", key);
  assert.equal(JSON.stringify(encrypted).includes("smtp-password"), false);
  assert.equal(decryptSecret(encrypted, key), "smtp-password");
});

test("SMTP secret encryption rejects invalid key length", () => {
  assert.throws(() => encryptSecret("secret", "invalid"), /base64-encoded 32-byte key/);
});

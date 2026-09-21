import assert from "node:assert/strict";
import test from "node:test";
import { encryptSecret } from "@vanstro/db";
import { resolveEmailPayload } from "./email-payload.js";

const key = Buffer.alloc(32, 7).toString("base64");

test("security email payload decrypts without retaining the encrypted envelope", () => {
  const payload = {
    publicValue: "kept",
    encryptedSecurityPayload: encryptSecret(JSON.stringify({ resetUrl: "https://vanstro.ca/reset?token=test" }), key)
  };

  assert.deepEqual(resolveEmailPayload(payload, key), {
    publicValue: "kept",
    resetUrl: "https://vanstro.ca/reset?token=test"
  });
});

test("security email payload fails closed without the encryption key", () => {
  const payload = {
    encryptedSecurityPayload: encryptSecret(JSON.stringify({ resetUrl: "sensitive" }), key)
  };

  assert.throws(() => resolveEmailPayload(payload), /EMAIL_SETTINGS_ENCRYPTION_KEY/);
});

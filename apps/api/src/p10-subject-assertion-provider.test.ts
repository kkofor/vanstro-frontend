import assert from "node:assert/strict";
import { createHmac, createHash, generateKeyPairSync, verify } from "node:crypto";
import test from "node:test";
import { OwnedConformanceP10SubjectAssertionProvider, P10AssertionUnavailableError } from "./p10-subject-assertion-provider.js";

const frame = (values: Array<string | Buffer>) => Buffer.concat(values.map((value) => {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
  const length = Buffer.alloc(4); length.writeUInt32BE(bytes.length); return Buffer.concat([length, bytes]);
}));

test("P10 provider matches frozen HMAC and 12-field assertion framing", async () => {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const key = Buffer.alloc(32, 0x42);
  const provider = new OwnedConformanceP10SubjectAssertionProvider({ subjectHmacKey: key, signerId: "subject-signer-test", signerKid: "test-a", signerEpoch: "vanstro.analytics.subject-epoch.v1:test-a", privateKeyPem: privateKey.export({ format: "pem", type: "pkcs8" }).toString() });
  const userId = "123e4567-e89b-42d3-a456-426614174000";
  const sessionId = "s1";
  const sessionTokenHash = "1".repeat(64);
  const idempotencyHash = "2".repeat(64);
  const prepared = provider.prepare(userId, idempotencyHash, new Date("2026-08-04T12:00:00.000Z"));
  const expectedDigest = createHmac("sha256", key).update(frame(["vanstro.analytics.authenticated-subject.v1", "vanstro.authenticated-user.v1", Buffer.from(userId.replaceAll("-", ""), "hex")])).digest();
  assert.deepEqual(prepared.subjectDigest, expectedDigest);
  assert.deepEqual(provider.prepare(userId, idempotencyHash, new Date("2026-08-04T12:00:00.000Z")), prepared);
  const intentHash = "3".repeat(64);
  const assertion = await provider.create({ userId, sessionId, sessionTokenHash, operation: "analytics.ingest", idempotencyHash, intentHash, subjectDigest: prepared.subjectDigest, nonce: prepared.nonce, expiresAt: prepared.expiresAt });
  const payload = frame(["vanstro.subject-assertion.v1", userId, sessionId, createHash("sha256").update(sessionTokenHash).digest("hex"), "test-a", "vanstro.analytics.subject-epoch.v1:test-a", "analytics.ingest", String(prepared.expiresAt.getTime() / 1000), prepared.nonce, expectedDigest.toString("hex"), idempotencyHash, intentHash]);
  assert.equal(verify(null, payload, publicKey, assertion.signature), true);
});

test("P10 provider rejects non-canonical actor UUID", () => {
  const { privateKey } = generateKeyPairSync("ed25519");
  const provider = new OwnedConformanceP10SubjectAssertionProvider({ subjectHmacKey: Buffer.alloc(32), signerId: "s", signerKid: "test-a", signerEpoch: "vanstro.analytics.subject-epoch.v1:test-a", privateKeyPem: privateKey.export({ format: "pem", type: "pkcs8" }).toString() });
  assert.throws(() => provider.prepare("123E4567-E89B-42D3-A456-426614174000", "2".repeat(64)), P10AssertionUnavailableError);
});

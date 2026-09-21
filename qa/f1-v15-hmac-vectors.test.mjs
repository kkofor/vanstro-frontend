import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const modelPath = "/Users/zhangguannan/Documents/codex/vanstro-backups/f1-authority-package-v1.5-20260804/source/authority-model.yaml";
const model = JSON.parse(await readFile(modelPath, "utf8"));
const authority = model.authenticatedSubjectAuthority;

function strictUuidBytes(value) {
  assert.match(value, /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u);
  return Buffer.from(value.replaceAll("-", ""), "hex");
}

function frame(bytes) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(bytes.length);
  return Buffer.concat([length, bytes]);
}

function nodeDerive(vector, options = {}) {
  const domain = Buffer.from(options.domain ?? authority.domainAscii, "ascii");
  const realm = Buffer.from(options.realm ?? authority.realmAscii, "ascii");
  const uuid = options.uuidTextBytes
    ? Buffer.from(vector.actorUuid, "ascii")
    : strictUuidBytes(vector.actorUuid);
  const frames = [frame(domain), frame(realm), frame(uuid)];
  const message = Buffer.concat(options.reverseOrder ? frames.reverse() : frames);
  return {
    message,
    digest: createHmac("sha256", Buffer.from(vector.testOnlyKeyHex, "hex")).update(message).digest("hex")
  };
}

// PostgreSQL reference semantics: int4send(octet_length(x)) || x and pgcrypto hmac(..., 'sha256').
function postgresReferenceDerive(vector) {
  const int4send = length => {
    const bytes = Buffer.alloc(4);
    bytes.writeInt32BE(length);
    return bytes;
  };
  const rawUuid = Buffer.from(vector.actorUuid.replaceAll("-", ""), "hex");
  const fields = [Buffer.from(authority.domainAscii, "ascii"), Buffer.from(authority.realmAscii, "ascii"), rawUuid];
  const message = Buffer.concat(fields.flatMap(bytes => [int4send(bytes.length), bytes]));
  return {
    message,
    digest: createHmac("sha256", Buffer.from(vector.testOnlyKeyHex, "hex")).update(message).digest("hex")
  };
}

test("Node and PostgreSQL reference implementations match all frozen vectors", () => {
  assert.ok(authority.goldenVectors.length >= 12);
  for (const vector of authority.goldenVectors) {
    const node = nodeDerive(vector);
    const postgres = postgresReferenceDerive(vector);
    assert.equal(node.message.toString("hex"), vector.framedMessageHex, vector.id);
    assert.equal(postgres.message.toString("hex"), vector.framedMessageHex, vector.id);
    assert.equal(node.digest, vector.expectedDigestHex, vector.id);
    assert.equal(postgres.digest, vector.expectedDigestHex, vector.id);
  }
});

test("field order, domain, realm, and UUID text mutations change the digest", () => {
  const vector = authority.goldenVectors[0];
  const expected = vector.expectedDigestHex;
  assert.notEqual(nodeDerive(vector, { reverseOrder: true }).digest, expected);
  assert.notEqual(nodeDerive(vector, { domain: `${authority.domainAscii}.wrong` }).digest, expected);
  assert.notEqual(nodeDerive(vector, { realm: `${authority.realmAscii}.wrong` }).digest, expected);
  assert.notEqual(nodeDerive(vector, { uuidTextBytes: true }).digest, expected);
});

test("u64 and little-endian length framing change the digest", () => {
  const vector = authority.goldenVectors[0];
  const fields = [Buffer.from(authority.domainAscii), Buffer.from(authority.realmAscii), strictUuidBytes(vector.actorUuid)];
  const derive = encode => createHmac("sha256", Buffer.from(vector.testOnlyKeyHex, "hex"))
    .update(Buffer.concat(fields.flatMap(bytes => [encode(bytes.length), bytes]))).digest("hex");
  const u64 = length => { const value = Buffer.alloc(8); value.writeBigUInt64BE(BigInt(length)); return value; };
  const le = length => { const value = Buffer.alloc(4); value.writeUInt32LE(length); return value; };
  assert.notEqual(derive(u64), vector.expectedDigestHex);
  assert.notEqual(derive(le), vector.expectedDigestHex);
});

test("strict UUID parser rejects uppercase, trimming, and malformed text", () => {
  assert.throws(() => strictUuidBytes("123E4567-E89B-42D3-A456-426614174000"));
  assert.throws(() => strictUuidBytes(" 123e4567-e89b-42d3-a456-426614174000"));
  assert.throws(() => strictUuidBytes("123e4567e89b42d3a456426614174000"));
});

test("KID changes epoch and key changes digest", () => {
  const left = authority.goldenVectors.find(item => item.actorUuid === authority.goldenVectors[0].actorUuid && item.kid === "test-kid-a");
  const right = authority.goldenVectors.find(item => item.actorUuid === left.actorUuid && item.kid === "test-kid-b");
  assert.ok(right);
  assert.notEqual(left.expectedDigestHex, right.expectedDigestHex);
  assert.notEqual(left.expectedIdentityEpoch, right.expectedIdentityEpoch);
});

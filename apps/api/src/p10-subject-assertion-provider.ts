import { createHash, createHmac, createPrivateKey, sign } from "node:crypto";
import { readFileSync } from "node:fs";

export type P10SubjectAssertion = {
  subjectDigest: Buffer;
  signerId: string;
  signerKid: string;
  signerEpoch: string;
  nonce: string;
  expiresAt: Date;
  signature: Buffer;
};

export type P10SubjectAssertionInput = {
  userId: string;
  sessionId: string;
  sessionTokenHash: string;
  operation: "analytics.ingest";
  idempotencyHash: string;
  intentHash: string;
  subjectDigest: Buffer;
  nonce: string;
  expiresAt: Date;
};

export interface P10SubjectAssertionProvider {
  readonly mode: "owned_conformance" | "disabled";
  prepare(userId: string, idempotencyHash: string, now?: Date): { subjectDigest: Buffer; signerId: string; signerKid: string; signerEpoch: string; nonce: string; expiresAt: Date; eventId: string; requestId: string };
  create(input: P10SubjectAssertionInput): Promise<P10SubjectAssertion>;
}

export class P10AssertionUnavailableError extends Error {
  readonly code = "ANALYTICS_INGESTION_UNAVAILABLE";
  constructor() { super("Analytics ingestion is unavailable."); this.name = "P10AssertionUnavailableError"; }
}

export class DisabledP10SubjectAssertionProvider implements P10SubjectAssertionProvider {
  readonly mode = "disabled" as const;
  prepare(_userId: string, _idempotencyHash: string): ReturnType<P10SubjectAssertionProvider["prepare"]> { throw new P10AssertionUnavailableError(); }
  async create(_input: P10SubjectAssertionInput): Promise<P10SubjectAssertion> { throw new P10AssertionUnavailableError(); }
}

export type OwnedConformanceProviderOptions = {
  subjectHmacKey: Buffer;
  signerId: string;
  signerKid: string;
  signerEpoch: string;
  privateKeyPem: string;
};

const frame = (values: Array<string | Buffer>) => Buffer.concat(values.map((value) => {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value, "utf8");
  const length = Buffer.allocUnsafe(4); length.writeUInt32BE(bytes.length); return Buffer.concat([length, bytes]);
}));
const canonicalUuidBytes = (value: string) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value)) throw new P10AssertionUnavailableError();
  return Buffer.from(value.replaceAll("-", ""), "hex");
};

export function createP10SubjectAssertionProvider(env: NodeJS.ProcessEnv = process.env): P10SubjectAssertionProvider {
  if (env.P10_SUBJECT_ASSERTION_PROVIDER !== "owned_conformance" || env.VANSTRO_RUNTIME_MODE !== "test" || env.P10_OWNED_CONFORMANCE !== "true") return new DisabledP10SubjectAssertionProvider();
  const hmacKey = env.P10_SUBJECT_HMAC_KEY;
  const privateKeyPath = env.P10_ASSERTION_PRIVATE_KEY_PATH;
  const signerId = env.P10_ASSERTION_SIGNER_ID;
  const signerKid = env.P10_ASSERTION_SIGNER_KID;
  const signerEpoch = env.P10_ASSERTION_SIGNER_EPOCH;
  if (!hmacKey || !privateKeyPath || !signerId || !signerKid || !/^[a-z0-9][a-z0-9._-]{0,31}$/.test(signerKid) || signerEpoch !== `vanstro.analytics.subject-epoch.v1:${signerKid}`) return new DisabledP10SubjectAssertionProvider();
  try {
    const subjectHmacKey = Buffer.from(hmacKey, "base64");
    if (subjectHmacKey.length !== 32) return new DisabledP10SubjectAssertionProvider();
    const privateKeyPem = readFileSync(privateKeyPath, "utf8");
    const privateKey = createPrivateKey(privateKeyPem);
    if (privateKey.type !== "private" || privateKey.asymmetricKeyType !== "ed25519") return new DisabledP10SubjectAssertionProvider();
    return new OwnedConformanceP10SubjectAssertionProvider({ subjectHmacKey, privateKeyPem, signerId, signerKid, signerEpoch });
  } catch { return new DisabledP10SubjectAssertionProvider(); }
}

export class OwnedConformanceP10SubjectAssertionProvider implements P10SubjectAssertionProvider {
  readonly mode = "owned_conformance" as const;
  constructor(private readonly options: OwnedConformanceProviderOptions) {}

  prepare(userId: string, idempotencyHash: string, now = new Date()) {
    const identity = createHmac("sha256", this.options.subjectHmacKey).update(frame(["vanstro.analytics-ingest-command.v1", userId, idempotencyHash])).digest();
    const uuid = Buffer.from(identity.subarray(0, 16)); uuid[6] = (uuid[6]! & 0x0f) | 0x40; uuid[8] = (uuid[8]! & 0x3f) | 0x80;
    const hex = uuid.toString("hex");
    return {
      subjectDigest: createHmac("sha256", this.options.subjectHmacKey).update(frame(["vanstro.analytics.authenticated-subject.v1", "vanstro.authenticated-user.v1", canonicalUuidBytes(userId)])).digest(),
      signerId: this.options.signerId,
      signerKid: this.options.signerKid,
      signerEpoch: this.options.signerEpoch,
      nonce: identity.subarray(16).toString("base64url") + identity.subarray(0, 8).toString("base64url"),
      expiresAt: new Date(Math.floor((now.getTime() + 5 * 60_000) / 1000) * 1000),
      eventId: `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`,
      requestId: `p10-${identity.toString("base64url")}`,
    };
  }

  async create(input: P10SubjectAssertionInput): Promise<P10SubjectAssertion> {
    const tokenFingerprint = createHash("sha256").update(input.sessionTokenHash, "utf8").digest("hex");
    const payload = frame([
      "vanstro.subject-assertion.v1", input.userId, input.sessionId, tokenFingerprint,
      this.options.signerKid, this.options.signerEpoch, input.operation,
      String(Math.floor(input.expiresAt.getTime() / 1000)), input.nonce, input.subjectDigest.toString("hex"),
      input.idempotencyHash, input.intentHash,
    ]);
    return { subjectDigest: input.subjectDigest, signerId: this.options.signerId, signerKid: this.options.signerKid, signerEpoch: this.options.signerEpoch, nonce: input.nonce, expiresAt: input.expiresAt, signature: sign(null, payload, this.options.privateKeyPem) };
  }
}

import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

const HASH_LENGTH_BYTES = 32;
const DEFAULT_ITERATIONS = 310000;
const HASH_DIGEST = "sha256";

export type PasswordHashData = {
  algorithm: string;
  passwordHash: string;
  passwordSalt: string;
  iterations: number;
};

export function hashPassword(password: string): PasswordHashData {
  const salt = randomBytes(16).toString("hex");
  const passwordHash = pbkdf2Sync(
    password,
    salt,
    DEFAULT_ITERATIONS,
    HASH_LENGTH_BYTES,
    HASH_DIGEST
  ).toString("hex");

  return {
    algorithm: "pbkdf2_sha256",
    passwordHash,
    passwordSalt: salt,
    iterations: DEFAULT_ITERATIONS
  };
}

export function verifyPassword(password: string, stored: PasswordHashData) {
  if (stored.algorithm !== "pbkdf2_sha256") return false;

  const candidate = pbkdf2Sync(
    password,
    stored.passwordSalt,
    stored.iterations,
    HASH_LENGTH_BYTES,
    HASH_DIGEST
  );
  const expected = Buffer.from(stored.passwordHash, "hex");

  if (candidate.length !== expected.length) return false;

  return timingSafeEqual(candidate, expected);
}

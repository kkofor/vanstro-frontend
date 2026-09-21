import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"

const scrypt = promisify(scryptCb) as (password: string, salt: string, keylen: number, options: { N: number; r: number; p: number }) => Promise<Buffer>

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16).toString("base64url")
  const derived = await scrypt(plain, salt, 64, { N: 16384, r: 8, p: 1 }) as Buffer
  return `scrypt$16384$8$1$${salt}$${derived.toString("base64url")}`
}

export async function verifyPassword(plain: string, encoded: string): Promise<boolean> {
  const [, n, r, p, salt, expected] = String(encoded).split("$")
  if (!n || !r || !p || !salt || !expected) return false
  try {
    const actual = await scrypt(plain, salt, 64, { N: Number(n), r: Number(r), p: Number(p) }) as Buffer
    const want = Buffer.from(expected, "base64url")
    return actual.length === want.length && timingSafeEqual(actual, want)
  } catch { return false }
}

export async function isBreached(plain: string): Promise<boolean> {
  const hash = createHash("sha1").update(plain, "utf8").digest("hex").toUpperCase()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 2000)
  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`, { signal: controller.signal })
    if (!res.ok) return false
    const suffix = hash.slice(5)
    const body = await res.text()
    return body.split(/\r?\n/).some(line => line.split(":")[0]?.trim().toUpperCase() === suffix)
  } catch { return false }
  finally { clearTimeout(timer) }
}

export const passwords = { hash: hashPassword, verify: verifyPassword, isBreached }

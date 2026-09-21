/**
 * Password acceptance shared by register / reset.
 * Weak-password list is parsed from assets/vi.js `BREACHED` (single source).
 * Semantics match VS.passwordRules().len plus the frontend submit gate that
 * also rejects the local breach list: accept when
 *   length ≥ 12, or length ≥ 8 with ≥3 character classes and not in BREACHED.
 * ≥12 does not require character-class mixing (a 16-char lowercase passphrase passes).
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"

function loadBreached(): string[] {
  const src = readFileSync(join(process.cwd(), "public/assets/vi.js"), "utf8")
  const m = src.match(/const BREACHED = (\[[\s\S]*?\]);/)
  if (!m) throw new Error("weak_passwords_source_missing")
  const parsed = JSON.parse(m[1].replace(/'/g, '"')) as unknown
  if (!Array.isArray(parsed) || !parsed.every(x => typeof x === "string")) throw new Error("weak_passwords_source_invalid")
  return parsed
}

export const WEAK_PASSWORDS = loadBreached()

export function isLocallyBreached(pw: string): boolean {
  if (!pw) return false
  const lower = pw.toLowerCase()
  return WEAK_PASSWORDS.some(c => lower === c || (lower.length <= 12 && lower.includes(c)))
}

export function characterVariety(pw: string): number {
  return [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(r => r.test(pw)).length
}

/** Same boolean as frontend `passwordRules(pw).len`. */
export function passwordLenOk(pw: string): boolean {
  return pw.length >= 12 || (pw.length >= 8 && !isLocallyBreached(pw) && characterVariety(pw) >= 3)
}

export function passwordIssues(pw: string): string[] {
  if (pw.length < 8) return ["Use at least 8 characters."]
  if (pw.length > 128) return ["Use at most 128 characters."]
  if (isLocallyBreached(pw)) return ["This password appeared in a data breach. Choose another one."]
  if (!passwordLenOk(pw)) return ["Use at least 8 characters with three character types, or 12+ as a passphrase."]
  return []
}

export function passwordAccepted(pw: string): boolean {
  return passwordIssues(pw).length === 0
}

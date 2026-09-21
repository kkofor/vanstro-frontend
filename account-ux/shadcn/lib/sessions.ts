/**
 * lib/sessions.ts — signed session cookie + on-disk device-session records.
 *
 * Cookie formats
 *   legacy: "{userId}.{exp}.{mac}"           — no session record, sessionUser() still resolves it
 *   v2:     "v2.{token}.{exp}.{mac}"         — token is opaque; the SHA-256 hex of token is the
 *                                              filename under data/sessions/. mac binds token+exp.
 *
 * We never persist the cookie value, the raw token, the IP address or the raw User-Agent string.
 * Only a parsed browser/device label and (currently null — no geo lookup wired up) city/province
 * are stored, plus timestamps. This keeps the on-disk record minimal per PIPEDA/Law 25.
 */
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto"
import { mkdir, readFile, readdir, rename, unlink, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { db } from "./users"

const COOKIE = "vs_session"
const TTL_SEC = 30 * 24 * 60 * 60
const SESSIONS_DIR = process.env.SESSIONS_DIR ?? join(process.cwd(), "data", "sessions")

function secret(): string {
  const s = process.env.VANSTRO_LINK_SECRET
  if (!s) throw new Error("VANSTRO_LINK_SECRET is not set")
  return s
}

function hmac(input: string): string {
  return createHmac("sha256", secret()).update(input).digest("base64url")
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex")
}

function parseCookieHeader(raw: string | null): string | null {
  if (!raw) return null
  const found = raw.split(";").map(v => v.trim()).find(v => v.startsWith(`${COOKIE}=`))
  return found ? decodeURIComponent(found.slice(COOKIE.length + 1)) : null
}

/* -------------------------------------------------------------- legacy cookie (no session file) */

function legacySign(userId: string, exp: number): string {
  return hmac(`${userId}.${exp}`)
}
function legacyValue(userId: string, exp: number): string {
  return `${userId}.${exp}.${legacySign(userId, exp)}`
}
function verifyLegacy(raw: string): string | null {
  const parts = raw.split(".")
  if (parts.length !== 3) return null
  const [id, expRaw, mac] = parts
  const exp = Number(expRaw)
  if (!id || !mac || !Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null
  const expected = legacySign(id, exp)
  const a = Buffer.from(mac)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b) ? id : null
}

/* -------------------------------------------------------------------------- v2 cookie (token) */

function v2Sign(token: string, exp: number): string {
  return hmac(`${token}.${exp}`)
}
function v2Value(token: string, exp: number): string {
  return `v2.${token}.${exp}.${v2Sign(token, exp)}`
}
/** Returns the verified token (not yet hashed) or null. */
function verifyV2(raw: string): string | null {
  const parts = raw.split(".")
  if (parts.length !== 4 || parts[0] !== "v2") return null
  const [, token, expRaw, mac] = parts
  const exp = Number(expRaw)
  if (!token || !mac || !Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null
  const expected = v2Sign(token, exp)
  const a = Buffer.from(mac)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b) ? token : null
}

/* --------------------------------------------------------------------------- session records */

export interface SessionRecord {
  publicId: string
  userId: string
  createdAt: string
  lastActiveAt: string
  browser: string | null
  device: string | null
  city: string | null
  province: string | null
}

function recordPath(hash: string): string {
  return join(SESSIONS_DIR, `${hash}.json`)
}

async function ensureDir() {
  await mkdir(SESSIONS_DIR, { recursive: true })
}

async function atomicWrite(path: string, value: unknown) {
  await ensureDir()
  const tmp = `${path}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`
  await writeFile(tmp, JSON.stringify(value, null, 2), { mode: 0o600 })
  try {
    await rename(tmp, path)
  } catch {
    await unlink(tmp).catch(() => {})
    throw new Error("session_write_failed")
  }
}

async function readRecord(hash: string): Promise<SessionRecord | null> {
  try {
    return JSON.parse(await readFile(recordPath(hash), "utf8")) as SessionRecord
  } catch {
    return null
  }
}

async function writeRecord(hash: string, row: SessionRecord) {
  await ensureDir()
  await atomicWrite(recordPath(hash), row)
}

async function deleteRecord(hash: string) {
  try { await unlink(recordPath(hash)) } catch { /* already gone */ }
}

/** Parses a User-Agent string into a short browser + device label. Raw UA is never stored. */
function parseUa(ua: string | null | undefined): { browser: string | null; device: string | null } {
  if (!ua) return { browser: null, device: null }
  let browser: string
  if (/Edg\//.test(ua)) browser = "Edge"
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = "Chrome"
  else if (/Firefox\//.test(ua)) browser = "Firefox"
  else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = "Safari"
  else browser = "Other"

  let device: string
  if (/iPhone/.test(ua)) device = "iPhone"
  else if (/iPad/.test(ua)) device = "iPad"
  else if (/Android/.test(ua)) device = "Android"
  else if (/Macintosh|Mac OS X/.test(ua)) device = "macOS"
  else if (/Windows/.test(ua)) device = "Windows"
  else if (/Linux/.test(ua)) device = "Linux"
  else device = "Other"

  return { browser, device }
}

/* ------------------------------------------------------------------------------------- public API */

export async function sessionUser(req: Request) {
  const raw = parseCookieHeader(req.headers.get("cookie"))
  if (!raw) return null
  const token = verifyV2(raw)
  if (token) {
    const hash = sha256Hex(token)
    const row = await readRecord(hash)
    if (!row) return null
    void touch(hash).catch(() => {})
    return db.users.findById(row.userId)
  }
  const legacyId = verifyLegacy(raw)
  return legacyId ? db.users.findById(legacyId) : null
}

/** SHA-256 hex of the caller's v2 token, or null (legacy cookie / signed out / no cookie). */
export function currentHash(req: Request): string | null {
  const raw = parseCookieHeader(req.headers.get("cookie"))
  if (!raw) return null
  const token = verifyV2(raw)
  return token ? sha256Hex(token) : null
}

/** Alias kept for callers that want the verified token's hash without re-deriving it. */
export function parseTokenHash(req: Request): string | null {
  return currentHash(req)
}

export function sessionCookie(userId: string, remember = true): string {
  const exp = Math.floor(Date.now() / 1000) + TTL_SEC
  return `${COOKIE}=${encodeURIComponent(legacyValue(userId, exp))}; Max-Age=${TTL_SEC}; HttpOnly; Secure; SameSite=Lax; Path=/`
}

export function clearSessionCookie(): string {
  return `${COOKIE}=; Max-Age=0; HttpOnly; Secure; SameSite=Lax; Path=/`
}

async function createSession(userId: string, remember = true, meta?: { ua?: string | null }): Promise<{ cookie: string }> {
  const token = randomBytes(32).toString("base64url")
  const exp = Math.floor(Date.now() / 1000) + TTL_SEC
  const hash = sha256Hex(token)
  const now = new Date().toISOString()
  const { browser, device } = parseUa(meta?.ua)
  const row: SessionRecord = {
    publicId: `ses_${randomUUID()}`,
    userId,
    createdAt: now,
    lastActiveAt: now,
    browser,
    device,
    city: null,
    province: null,
  }
  await writeRecord(hash, row)
  void remember
  return { cookie: `${COOKIE}=${encodeURIComponent(v2Value(token, exp))}; Max-Age=${TTL_SEC}; HttpOnly; Secure; SameSite=Lax; Path=/` }
}

async function touch(hash: string) {
  try {
    const row = await readRecord(hash)
    if (!row) return
    row.lastActiveAt = new Date().toISOString()
    await writeRecord(hash, row)
  } catch { /* last-active is best-effort */ }
}

/** All sessions for a user, current one flagged. Falls back to a synthetic "legacy" row when the
 *  caller has no v2 session (old cookie, or details genuinely unknown) so the UI never shows a
 *  false empty state for someone who is, in fact, signed in right now. */
async function listByUser(userId: string, currentSessHash: string | null): Promise<Array<SessionRecord & { current: boolean }>> {
  await ensureDir()
  const files = await readdir(SESSIONS_DIR).catch(() => [] as string[])
  const rows: Array<SessionRecord & { current: boolean }> = []
  for (const f of files) {
    if (!f.endsWith(".json")) continue
    const hash = f.slice(0, -".json".length)
    const row = await readRecord(hash)
    if (!row || row.userId !== userId) continue
    rows.push({ ...row, current: hash === currentSessHash })
  }
  if (currentSessHash && !rows.some(r => r.current)) {
    // token verified but record missing (e.g. deleted between verify and here) — degrade, don't 401
    currentSessHash = null
  }
  if (!currentSessHash) {
    rows.unshift({
      publicId: "legacy",
      userId,
      createdAt: rows[0]?.createdAt ?? new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      browser: null,
      device: null,
      city: null,
      province: null,
      current: true,
    })
  }
  rows.sort((a, b) => (a.current === b.current ? b.lastActiveAt.localeCompare(a.lastActiveAt) : a.current ? -1 : 1))
  return rows
}

/** Revokes every session for `userId` except `keepHash`. Returns number revoked. */
async function revokeOthers(userId: string, keepHash: string | null): Promise<number> {
  await ensureDir()
  const files = await readdir(SESSIONS_DIR).catch(() => [] as string[])
  let n = 0
  for (const f of files) {
    if (!f.endsWith(".json")) continue
    const hash = f.slice(0, -".json".length)
    if (hash === keepHash) continue
    const row = await readRecord(hash)
    if (!row || row.userId !== userId) continue
    await deleteRecord(hash)
    n++
  }
  return n
}

/** Revokes one session by its publicId, scoped to `userId` so a user can't revoke someone else's. */
async function revokeOne(userId: string, publicId: string): Promise<boolean> {
  await ensureDir()
  const files = await readdir(SESSIONS_DIR).catch(() => [] as string[])
  for (const f of files) {
    if (!f.endsWith(".json")) continue
    const hash = f.slice(0, -".json".length)
    const row = await readRecord(hash)
    if (!row || row.userId !== userId || row.publicId !== publicId) continue
    await deleteRecord(hash)
    return true
  }
  return false
}

/** Revokes every session for `userId`, including the current one (used on password reset before
 *  the new session is created, and account deletion). */
async function revokeAll(userId: string): Promise<number> {
  return revokeOthers(userId, null)
}

async function revokeByHash(hash: string): Promise<void> {
  await deleteRecord(hash)
}

export const sessions = {
  create: createSession,
  clear: clearSessionCookie,
  touch,
  listByUser,
  revokeOthers,
  revokeOne,
  revokeAll,
  revokeByHash,
}

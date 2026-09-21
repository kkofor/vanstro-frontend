import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { randomUUID } from "node:crypto"
import type { Locale } from "./mail"

export type AccountRole = "customer" | "dealer" | "staff"

export interface UserRow {
  id: string
  email: string
  firstName: string
  lastName: string
  locale: Locale
  passwordHash: string | null
  emailVerifiedAt: string | null
  role: AccountRole
  dealerId?: string | null
  createdAt: string
  failedAttempts?: number
  lockedUntil?: string | null
  passwordHistory?: string[]
  marketingConsent?: boolean
}

export interface TokenRow {
  userId: string
  purpose: "verify-email" | "reset-password" | "freeze-account" | "claim-order"
  hash: string
  expiresAt: string
  usedAt: string | null
  /** claim-order: guest order to attach after the email link is opened. */
  orderNo?: string
}

const DATA_DIR = process.env.USERS_DIR ?? join(process.cwd(), "data", "users")
const TOKENS_DIR = process.env.TOKENS_DIR ?? join(process.cwd(), "data", "tokens")
const INDEX_FILE = join(DATA_DIR, "email-index.json")

class FileStore {
  private lock: Promise<unknown> = Promise.resolve()
  private withLock<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.lock.then(fn, fn)
    this.lock = run.catch(() => {})
    return run
  }
  private async ensure(dir: string) { await mkdir(dir, { recursive: true }) }
  private async atomic(path: string, value: unknown) {
    const tmp = `${path}.${process.pid}.tmp`
    await writeFile(tmp, JSON.stringify(value, null, 2), { mode: 0o600 })
    await rename(tmp, path)
  }
  private userPath(id: string) { return join(DATA_DIR, `${id}.json`) }
  private tokenPath(hash: string) { return join(TOKENS_DIR, `${hash}.json`) }

  async findById(id: string): Promise<UserRow | null> {
    try { return JSON.parse(await readFile(this.userPath(id), "utf8")) as UserRow } catch { return null }
  }
  async findByEmail(email: string): Promise<UserRow | null> {
    const key = email.trim().toLowerCase()
    try {
      const index = JSON.parse(await readFile(INDEX_FILE, "utf8")) as Record<string, string>
      const id = index[key]
      return id ? this.findById(id) : null
    } catch {
      return null
    }
  }
  async create(input: Omit<UserRow, "id" | "createdAt" | "emailVerifiedAt" | "failedAttempts" | "lockedUntil" | "passwordHistory">): Promise<UserRow> {
    return this.withLock(async () => {
      await this.ensure(DATA_DIR)
      const email = input.email.trim().toLowerCase()
      const index = await this.readIndex()
      if (index[email]) throw new Error("email_exists")
      const user: UserRow = { ...input, email, id: `usr_${randomUUID()}`, createdAt: new Date().toISOString(), emailVerifiedAt: null, failedAttempts: 0, lockedUntil: null, passwordHistory: [] }
      await this.atomic(this.userPath(user.id), user)
      index[email] = user.id
      await this.atomic(INDEX_FILE, index)
      return user
    })
  }
  private async readIndex(): Promise<Record<string, string>> {
    try { return JSON.parse(await readFile(INDEX_FILE, "utf8")) as Record<string, string> } catch { return {} }
  }
  async update(user: UserRow): Promise<UserRow> {
    return this.withLock(async () => { await this.ensure(DATA_DIR); await this.atomic(this.userPath(user.id), user); return user })
  }
  async markVerified(id: string, at: Date) { const u = await this.findById(id); if (!u) return; u.emailVerifiedAt = at.toISOString(); await this.update(u) }
  async setPassword(id: string, hash: string) { const u = await this.findById(id); if (!u) return; u.passwordHash = hash; await this.update(u) }
  async recordFailed(id: string): Promise<{ attempts: number; lockedUntil: string | null }> {
    const u = await this.findById(id); if (!u) return { attempts: 0, lockedUntil: null }
    const attempts = (u.failedAttempts ?? 0) + 1
    const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null
    u.failedAttempts = attempts; u.lockedUntil = lockedUntil; await this.update(u)
    return { attempts, lockedUntil }
  }
  async clearFailed(id: string) { const u = await this.findById(id); if (!u) return; u.failedAttempts = 0; u.lockedUntil = null; await this.update(u) }
  async passwordWasUsed(id: string, plain: string, verify: (p: string, h: string) => Promise<boolean>, lastN: number) {
    const u = await this.findById(id); for (const h of (u?.passwordHistory ?? []).slice(-lastN)) if (await verify(plain, h)) return true; return false
  }
  async pushPasswordHistory(id: string, hash: string) { const u = await this.findById(id); if (!u) return; u.passwordHistory = [...(u.passwordHistory ?? []), hash].slice(-5); await this.update(u) }

  async upsertToken(row: TokenRow) { return this.withLock(async () => { await this.ensure(TOKENS_DIR); for (const f of await readdir(TOKENS_DIR).catch(() => [])) { try { const old = JSON.parse(await readFile(join(TOKENS_DIR, f), "utf8")) as TokenRow; if (old.userId === row.userId && old.purpose === row.purpose) await writeFile(join(TOKENS_DIR, f), JSON.stringify({ ...old, usedAt: new Date().toISOString() })) } catch {} } await this.atomic(this.tokenPath(row.hash), row) }) }
  async findToken(purpose: TokenRow["purpose"], hash: string) { try { const row = JSON.parse(await readFile(this.tokenPath(hash), "utf8")) as TokenRow; return row.purpose === purpose ? row : null } catch { return null } }
  async markTokenUsed(hash: string, at: Date) { try { const row = JSON.parse(await readFile(this.tokenPath(hash), "utf8")) as TokenRow; row.usedAt = at.toISOString(); await this.atomic(this.tokenPath(hash), row) } catch {} }
  async deleteTokens(userId: string, purpose: TokenRow["purpose"]) { for (const f of await readdir(TOKENS_DIR).catch(() => [])) { try { const p = join(TOKENS_DIR, f); const row = JSON.parse(await readFile(p, "utf8")) as TokenRow; if (row.userId === userId && row.purpose === purpose) await writeFile(p, JSON.stringify({ ...row, usedAt: new Date().toISOString() })) } catch {} } }
}

export const userStore = new FileStore()
export const db = {
  users: {
    findByEmail: (email: string) => userStore.findByEmail(email),
    findById: (id: string) => userStore.findById(id),
    create: (input: Omit<UserRow, "id" | "createdAt" | "emailVerifiedAt" | "failedAttempts" | "lockedUntil" | "passwordHistory">) => userStore.create(input),
    markVerified: (id: string, at: Date) => userStore.markVerified(id, at),
    setPassword: (id: string, hash: string) => userStore.setPassword(id, hash),
    recordFailed: (id: string) => userStore.recordFailed(id),
    clearFailed: (id: string) => userStore.clearFailed(id),
  },
  tokens: {
    upsert: (row: TokenRow) => userStore.upsertToken(row),
    findByHash: (purpose: TokenRow["purpose"], hash: string) => userStore.findToken(purpose, hash),
    markUsed: (hash: string, at: Date) => userStore.markTokenUsed(hash, at),
    deleteFor: (id: string, purpose: TokenRow["purpose"]) => userStore.deleteTokens(id, purpose),
  },
  passwordHistory: {
    wasUsed: (id: string, plain: string, lastN: number, verify: (p: string, h: string) => Promise<boolean>) => userStore.passwordWasUsed(id, plain, verify, lastN),
    push: (id: string, hash: string) => userStore.pushPasswordHistory(id, hash),
  },
  offers: { issueWelcome: async (_id: string) => null as { code: string; percent: number; days: number } | null },
}

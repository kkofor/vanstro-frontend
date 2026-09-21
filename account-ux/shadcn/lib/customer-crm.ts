/**
 * Staff CRM overlay keyed by order email. This prototype has no user table;
 * ops notes and corrected names live in data/customer-crm.json.
 */
import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"

export interface CustomerCrm {
  email: string
  name?: string
  phone?: string
  note?: string
  /** EspoCRM User id — sent to ERP as `userId` (same id CRM uses for createdBy). */
  erpUserId?: string
  updatedAt: string
  by: string
}

const CRM_FILE = process.env.CUSTOMER_CRM ?? join(process.cwd(), "data", "customer-crm.json")

let rows: Record<string, CustomerCrm> = {}
let ready: Promise<void> | null = null

async function load() {
  try {
    rows = JSON.parse(await readFile(CRM_FILE, "utf8")) as Record<string, CustomerCrm>
  } catch {
    rows = {}
  }
}

function ensure() {
  ready ??= load()
  return ready
}

async function persist() {
  await mkdir(dirname(CRM_FILE), { recursive: true })
  const tmp = CRM_FILE + ".tmp"
  await writeFile(tmp, JSON.stringify(rows, null, 2))
  await rename(tmp, CRM_FILE)
}

export async function getCustomerCrm(email: string): Promise<CustomerCrm | null> {
  await ensure()
  return rows[email.trim().toLowerCase()] ?? null
}

export async function listCustomerCrm(): Promise<Record<string, CustomerCrm>> {
  await ensure()
  return { ...rows }
}

export async function upsertCustomerCrm(
  email: string,
  patch: { name?: string; phone?: string | null; note?: string | null; erpUserId?: string | null },
  by: string,
): Promise<CustomerCrm> {
  await ensure()
  const key = email.trim().toLowerCase()
  if (!key.includes("@")) throw new Error("invalid_email")
  const prev = rows[key] ?? { email: key, updatedAt: "", by }
  let erpUserId = prev.erpUserId
  if (patch.erpUserId !== undefined) {
    const v = (patch.erpUserId || "").trim()
    if (v && (/^usr_/i.test(v) || !/^[a-zA-Z0-9]{2,24}$/.test(v))) throw new Error("invalid_erp_id")
    erpUserId = v || undefined
  }
  const next: CustomerCrm = {
    email: key,
    name: patch.name !== undefined ? patch.name.trim() : prev.name,
    phone: patch.phone !== undefined ? (patch.phone || undefined) : prev.phone,
    note: patch.note !== undefined ? (patch.note?.trim() || undefined) : prev.note,
    erpUserId,
    updatedAt: new Date().toISOString(),
    by,
  }
  rows[key] = next
  await persist()
  return next
}

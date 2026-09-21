/**
 * lib/catalogue.ts — server-side prices. /api/orders re-prices every cart line from here;
 * the unitCents the browser sends is ignored (never trust client money).
 *
 * Production reads the live catalogue (/api/v1/products). Two sources here:
 *   - catalogue-snapshot.json: the 140 active SKUs on vanstro.ca (same snapshot cart.html
 *     loads from assets/catalogue-data.js), so live-site SKUs in vs.cart price on the server.
 *   - DEMO: the three prototype lines hard-coded in checkout.html.
 *   - data/catalogue-overrides.json: staff edits (price, copy, hide). Checkout uses these immediately.
 */
import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import snapshot from "./catalogue-snapshot.json"

export interface CatalogueItem {
  sku: string
  name: string
  variant?: string
  unitCents: number
  category?: string
  img?: string
}

export interface CatalogueOverride {
  unitCents?: number
  name?: string
  variant?: string
  category?: string
  img?: string
  disabled?: boolean
  updatedAt: string
  by: string
}

export type CatalogueRow = CatalogueItem & {
  snapshotCents: number
  overridden: boolean
  disabled: boolean
  extra: boolean
}

const DEMO: Record<string, CatalogueItem> = {
  "KC-SHK-SAGE-12": { sku: "KC-SHK-SAGE-12", name: "Shaker Kitchen Cabinet Set · Sage", variant: "12 pcs · soft-close · assembled", unitCents: 624000 },
  "WP-SLAT-WAL-2440": { sku: "WP-SLAT-WAL-2440", name: "Slat Wall Panel · Walnut", variant: "2440 × 600 mm · acoustic felt back", unitCents: 18900 },
  "HW-HINGE-SC-10": { sku: "HW-HINGE-SC-10", name: "Soft-close hinge kit", variant: "10 pack · 110°", unitCents: 4800 },
}

const ORIGINALS: Record<string, CatalogueItem> = { ...(snapshot as Record<string, CatalogueItem>), ...DEMO }
const ITEMS: Record<string, CatalogueItem> = Object.fromEntries(
  Object.entries(ORIGINALS).map(([k, v]) => [k, { ...v }]),
)
const SNAPSHOT_CENTS: Record<string, number> = Object.fromEntries(Object.entries(ORIGINALS).map(([k, v]) => [k, v.unitCents]))
const OVERRIDE_FILE = process.env.CATALOGUE_OVERRIDES ?? join(process.cwd(), "data", "catalogue-overrides.json")
const SKU_RE = /^[A-Z0-9][A-Z0-9._-]{1,40}$/i

let overrides: Record<string, CatalogueOverride> = {}
let overridesReady: Promise<void> | null = null

function applyOverride(sku: string, o: CatalogueOverride) {
  const base = ORIGINALS[sku] ?? (o.name && o.unitCents
    ? { sku, name: o.name, unitCents: o.unitCents, variant: o.variant, category: o.category, img: o.img }
    : null)
  if (!base) return
  ITEMS[sku] = {
    ...base,
    unitCents: Number.isFinite(o.unitCents) ? o.unitCents as number : base.unitCents,
    name: o.name?.trim() || base.name,
    variant: o.variant ?? base.variant,
    category: o.category ?? base.category,
    img: o.img ?? base.img,
  }
}

async function loadOverrides() {
  try {
    overrides = JSON.parse(await readFile(OVERRIDE_FILE, "utf8")) as Record<string, CatalogueOverride>
  } catch {
    overrides = {}
  }
  for (const [sku, o] of Object.entries(overrides)) applyOverride(sku, o)
}

function ensureOverrides() {
  overridesReady ??= loadOverrides()
  return overridesReady
}

async function persistOverrides() {
  await mkdir(dirname(OVERRIDE_FILE), { recursive: true })
  const tmp = OVERRIDE_FILE + ".tmp"
  await writeFile(tmp, JSON.stringify(overrides, null, 2))
  await rename(tmp, OVERRIDE_FILE)
}

function toRow(it: CatalogueItem): CatalogueRow {
  const o = overrides[it.sku]
  return {
    ...it,
    snapshotCents: SNAPSHOT_CENTS[it.sku] ?? it.unitCents,
    overridden: !!o,
    disabled: !!o?.disabled,
    extra: !ORIGINALS[it.sku],
  }
}

export class UnknownSkuError extends Error {
  constructor(public sku: string) { super(`unknown_sku:${sku}`) }
}

export async function getItem(sku: string): Promise<CatalogueItem> {
  await ensureOverrides()
  const it = ITEMS[sku]
  if (!it || overrides[sku]?.disabled) throw new UnknownSkuError(sku)
  return it
}

export async function priceCents(sku: string): Promise<number> {
  return (await getItem(sku)).unitCents
}

export async function listCatalogue(): Promise<CatalogueRow[]> {
  await ensureOverrides()
  return Object.values(ITEMS)
    .map(toRow)
    .sort((a, b) => a.name.localeCompare(b.name) || a.sku.localeCompare(b.sku))
}

export async function overrideCount(): Promise<number> {
  await ensureOverrides()
  return Object.keys(overrides).length
}

export type CataloguePatch = {
  unitCents?: number
  name?: string
  variant?: string
  category?: string
  img?: string
  disabled?: boolean
}

function mergeOverride(sku: string, patch: CataloguePatch, by: string): CatalogueOverride {
  const prev = overrides[sku] ?? { updatedAt: "", by }
  const next: CatalogueOverride = { ...prev, updatedAt: new Date().toISOString(), by }
  if (patch.unitCents !== undefined) next.unitCents = patch.unitCents
  if (patch.name !== undefined) next.name = patch.name
  if (patch.variant !== undefined) next.variant = patch.variant
  if (patch.category !== undefined) next.category = patch.category
  if (patch.img !== undefined) next.img = patch.img
  if (patch.disabled !== undefined) next.disabled = patch.disabled
  return next
}

export async function applyCataloguePatch(sku: string, patch: CataloguePatch, by: string): Promise<CatalogueRow> {
  await ensureOverrides()
  const it = ITEMS[sku]
  if (!it) throw new UnknownSkuError(sku)
  if (patch.unitCents !== undefined) {
    if (!Number.isInteger(patch.unitCents) || patch.unitCents < 1 || patch.unitCents > 50_000_000) throw new Error("invalid_price")
  }
  if (patch.name !== undefined && !patch.name.trim()) throw new Error("invalid_name")
  overrides[sku] = mergeOverride(sku, {
    ...patch,
    name: patch.name?.trim(),
    variant: patch.variant?.trim(),
    category: patch.category?.trim(),
    img: patch.img?.trim(),
  }, by)
  applyOverride(sku, overrides[sku])
  await persistOverrides()
  return toRow(ITEMS[sku])
}

export async function setPriceOverride(sku: string, unitCents: number, by: string): Promise<CatalogueRow> {
  return applyCataloguePatch(sku, { unitCents }, by)
}

export async function revertCatalogue(sku: string): Promise<CatalogueRow | { removed: true; sku: string }> {
  await ensureOverrides()
  if (!overrides[sku] && !ITEMS[sku]) throw new UnknownSkuError(sku)
  delete overrides[sku]
  if (ORIGINALS[sku]) {
    ITEMS[sku] = { ...ORIGINALS[sku] }
    await persistOverrides()
    return toRow(ITEMS[sku])
  }
  delete ITEMS[sku]
  await persistOverrides()
  return { removed: true, sku }
}

export async function createCatalogueSku(input: CatalogueItem, by: string): Promise<CatalogueRow> {
  await ensureOverrides()
  const sku = input.sku.trim()
  if (!SKU_RE.test(sku)) throw new Error("invalid_sku")
  if (ITEMS[sku] || ORIGINALS[sku]) throw new Error("sku_taken")
  if (!input.name.trim()) throw new Error("invalid_name")
  if (!Number.isInteger(input.unitCents) || input.unitCents < 1 || input.unitCents > 50_000_000) throw new Error("invalid_price")
  const item: CatalogueItem = {
    sku,
    name: input.name.trim(),
    variant: input.variant?.trim() || undefined,
    unitCents: input.unitCents,
    category: input.category?.trim() || undefined,
    img: input.img?.trim() || undefined,
  }
  SNAPSHOT_CENTS[sku] = item.unitCents
  overrides[sku] = {
    unitCents: item.unitCents,
    name: item.name,
    variant: item.variant,
    category: item.category,
    img: item.img,
    updatedAt: new Date().toISOString(),
    by,
  }
  applyOverride(sku, overrides[sku])
  await persistOverrides()
  return toRow(ITEMS[sku])
}

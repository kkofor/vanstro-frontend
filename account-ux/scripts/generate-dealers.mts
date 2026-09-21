/** Invite codes are long-lived (no expiry). Never write a real code into any frontend asset. */
/** street comes from locations[].addressLine1 on the live dealer API; rerunning this script
 *  will overwrite any hand-edited display street values in shadcn/lib/dealers-snapshot.json. */
import { mkdir, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

type ApiLocation = {
  status?: string
  addressLine1?: string | null
  city?: string | null
  province?: string | null
  postalCode?: string | null
  pickupAvailable?: boolean
  deliveryAvailable?: boolean
}
type ApiDealer = {
  code?: string | null
  name?: string | null
  status?: string | null
  phone?: string | null
  email?: string | null
  locations?: ApiLocation[]
}
type SnapshotDealer = {
  id: string
  code: string
  inviteCode: string
  name: string
  street: string
  city: string
  province: string
  postalCode: string
  phone: string
  email: string
  hoursEn: string
  hoursFr: string
  services: ("pickup" | "delivery")[]
  areaEn: string
  areaFr: string
  erpAccountId?: string
  erpUserId?: string
}

const API_URL = process.env.DEALER_DIRECTORY_URL ?? "https://www.vanstro.ca/api/v1/dealers"
const OUT = resolve(process.cwd(), "shadcn/lib/dealers-snapshot.json")
const PROVINCES = new Set(["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"])
const POSTAL = /^[A-Z]\d[A-Z] ?\d[A-Z]\d$/
const ID_BY_CODE: Record<string, string> = {
  MB01: "MB-YUAN",
  ON10: "ON-WAT",
  QC10: "QC-PCL",
  AB10: "AB-CGY",
  BC10: "BC-SAA",
  SK10: "SK-SKT",
}
const EXISTING: Record<string, { inviteCode: string; hoursEn?: string; hoursFr?: string; erpAccountId?: string; erpUserId?: string }> = {
  MB01: { inviteCode: "VS-MB10-K4F9", hoursEn: "Mon–Fri 9 a.m.–5 p.m.", hoursFr: "Lun–Ven 9 h–17 h", erpAccountId: "6a8810b93b08b6495", erpUserId: "6a97d38cb6253f01b" },
  ON10: { inviteCode: "VS-ON10-G8R2" },
  QC10: { inviteCode: "VS-QC10-L3H7" },
  AB10: { inviteCode: "VS-AB10-F1T6" },
  BC10: { inviteCode: "VS-BC10-I9S4" },
  SK10: { inviteCode: "VS-SK10-P5K8" },
} as const

const response = await fetch(API_URL)
if (!response.ok) throw new Error(`dealer_directory_http_${response.status}`)
const body = await response.json() as { data?: ApiDealer[] }
const rows = body.data ?? []
const valid = rows.flatMap((dealer) => {
  if (dealer.status !== "active") return []
  const location = (dealer.locations ?? []).find((candidate) => {
    const province = (candidate.province ?? "").toUpperCase()
    const postalCode = (candidate.postalCode ?? "").toUpperCase().replace(/\s+/g, " ").trim()
    return candidate.status === "active"
      && Boolean(candidate.pickupAvailable || candidate.deliveryAvailable)
      && PROVINCES.has(province)
      && POSTAL.test(postalCode)
  })
  if (!location || !dealer.code || !ID_BY_CODE[dealer.code]) return []
  const code = dealer.code
  const province = location.province!.toUpperCase()
  const postalCode = location.postalCode!.toUpperCase().replace(/\s+/g, " ").trim()
  const services = [
    ...(location.pickupAvailable ? ["pickup" as const] : []),
    ...(location.deliveryAvailable ? ["delivery" as const] : []),
  ]
  const prior = EXISTING[code]
  const row: SnapshotDealer = {
    id: ID_BY_CODE[code],
    code,
    inviteCode: prior.inviteCode,
    name: dealer.name!.trim(),
    street: location.addressLine1!.trim(),
    city: location.city!.trim(),
    province,
    postalCode,
    phone: code === "MB01" ? "204 505 2288" : (dealer.phone ?? "").trim(),
    email: (dealer.email ?? "").toLowerCase().trim(),
    hoursEn: "",
    hoursFr: "",
    services,
    areaEn: location.city!.trim(),
    areaFr: location.city!.trim(),
  }
  if (code === "MB01") {
    row.hoursEn = prior.hoursEn!
    row.hoursFr = prior.hoursFr!
    row.erpAccountId = prior.erpAccountId
    row.erpUserId = prior.erpUserId
  }
  return [row]
})

if (valid.length === 0) throw new Error("dealer_directory_empty_after_filter")
await mkdir(dirname(OUT), { recursive: true })
await writeFile(OUT, `${JSON.stringify(valid, null, 2)}\n`)
console.log(JSON.stringify({ sourceCount: rows.length, snapshotCount: valid.length, filteredCodes: rows.filter((row) => !valid.some((item) => row.code === item.code)).map((row) => row.code), output: OUT }, null, 2))

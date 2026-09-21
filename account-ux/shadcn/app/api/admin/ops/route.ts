/**
 * GET /api/admin/ops — process health + which env keys are set (never values).
 */
import { readdir, stat } from "node:fs/promises"
import { join } from "node:path"
import { requireStaff } from "@/lib/staff"
import { paymentMode } from "@/lib/payments"
import { goCloudConfigured } from "@/lib/terminals"
import { erpConfigured } from "@/lib/erp"

async function dirInfo(rel: string) {
  const dir = join(process.cwd(), rel)
  try {
    const files = await readdir(dir)
    let bytes = 0
    for (const f of files) { try { bytes += (await stat(join(dir, f))).size } catch { /* skip */ } }
    return { files: files.length, bytes }
  } catch { return { files: 0, bytes: 0 } }
}

function present(key: string) {
  const v = process.env[key]
  return !!(v && v.trim())
}

export async function GET(req: Request) {
  const staff = await requireStaff(req)
  if (staff instanceof Response) return staff

  let appHost = ""
  try { appHost = new URL(process.env.APP_URL || "").hostname } catch { appHost = "" }

  return Response.json({
    health: {
      ok: true,
      payment: paymentMode(),
      ht: present("MONERIS_HT_PROFILE_ID"),
      mail: present("AZURE_COMMUNICATION_CONNECTION_STRING"),
      pos: goCloudConfigured() || paymentMode() === "mock",
      erp: erpConfigured(),
    },
    bind: {
      host: process.env.BIND_HOST || "127.0.0.1",
      port: Number(process.env.PORT ?? 8787),
      appHost,
      trustProxy: process.env.TRUST_PROXY === "1",
    },
    keys: {
      VANSTRO_LINK_SECRET: present("VANSTRO_LINK_SECRET"),
      MONERIS_MOCK: process.env.MONERIS_MOCK === "1" || process.env.MONERIS_MOCK === "true",
      MONERIS_ENV: process.env.MONERIS_ENV || "qa",
      MONERIS_HT_PROFILE_ID: present("MONERIS_HT_PROFILE_ID"),
      MONERIS_GO_API_TOKEN: present("MONERIS_GO_API_TOKEN"),
      MONERIS_GO_IST_CONFIG: present("MONERIS_GO_IST_CONFIG"),
      MONERIS_GO_TERMINALS: present("MONERIS_GO_TERMINALS"),
      AZURE_COMMUNICATION_CONNECTION_STRING: present("AZURE_COMMUNICATION_CONNECTION_STRING"),
      MAIL_REDIRECT_TO: present("MAIL_REDIRECT_TO"),
      CHROME_PATH: present("CHROME_PATH"),
      VANSTRO_QST_BN: present("VANSTRO_QST_BN"),
      ERP_BASE_URL: present("ERP_BASE_URL"),
      ERP_TOKEN: present("ERP_TOKEN"),
    },
    mailRedirect: present("MAIL_REDIRECT_TO"),
    process: {
      node: process.version,
      uptimeSec: Math.round(process.uptime()),
      rssMb: Math.round(process.memoryUsage().rss / 1048576),
      tz: "America/Winnipeg",
      now: new Date().toISOString(),
    },
    data: {
      orders: await dirInfo("data/orders"),
      traffic: await dirInfo("data/traffic"),
    },
  }, { headers: { "cache-control": "no-store" } })
}

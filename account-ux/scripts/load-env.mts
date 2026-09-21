/** Loads committed .env (QA sandbox + mail) then gitignored .env.local overrides. */
import { config } from "dotenv"
config({ path: ".env", override: false })
config({ path: ".env.local", override: false })
process.env.APP_URL ??= `http://localhost:${process.env.PORT ?? 8787}`

function appHostIsLocal() {
  const raw = process.env.APP_URL
  if (!raw) return true
  try {
    const h = new URL(raw).hostname
    return h === "localhost" || h === "127.0.0.1" || h === "::1"
  } catch {
    return false
  }
}

if (appHostIsLocal()) {
  process.env.DEV_DEMO_USER ??= "1"
  process.env.VANSTRO_LINK_SECRET ??= "dev-only-vanstro-link-secret"
}

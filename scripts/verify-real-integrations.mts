import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const outputPath = resolve(process.env.REAL_INTEGRATION_REPORT ?? "docs/reports/real-integration-verification.json");
type Result = { name: string; status: "passed" | "failed" | "blocked"; detail: string; latencyMs?: number; fingerprint?: string };
const results: Result[] = [];
const now = new Date().toISOString();
const fingerprint = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 12);
async function check(name: string, required: string[], fn: () => Promise<string>) {
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length) {
    results.push({ name, status: "blocked", detail: `Missing: ${missing.join(", ")}` });
    return;
  }
  const startedAt = performance.now();
  try {
    const detail = await fn();
    results.push({ name, status: "passed", detail, latencyMs: Math.round(performance.now() - startedAt) });
  } catch (error) {
    results.push({ name, status: "failed", detail: error instanceof Error ? error.message : String(error), latencyMs: Math.round(performance.now() - startedAt) });
  }
}

await check("Moneris QA preload", ["MONERIS_STORE_ID", "MONERIS_API_TOKEN", "MONERIS_CHECKOUT_ID"], async () => {
  if (process.env.MONERIS_ENVIRONMENT === "prod") throw new Error("Refusing non-charge verification against Moneris prod; use QA credentials.");
  const response = await fetch("https://gatewayt.moneris.com/chkt/request/request.php", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      store_id: process.env.MONERIS_STORE_ID,
      api_token: process.env.MONERIS_API_TOKEN,
      checkout_id: process.env.MONERIS_CHECKOUT_ID,
      environment: "qa",
      action: "preload",
      txn_total: "1.00",
      order_no: `verification-${randomUUID()}`,
      cust_id: "verification@vanstro.test"
    }),
    signal: AbortSignal.timeout(15_000)
  });
  const body = await response.json().catch(() => null) as { response?: { success?: string; ticket?: string } } | null;
  if (!response.ok || body?.response?.success !== "true" || !body.response.ticket) throw new Error(`Moneris QA preload failed with HTTP ${response.status}.`);
  return `QA ticket issued (${fingerprint(body.response.ticket)}); no charge submitted.`;
});

await check("Canada Post AddressComplete", ["CANADA_POST_API_KEY"], async () => {
  const url = new URL("https://ws1.postescanada-canadapost.ca/AddressComplete/Interactive/Find/v2.10/json3.ws");
  url.searchParams.set("Key", process.env.CANADA_POST_API_KEY!);
  url.searchParams.set("SearchTerm", "100 Main Street Winnipeg");
  url.searchParams.set("Country", "CA");
  url.searchParams.set("MaxSuggestions", "3");
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  const body = await response.json().catch(() => null) as { Items?: unknown[] } | null;
  if (!response.ok || !body?.Items?.length) throw new Error(`Canada Post lookup failed with HTTP ${response.status}.`);
  return `${body.Items.length} suggestions returned.`;
});

await check("SMTP verify", ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM"], async () => {
  const port = Number(process.env.SMTP_PORT ?? 587);
  const code = `import nodemailer from 'nodemailer'; const port=Number(process.env.SMTP_PORT??587); const transport=nodemailer.createTransport({host:process.env.SMTP_HOST,port,secure:port===465,requireTLS:process.env.SMTP_REQUIRE_TLS!=='false'&&port!==465,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000}); await transport.verify();`;
  const result = spawnSync("pnpm", ["--filter", "@vanstro/worker", "exec", "tsx", "--eval", code], { env: process.env, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr.trim() || result.stdout.trim() || "SMTP verification failed.");
  return `SMTP authentication and transport verified for ${process.env.SMTP_HOST}:${port}.`;
});

await check("ERP read contract", ["ERP_API_BASE_URL", "ERP_SERVICE_TOKEN"], async () => {
  const base = process.env.ERP_API_BASE_URL!.replace(/\/$/, "");
  if (/example\.com|localhost|127\.0\.0\.1/.test(base)) throw new Error("ERP_API_BASE_URL is still a placeholder or local mock.");
  const response = await fetch(`${base}/health`, {
    headers: { Authorization: `Bearer ${process.env.ERP_SERVICE_TOKEN}`, Accept: "application/json" },
    signal: AbortSignal.timeout(10_000)
  });
  if (!response.ok) throw new Error(`ERP health/read contract returned HTTP ${response.status}.`);
  return `ERP read endpoint reachable (${new URL(base).origin}).`;
});

await check("Production API readiness", ["PRODUCTION_API_URL"], async () => {
  const base = process.env.PRODUCTION_API_URL!.replace(/\/$/, "");
  const response = await fetch(`${base}/health/ready`, { signal: AbortSignal.timeout(10_000) });
  const body = await response.json().catch(() => null) as { data?: { database?: string } } | null;
  if (!response.ok || body?.data?.database !== "ok") throw new Error(`Production readiness failed with HTTP ${response.status}.`);
  return `Production API and database ready at ${new URL(base).origin}.`;
});

const report = {
  generatedAt: now,
  safeMode: "No payment charge, email send, ERP write, DNS write or deployment performed.",
  summary: {
    passed: results.filter((item) => item.status === "passed").length,
    failed: results.filter((item) => item.status === "failed").length,
    blocked: results.filter((item) => item.status === "blocked").length
  },
  results
};
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (report.summary.failed > 0 || report.summary.blocked > 0) process.exit(2);

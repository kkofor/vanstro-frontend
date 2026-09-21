const failures: string[] = [];
if (process.env.VANSTRO_RUNTIME_MODE === "deployment") failures.push("Demo mode cannot run in deployment.");
if (process.env.ENABLE_DEMO_INTEGRATIONS !== "true") failures.push("ENABLE_DEMO_INTEGRATIONS must be true.");
if (!process.env.DATABASE_URL?.trim()) failures.push("DATABASE_URL is required.");
if (!process.env.PAYMENT_CALLBACK_SECRET?.trim()) failures.push("PAYMENT_CALLBACK_SECRET is required.");
if (!process.env.ERP_WEBHOOK_SECRET?.trim()) failures.push("ERP_WEBHOOK_SECRET is required.");
if (process.env.MONERIS_ENVIRONMENT === "prod") failures.push("MONERIS_ENVIRONMENT must not be prod in demo mode.");
if (failures.length) {
  console.error("Demo preflight failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, mode: "demo", realCardCharges: false, realVendorCalls: false }, null, 2));

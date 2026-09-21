export function loadErpProductApiBaseUrl(env: NodeJS.ProcessEnv = process.env) {
  const configured = env.ERP_PRODUCT_API_BASE_URL?.trim();
  if (!configured && env.VANSTRO_RUNTIME_MODE === "deployment") return undefined;
  const baseUrl = (configured ?? "http://www.vanstro.xin/api/Product").replace(/\/$/, "");
  const parsed = new URL(baseUrl);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("ERP_PRODUCT_API_BASE_URL must use HTTP or HTTPS.");
  if (env.VANSTRO_RUNTIME_MODE === "deployment" && parsed.protocol !== "https:") {
    throw new Error("ERP_PRODUCT_API_BASE_URL must use HTTPS in deployment mode.");
  }
  return baseUrl;
}

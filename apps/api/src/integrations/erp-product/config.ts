export function loadErpProductApiBaseUrl(env: NodeJS.ProcessEnv = process.env) {
  const configured = env.ERP_PRODUCT_API_BASE_URL?.trim();
  // Unset disables the product API. Callers surface that on use; import does not throw.
  if (!configured) return undefined;
  const baseUrl = configured.replace(/\/$/, "");
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error("ERP_PRODUCT_API_BASE_URL must be a valid HTTP or HTTPS URL.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("ERP_PRODUCT_API_BASE_URL must use HTTP or HTTPS.");
  if (env.VANSTRO_RUNTIME_MODE === "deployment" && parsed.protocol !== "https:") {
    throw new Error("ERP_PRODUCT_API_BASE_URL must use HTTPS in deployment mode.");
  }
  return baseUrl;
}

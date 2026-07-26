export function loadErpProductApiBaseUrl(env: NodeJS.ProcessEnv = process.env) {
  return (env.ERP_PRODUCT_API_BASE_URL ?? "http://www.vanstro.xin/api/Product").replace(/\/$/, "");
}

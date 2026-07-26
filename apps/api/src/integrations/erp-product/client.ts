import { loadErpProductApiBaseUrl } from "./config.js";
import type {
  ErpCategoryListItem,
  ErpColorListItem,
  ErpEnvelope,
  ErpListResponse,
  ErpProductListItem,
  ErpSkuListItem
} from "./types.js";

export class ErpProductApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErpProductApiError";
  }
}

async function parseEnvelope<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as ErpEnvelope<T> | null;
  if (!response.ok) {
    throw new ErpProductApiError(body?.msg || `ERP product API HTTP ${response.status}`);
  }
  if (!body || body.code !== 1 || body.data === null) {
    throw new ErpProductApiError(body?.msg || "ERP product API returned an error.");
  }
  return body.data;
}

export class ErpProductClient {
  constructor(
    private readonly baseUrl = loadErpProductApiBaseUrl(),
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly timeoutMs = 15_000
  ) {}

  private async fetchWithTimeout(url: string) {
    return this.fetchImpl(url, { signal: AbortSignal.timeout(this.timeoutMs) });
  }

  async productList(params: { limit?: number; page?: number } = {}) {
    const query = new URLSearchParams();
    if (params.limit !== undefined) query.set("limit", String(params.limit));
    if (params.page !== undefined) query.set("page", String(params.page));
    const suffix = query.size ? `?${query}` : "";
    const data = await parseEnvelope<ErpListResponse<ErpProductListItem>>(
      await this.fetchWithTimeout(`${this.baseUrl}/productList${suffix}`)
    );
    return data;
  }

  async skuList(params: { productId?: number } = {}) {
    const query = new URLSearchParams();
    if (params.productId !== undefined && params.productId > 0) query.set("product_id", String(params.productId));
    const suffix = query.size ? `?${query}` : "";
    const data = await parseEnvelope<ErpListResponse<ErpSkuListItem>>(
      await this.fetchWithTimeout(`${this.baseUrl}/skuList${suffix}`)
    );
    return data;
  }

  async colorList(params: { productId?: number; productSkuId?: number; dealerId?: number } = {}) {
    const query = new URLSearchParams();
    if (params.productId !== undefined && params.productId > 0) query.set("product_id", String(params.productId));
    if (params.productSkuId !== undefined && params.productSkuId > 0) {
      query.set("product_sku_id", String(params.productSkuId));
    }
    if (params.dealerId !== undefined && params.dealerId > 0) query.set("dealer_id", String(params.dealerId));
    const suffix = query.size ? `?${query}` : "";
    const data = await parseEnvelope<ErpListResponse<ErpColorListItem>>(
      await this.fetchWithTimeout(`${this.baseUrl}/colorList${suffix}`)
    );
    return data;
  }

  async categoryList(params: { tree?: boolean } = {}) {
    const query = new URLSearchParams();
    if (params.tree) query.set("tree", "1");
    const suffix = query.size ? `?${query}` : "";
    const data = await parseEnvelope<ErpListResponse<ErpCategoryListItem>>(
      await this.fetchWithTimeout(`${this.baseUrl}/categoryList${suffix}`)
    );
    return data;
  }
}

export const erpProductClient = new ErpProductClient();

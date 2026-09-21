export type CanadaPostSuggestion = {
  id: string;
  label: string;
};

export type CanadaPostAddress = {
  line1: string;
  line2?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
};

type FindResponse = {
  Items?: Array<{ Id?: string; Text?: string; Description?: string }>;
};

type RetrieveResponse = {
  Items?: Array<{
    Line1?: string;
    Line2?: string;
    City?: string;
    ProvinceCode?: string;
    PostalCode?: string;
    CountryIso2?: string;
  }>;
};

const FIND_URL =
  "https://ws1.postescanada-canadapost.ca/AddressComplete/Interactive/Find/v2.10/json3.ws";
const RETRIEVE_URL =
  "https://ws1.postescanada-canadapost.ca/AddressComplete/Interactive/Retrieve/v2.11/json3.ws";

export function normalizeCanadianPostalCode(value: string) {
  const compact = value.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(compact)) return undefined;
  return `${compact.slice(0, 3)} ${compact.slice(3)}`;
}

export class CanadaPostAddressCompleteClient {
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  private async getJson<T>(url: string, params: Record<string, string>): Promise<T> {
    const target = new URL(url);
    target.searchParams.set("Key", this.apiKey);
    for (const [key, value] of Object.entries(params)) {
      target.searchParams.set(key, value);
    }
    const response = await this.fetchImpl(target.toString(), {
      signal: AbortSignal.timeout(10_000)
    });
    if (!response.ok) {
      throw new Error(`Canada Post AddressComplete returned HTTP ${response.status}.`);
    }
    return (await response.json()) as T;
  }

  async find(query: string): Promise<CanadaPostSuggestion[]> {
    const trimmed = query.trim();
    if (trimmed.length < 3) return [];
    const payload = await this.getJson<FindResponse>(FIND_URL, {
      SearchTerm: trimmed,
      Country: "CA",
      LanguagePreference: "en",
      MaxSuggestions: "8"
    });
    return (payload.Items ?? [])
      .filter((item) => item.Id && item.Text)
      .map((item) => ({
        id: item.Id!,
        label: item.Description ? `${item.Text}, ${item.Description}` : item.Text!
      }));
  }

  async retrieve(id: string): Promise<CanadaPostAddress | undefined> {
    const payload = await this.getJson<RetrieveResponse>(RETRIEVE_URL, { Id: id });
    const item = payload.Items?.[0];
    if (!item?.Line1 || !item.City || !item.ProvinceCode || !item.PostalCode) return undefined;
    const postalCode = normalizeCanadianPostalCode(item.PostalCode) ?? item.PostalCode;
    return {
      line1: item.Line1,
      ...(item.Line2 ? { line2: item.Line2 } : {}),
      city: item.City,
      province: item.ProvinceCode,
      postalCode,
      country: item.CountryIso2?.toUpperCase() === "CA" ? "CA" : "CA"
    };
  }
}

class DemoCanadaPostClient {
  async find(query: string): Promise<CanadaPostSuggestion[]> {
    if (query.trim().length < 3) return [];
    return [
      { id: "demo-winnipeg-main", label: "100 Main Street, Winnipeg MB R3C 1A1" },
      { id: "demo-toronto-king", label: "100 King Street West, Toronto ON M5X 1A9" },
      { id: "demo-vancouver-granville", label: "701 West Georgia Street, Vancouver BC V7Y 1G5" }
    ].filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase()) || query.trim().length >= 3);
  }

  async retrieve(id: string): Promise<CanadaPostAddress | undefined> {
    const addresses: Record<string, CanadaPostAddress> = {
      "demo-winnipeg-main": { line1: "100 Main Street", city: "Winnipeg", province: "MB", postalCode: "R3C 1A1", country: "CA" },
      "demo-toronto-king": { line1: "100 King Street West", city: "Toronto", province: "ON", postalCode: "M5X 1A9", country: "CA" },
      "demo-vancouver-granville": { line1: "701 West Georgia Street", city: "Vancouver", province: "BC", postalCode: "V7Y 1G5", country: "CA" }
    };
    return addresses[id];
  }
}

export function createCanadaPostClient(env: NodeJS.ProcessEnv = process.env) {
  const apiKey = env.CANADA_POST_API_KEY?.trim();
  if (apiKey) return new CanadaPostAddressCompleteClient(apiKey);
  if (env.VANSTRO_RUNTIME_MODE !== "deployment" && env.ENABLE_DEMO_INTEGRATIONS?.trim().toLowerCase() === "true") {
    return new DemoCanadaPostClient();
  }
  return undefined;
}

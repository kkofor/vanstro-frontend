import { normalizeCanadianPostalCode } from "./integrations/canada-post/address-complete.js";

/**
 * Single source of truth for CustomerAddress validation semantics.
 *
 * Both the customer account address book (`/account/addresses`) and the
 * Dashboard customer address book (`/dashboard/users/:id/addresses`) parse
 * and validate through this module so the two surfaces cannot drift apart:
 * required fields, Canadian province allow-list, Canadian postal-code
 * normalization, and the CA-only country rule are identical everywhere.
 */

export const CANADIAN_PROVINCES: ReadonlySet<string> = new Set([
  "AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"
]);

export const CUSTOMER_ADDRESS_REQUIRED_FIELDS = [
  "firstName",
  "lastName",
  "addressLine1",
  "city",
  "province",
  "postalCode"
] as const;

export const CUSTOMER_ADDRESS_REQUIRED_MESSAGE =
  "Address name, line 1, city, province and postalCode are required.";
export const CUSTOMER_ADDRESS_INVALID_MESSAGE =
  "Province and postal code must be valid Canadian values.";

export type CustomerAddressCreateData = {
  label?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

export type CustomerAddressPatchData = {
  label?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  isDefault?: boolean;
};

function trimmed(body: Record<string, unknown> | null, key: string): string | undefined {
  const value = body?.[key];
  return typeof value === "string" ? value.trim() : undefined;
}

/** Full create validation: all required fields, province allow-list, normalized postal code, CA country. */
export function parseCustomerAddressCreate(
  body: Record<string, unknown> | null
): CustomerAddressCreateData | null {
  if (CUSTOMER_ADDRESS_REQUIRED_FIELDS.some((key) => !trimmed(body, key))) return null;

  const province = trimmed(body, "province")!.toUpperCase();
  const postalRaw = trimmed(body, "postalCode")!;
  const postalCode = normalizeCanadianPostalCode(postalRaw);
  const country = (trimmed(body, "country") ?? "CA").toUpperCase();
  if (!CANADIAN_PROVINCES.has(province) || !postalCode || country !== "CA") return null;

  return {
    label: trimmed(body, "label") || undefined,
    firstName: trimmed(body, "firstName")!,
    lastName: trimmed(body, "lastName")!,
    phone: trimmed(body, "phone") || undefined,
    addressLine1: trimmed(body, "addressLine1")!,
    addressLine2: trimmed(body, "addressLine2") || undefined,
    city: trimmed(body, "city")!,
    province,
    postalCode,
    country: "CA",
    isDefault: body?.isDefault === true
  };
}

/**
 * Partial update validation: any provided field is checked with the same
 * per-field rule as create (non-empty required field, province allow-list,
 * normalized postal code, CA country). Returns the normalized patch data or
 * null when a provided value is invalid.
 */
export function parseCustomerAddressPatch(
  body: Record<string, unknown> | null
): CustomerAddressPatchData | null {
  if (!body) return null;

  const provided = (key: string) => body[key] !== undefined;

  for (const key of ["firstName", "lastName", "addressLine1", "city"] as const) {
    const value = trimmed(body, key);
    if (provided(key) && !value) return null;
  }

  const provinceRaw = trimmed(body, "province");
  const province = provinceRaw ? provinceRaw.toUpperCase() : undefined;
  if (provided("province") && (!province || !CANADIAN_PROVINCES.has(province))) return null;

  const postalRaw = trimmed(body, "postalCode");
  const postalCode = postalRaw ? normalizeCanadianPostalCode(postalRaw) : undefined;
  if (provided("postalCode") && !postalCode) return null;

  const countryRaw = trimmed(body, "country");
  const country = countryRaw ? countryRaw.toUpperCase() : undefined;
  if (provided("country") && country !== "CA") return null;

  const isDefault = typeof body.isDefault === "boolean" ? body.isDefault : undefined;

  const patch: CustomerAddressPatchData = {};
  const label = trimmed(body, "label");
  if (provided("label")) patch.label = label ?? undefined;
  const phone = trimmed(body, "phone");
  if (provided("phone")) patch.phone = phone ?? undefined;
  const addressLine2 = trimmed(body, "addressLine2");
  if (provided("addressLine2")) patch.addressLine2 = addressLine2 ?? undefined;
  for (const key of ["firstName", "lastName", "addressLine1", "city"] as const) {
    if (provided(key)) patch[key] = trimmed(body, key)!;
  }
  if (provided("province")) patch.province = province!;
  if (provided("postalCode")) patch.postalCode = postalCode!;
  if (provided("country")) patch.country = "CA";
  if (isDefault !== undefined) patch.isDefault = isDefault;

  return patch;
}

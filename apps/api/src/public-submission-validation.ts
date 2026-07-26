export const PUBLIC_SUBMISSION_LIMITS = {
  name: 120,
  companyName: 160,
  email: 254,
  phone: 40,
  shortText: 160,
  title: 160,
  message: 5_000,
  url: 2_048,
  locale: 32,
  capabilities: 20,
  capability: 100
} as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isBoundedText(
  value: string | undefined,
  maximum: number,
  options: { required?: boolean } = {}
) {
  if (value === undefined || value.length === 0) return !options.required;
  return value.length <= maximum;
}

export function isValidEmail(value: string | undefined): value is string {
  return Boolean(
    value &&
      value.length <= PUBLIC_SUBMISSION_LIMITS.email &&
      EMAIL_PATTERN.test(value)
  );
}

export function isValidLocale(value: string | undefined) {
  if (!value) return true;
  if (value.length > PUBLIC_SUBMISSION_LIMITS.locale) return false;

  try {
    return Intl.getCanonicalLocales(value).length === 1;
  } catch {
    return false;
  }
}

export function isValidOptionalUrl(value: string | undefined) {
  if (!value) return true;
  if (value.length > PUBLIC_SUBMISSION_LIMITS.url) return false;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isValidRating(value: number | undefined) {
  return Number.isInteger(value) && value! >= 1 && value! <= 5;
}

export function isValidCapabilities(value: unknown, capabilities: string[]) {
  if (value === undefined) return true;
  if (!Array.isArray(value) && typeof value !== "string") return false;
  if (capabilities.length > PUBLIC_SUBMISSION_LIMITS.capabilities) return false;

  return capabilities.every(
    (capability) =>
      capability.trim().length > 0 &&
      capability.trim().length <= PUBLIC_SUBMISSION_LIMITS.capability
  );
}

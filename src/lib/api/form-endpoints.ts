import type { DealerApplicationInput, Locale } from "./api-contract";
import type { ContactLeadInput } from "./dashboard-contract";

const defaultExternalApiBaseUrl = "https://api.vanstro.ca/api/v1";

const externalApiBaseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL || defaultExternalApiBaseUrl
).replace(/\/$/, "");

export const FORM_ENDPOINTS = {
  contactLead: `${externalApiBaseUrl}/contact/leads`,
  dealerApplication: `${externalApiBaseUrl}/dealer-applications`
} as const;

function formString(form: FormData, key: string, required = false) {
  const value = form.get(key);
  const result = typeof value === "string" ? value.trim() : "";
  if (required && !result) throw new Error(`${key} is required.`);
  return result || undefined;
}

export function contactLeadFromForm(
  form: FormData,
  locale: Locale,
  sourcePath: string
): ContactLeadInput {
  const topic = formString(form, "topic", true);
  if (
    topic !== "products" &&
    topic !== "orders" &&
    topic !== "dealer-service" &&
    topic !== "dealer-program" &&
    topic !== "website-support"
  ) {
    throw new Error("topic is invalid.");
  }

  return {
    name: formString(form, "name", true)!,
    email: formString(form, "email", true)!,
    topic,
    message: formString(form, "message", true)!,
    locale,
    sourcePath,
    ...(formString(form, "phone") ? { phone: formString(form, "phone") } : {}),
    ...(formString(form, "city") ? { city: formString(form, "city") } : {}),
    ...(formString(form, "dealer") ? { dealer: formString(form, "dealer") } : {}),
    ...(formString(form, "orderNumber")
      ? { orderNumber: formString(form, "orderNumber") }
      : {})
  };
}

export function dealerApplicationFromForm(
  form: FormData,
  locale: Locale
): DealerApplicationInput {
  return {
    companyName: formString(form, "companyName", true)!,
    contactName: formString(form, "contactName", true)!,
    email: formString(form, "email", true)!,
    phone: formString(form, "phone", true)!,
    city: formString(form, "city", true)!,
    province: formString(form, "province", true)!,
    locale,
    capabilities: form.getAll("capabilities").flatMap((value) =>
      typeof value === "string" && value.trim() ? [value.trim()] : []
    ),
    applicationAcknowledgement: form.get("applicationAcknowledgement") === "on",
    ...(formString(form, "website") ? { website: formString(form, "website") } : {}),
    ...(formString(form, "businessType")
      ? { businessType: formString(form, "businessType") }
      : {}),
    ...(formString(form, "serviceArea")
      ? { serviceArea: formString(form, "serviceArea") }
      : {}),
    ...(formString(form, "productFocus")
      ? { productFocus: formString(form, "productFocus") }
      : {}),
    ...(formString(form, "message") ? { message: formString(form, "message") } : {}),
    ...(formString(form, "source") ? { source: formString(form, "source") } : {})
  };
}

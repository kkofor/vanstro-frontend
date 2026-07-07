const defaultExternalApiBaseUrl = "https://api.vanstro.ca/api/v1";

const externalApiBaseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL || defaultExternalApiBaseUrl
).replace(/\/$/, "");

export const FORM_ENDPOINTS = {
  contactLead: `${externalApiBaseUrl}/contact/leads`,
  dealerApplication: `${externalApiBaseUrl}/dealer-applications`
} as const;

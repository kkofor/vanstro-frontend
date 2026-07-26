import type { DashboardCopy } from "@/lib/i18n/dashboard-copy";
import type { StatusDomain } from "./types";

export function formatCents(amountCents: number, locale: string, currency = "CAD") {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amountCents / 100);
}

export function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatDate(value: string | undefined, locale: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function displayDashboardValue(copy: DashboardCopy, value: string) {
  return value in copy.values ? copy.values[value as keyof DashboardCopy["values"]] : value;
}

export function displayDashboardStatus(copy: DashboardCopy, domain: StatusDomain, value: string) {
  const values = copy.statusValues[domain] as Record<string, string>;
  return values[value] ?? displayDashboardValue(copy, value);
}

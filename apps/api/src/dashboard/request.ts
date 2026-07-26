import { type Prisma } from "@vanstro/db";
import { type Context } from "hono";

export type DashboardErrorCode =
  | "DASHBOARD_INVALID"
  | "DASHBOARD_NOT_FOUND"
  | "DASHBOARD_FORBIDDEN"
  | "DASHBOARD_CONFLICT";

/** Stable error envelope for dashboard/admin routes. */
export function dashboardError(
  context: Context,
  status: 400 | 401 | 403 | 404 | 409,
  code: DashboardErrorCode,
  message: string
) {
  return context.json({ error: message, code }, status);
}

export const DASHBOARD_PAGE_SIZE_DEFAULT = 50;
export const DASHBOARD_PAGE_SIZE_MAX = 100;

export type Pagination = { page: number; pageSize: number; skip: number; take: number };

/** Parse ?page & ?pageSize into bounded, safe values. */
export function parsePagination(context: Context): Pagination {
  const pageRaw = Number(context.req.query("page"));
  const sizeRaw = Number(context.req.query("pageSize"));
  const page = Number.isInteger(pageRaw) && pageRaw >= 1 ? pageRaw : 1;
  const pageSize =
    Number.isInteger(sizeRaw) && sizeRaw >= 1
      ? Math.min(sizeRaw, DASHBOARD_PAGE_SIZE_MAX)
      : DASHBOARD_PAGE_SIZE_DEFAULT;
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function pageMeta(pagination: Pagination, total: number) {
  return {
    page: pagination.page,
    pageSize: pagination.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pagination.pageSize))
  };
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function readBody(context: Context) {
  const body = await context.req.json().catch(() => null);

  return isObject(body) ? body : null;
}

export function optionalString(body: Record<string, unknown>, key: string) {
  const value = body[key];

  return typeof value === "string" ? value : undefined;
}

export function optionalBoolean(body: Record<string, unknown>, key: string) {
  const value = body[key];

  return typeof value === "boolean" ? value : undefined;
}

export function optionalNumber(body: Record<string, unknown>, key: string) {
  const value = body[key];

  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function optionalStringArray(body: Record<string, unknown>, key: string) {
  const value = body[key];

  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : undefined;
}

export function optionalRecord(body: Record<string, unknown>, key: string) {
  const value = body[key];

  return isObject(value) ? (value as Prisma.InputJsonObject) : undefined;
}

/** Accept any JSON array or object value (for flexible content payloads). */
export function optionalJson(body: Record<string, unknown>, key: string) {
  const value = body[key];

  return isObject(value) || Array.isArray(value) ? (value as Prisma.InputJsonValue) : undefined;
}

export function optionalDate(body: Record<string, unknown>, key: string) {
  const value = body[key];
  if (typeof value !== "string" || !value.trim()) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function badRequest(context: Context, message: string) {
  return context.json({ error: message, code: "DASHBOARD_INVALID" }, 400);
}

export function notFound(context: Context, message = "Resource not found.") {
  return dashboardError(context, 404, "DASHBOARD_NOT_FOUND", message);
}

export function conflict(context: Context, message: string) {
  return dashboardError(context, 409, "DASHBOARD_CONFLICT", message);
}

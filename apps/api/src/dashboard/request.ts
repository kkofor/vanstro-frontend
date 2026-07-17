import { type Prisma } from "@vanstro/db";
import { type Context } from "hono";

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

export function badRequest(context: Context, message: string) {
  return context.json({ error: message }, 400);
}

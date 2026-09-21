import type { DashboardAuthorization } from "@/lib/api/api-contract";

/**
 * Per-module edit gates. Each business module's write controls resolve ONLY
 * against that module's own persisted write capability — a grant in one
 * module never opens another (products.write does not open categories,
 * categories.write does not open pricing, and so on). These flags decide
 * only whether write controls render on the client; the server remains the
 * final authorization boundary (403 + audit on any unauthorized write).
 *
 * Dealers use the frozen dealer write capability (settings.write), the same
 * grant the F0 router already requires for dealer ERP-link management.
 */
export const MODULE_WRITE_CAPABILITY: Readonly<Record<string, string>> = {
  categories: "categories.write",
  products: "products.write",
  pricing: "pricing.write",
  promotions: "pricing.write",
  inventory: "inventory.write",
  orders: "orders.update",
  customers: "crm.update",
  users: "users.manage",
  dealers: "settings.write"
} as const;

/** The write permission key that gates a module's edit controls, if any. */
export function moduleWritePermissionKey(moduleKey: string): string | null {
  return MODULE_WRITE_CAPABILITY[moduleKey] ?? null;
}

/**
 * True when the authorization allows the module's OWN write capability.
 * An allow on any other permission (or on any other module) never counts.
 */
export function hasModuleWriteCapability(
  authorization: DashboardAuthorization | undefined,
  moduleKey: string
): boolean {
  const permissionKey = moduleWritePermissionKey(moduleKey);
  if (!permissionKey || !authorization) return false;
  const module = authorization.modules.find((entry) => entry.module === moduleKey);
  return (
    module?.actions.some(
      (entry) => entry.permissionKey === permissionKey && entry.decision === "allow"
    ) ?? false
  );
}

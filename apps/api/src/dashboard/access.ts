import { prisma, type Prisma } from "@vanstro/db";
import { type Context, type Next } from "hono";
import { getSessionFromRequest } from "../auth/session.js";

export type DashboardEnv = {
  Variables: {
    actorUserId: string;
    actorPermissions: string[];
  };
};

type DashboardPermissionRule = {
  method: string;
  path: string;
  permission: string;
};

const DASHBOARD_PERMISSION_RULES: DashboardPermissionRule[] = [
  { method: "GET", path: "/dashboard/permissions", permission: "users.read" },
  { method: "GET", path: "/dashboard/roles", permission: "users.read" },
  { method: "POST", path: "/dashboard/roles", permission: "users.manage" },
  { method: "PATCH", path: "/dashboard/roles/:id", permission: "users.manage" },
  { method: "PUT", path: "/dashboard/roles/:id/permissions", permission: "users.manage" },
  { method: "GET", path: "/dashboard/users", permission: "users.read" },
  { method: "GET", path: "/dashboard/users/:id", permission: "users.read" },
  { method: "POST", path: "/dashboard/users", permission: "users.manage" },
  { method: "PATCH", path: "/dashboard/users/:id", permission: "users.manage" },
  { method: "PATCH", path: "/dashboard/users/:id/status", permission: "users.manage" },
  { method: "POST", path: "/dashboard/users/:id/roles", permission: "users.manage" },
  { method: "DELETE", path: "/dashboard/users/:id/roles/:roleId", permission: "users.manage" },
  { method: "GET", path: "/dashboard/categories", permission: "products.read" },
  { method: "POST", path: "/dashboard/categories", permission: "categories.write" },
  { method: "PATCH", path: "/dashboard/categories/:id", permission: "categories.write" },
  { method: "GET", path: "/dashboard/products", permission: "products.read" },
  { method: "POST", path: "/dashboard/products", permission: "products.write" },
  { method: "PATCH", path: "/dashboard/products/:id", permission: "products.write" },
  { method: "POST", path: "/dashboard/products/:id/skus", permission: "products.write" },
  { method: "PATCH", path: "/dashboard/skus/:id", permission: "products.write" },
  { method: "POST", path: "/dashboard/products/:id/assets", permission: "products.write" },
  { method: "GET", path: "/dashboard/sku-mappings", permission: "products.read" },
  { method: "POST", path: "/dashboard/sku-mappings", permission: "products.write" },
  { method: "PATCH", path: "/dashboard/sku-mappings/:id", permission: "products.write" },
  { method: "GET", path: "/dashboard/pricing", permission: "products.read" },
  { method: "POST", path: "/dashboard/pricing", permission: "pricing.write" },
  { method: "PATCH", path: "/dashboard/pricing/:id", permission: "pricing.write" },
  { method: "GET", path: "/dashboard/promotions", permission: "products.read" },
  { method: "POST", path: "/dashboard/promotions", permission: "pricing.write" },
  { method: "PATCH", path: "/dashboard/promotions/:id", permission: "pricing.write" },
  { method: "GET", path: "/dashboard/dealers", permission: "settings.write" },
  { method: "PATCH", path: "/dashboard/dealers/:id", permission: "settings.write" },
  { method: "POST", path: "/dashboard/dealers/:id/erp-links", permission: "settings.write" },
  { method: "POST", path: "/dashboard/dealer-locations/:id/service-areas", permission: "settings.write" },
  { method: "GET", path: "/dashboard/dealer-applications", permission: "dealer_applications.read" },
  { method: "GET", path: "/dashboard/dealer-applications/:id", permission: "dealer_applications.read" },
  { method: "PATCH", path: "/dashboard/dealer-applications/:id/status", permission: "dealer_applications.update" },
  { method: "POST", path: "/dashboard/dealer-applications/:id/notes", permission: "dealer_applications.update" },
  { method: "GET", path: "/dashboard/contact-leads", permission: "leads.read" },
  { method: "GET", path: "/dashboard/contact-leads/:id", permission: "leads.read" },
  { method: "PATCH", path: "/dashboard/contact-leads/:id/status", permission: "leads.update" },
  { method: "POST", path: "/dashboard/contact-leads/:id/assign", permission: "leads.update" },
  { method: "POST", path: "/dashboard/contact-leads/:id/notes", permission: "leads.update" },
  { method: "GET", path: "/dashboard/product-reviews", permission: "reviews.read" },
  { method: "GET", path: "/dashboard/product-reviews/:id", permission: "reviews.read" },
  { method: "PATCH", path: "/dashboard/product-reviews/:id/status", permission: "reviews.moderate" },
  { method: "POST", path: "/dashboard/product-reviews/:id/notes", permission: "reviews.moderate" },
  { method: "GET", path: "/dashboard/email/outbox", permission: "email.outbox.read" },
  { method: "POST", path: "/dashboard/email/outbox/:id/retry", permission: "email.outbox.retry" },
  { method: "GET", path: "/dashboard/mcp/service-accounts", permission: "service_accounts.manage" },
  { method: "POST", path: "/dashboard/mcp/service-accounts", permission: "service_accounts.manage" },
  { method: "PATCH", path: "/dashboard/mcp/service-accounts/:id", permission: "service_accounts.manage" },
  { method: "POST", path: "/dashboard/mcp/service-accounts/:id/tokens", permission: "service_accounts.manage" },
  { method: "DELETE", path: "/dashboard/mcp/service-accounts/:id/tokens/:tokenId", permission: "service_accounts.manage" },
  { method: "GET", path: "/dashboard/mcp/invocations", permission: "settings.write" },
  { method: "GET", path: "/dashboard/audit-logs", permission: "audit_logs.read" },
  { method: "GET", path: "/dashboard/operations/alerts", permission: "audit_logs.read" },
  { method: "GET", path: "/dashboard/payment-sessions", permission: "orders.read" },
  { method: "GET", path: "/dashboard/orders", permission: "orders.read" },
  { method: "GET", path: "/dashboard/orders/:id", permission: "orders.read" },
  { method: "GET", path: "/dashboard/erp-sync-jobs", permission: "erp.sync.read" },
  { method: "GET", path: "/dashboard/erp-sync-jobs/:id", permission: "erp.sync.read" },
  { method: "POST", path: "/dashboard/erp-sync-jobs/:id/retry", permission: "erp.sync.retry" }
];

function matchesRoutePath(path: string, routePath: string) {
  const pathParts = path.split("/");
  const routeParts = routePath.split("/");

  return pathParts.length === routeParts.length && routeParts.every((part, index) =>
    part.startsWith(":") ? Boolean(pathParts[index]) : part === pathParts[index]
  );
}

function requiredDashboardPermission(context: Context<DashboardEnv>) {
  const path = context.req.path.replace(/^\/api\/v1/, "");

  return DASHBOARD_PERMISSION_RULES.find(
    (rule) => rule.method === context.req.method && matchesRoutePath(path, rule.path)
  )?.permission;
}

export async function requireDashboardPermission(context: Context<DashboardEnv>, next: Next) {
  const session = await getSessionFromRequest(context);

  if (!session || session.user.kind !== "admin") {
    return context.json({ error: "Authentication is required." }, 401);
  }

  const permission = requiredDashboardPermission(context);

  if (!permission) {
    return context.json({ error: "Dashboard route is not allowed." }, 403);
  }

  if (!session.user.permissions.includes("dashboard.access") || !session.user.permissions.includes(permission)) {
    return context.json({ error: `${permission} is required.` }, 403);
  }

  context.set("actorUserId", session.user.id);
  context.set("actorPermissions", session.user.permissions);
  await next();
}

export async function writeAudit(
  context: Context<DashboardEnv>,
  action: string,
  resourceType: string,
  resourceId?: string,
  metadata?: Prisma.InputJsonObject,
  database: typeof prisma | Prisma.TransactionClient = prisma
) {
  await database.auditLog.create({
    data: {
      actorUserId: context.get("actorUserId"),
      action,
      resourceType,
      resourceId,
      metadata
    }
  });
}

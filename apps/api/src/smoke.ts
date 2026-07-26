import { prisma } from "@vanstro/db";
import { createHash, createHmac } from "node:crypto";
import { createApp } from "./app.js";

const app = createApp();

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function expectStatus(
  label: string,
  response: Response,
  expectedStatus: number
) {
  if (response.status !== expectedStatus) {
    const body = await response.text();

    throw new Error(
      `${label} expected ${expectedStatus}, got ${response.status}: ${body}`
    );
  }
}

async function expectJson<T>(label: string, response: Response) {
  const body = (await response.json().catch(() => undefined)) as T | undefined;

  if (!body) {
    throw new Error(`${label} did not return JSON.`);
  }

  return body;
}

async function requestJson<T>(
  label: string,
  path: string,
  input: { token?: string; method?: string; body?: unknown; status?: number; headers?: Record<string, string> } = {}
) {
  const response = await app.request(path, {
    method: input.method ?? "GET",
    headers: {
      ...(input.token ? { authorization: `Bearer ${input.token}` } : {}),
      ...input.headers,
      ...(input.body ? { "content-type": "application/json" } : {})
    },
    body: input.body ? JSON.stringify(input.body) : undefined
  });

  await expectStatus(label, response, input.status ?? 200);

  return expectJson<T>(label, response);
}

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const paymentCallbackSecret = process.env.PAYMENT_CALLBACK_SECRET;
  const smokeStartedAt = new Date();
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const databaseName = (() => {
    try {
      return new URL(databaseUrl).pathname.replace(/^\//, "");
    } catch {
      return "";
    }
  })();

  if (
    process.env.VANSTRO_RUNTIME_MODE !== "test" ||
    process.env.ALLOW_DESTRUCTIVE_SMOKE?.trim().toLowerCase() !== "true" ||
    !/(^|[_-])(test|smoke)([_-]|$)/i.test(databaseName)
  ) {
    throw new Error(
      "Destructive API smoke requires VANSTRO_RUNTIME_MODE=test, ALLOW_DESTRUCTIVE_SMOKE=true, and a database name containing test or smoke."
    );
  }

  if (!email || !password || !paymentCallbackSecret) {
    throw new Error("SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD and PAYMENT_CALLBACK_SECRET are required.");
  }

  await prisma.product.updateMany({
    where: { slug: { startsWith: "smoke-product-" } },
    data: { status: "archived" }
  });
  await prisma.category.updateMany({
    where: { slug: { startsWith: "smoke-category-" } },
    data: { isActive: false }
  });
  await prisma.promotion.updateMany({
    where: { key: { startsWith: "smoke-promo-" } },
    data: { status: "archived" }
  });
  await prisma.contactLead.deleteMany({
    where: { email: { startsWith: "smoke-lead-" } }
  });
  await prisma.dealerApplication.deleteMany({
    where: { email: { startsWith: "smoke-dealer-" } }
  });
  await prisma.productReview.deleteMany({
    where: { email: { startsWith: "smoke-review-" } }
  });
  await prisma.user.deleteMany({
    where: { email: { startsWith: "smoke-admin-" } }
  });
  await prisma.serviceAccount.deleteMany({
    where: { key: { startsWith: "smoke-" } }
  });
  await prisma.role.deleteMany({
    where: { key: { startsWith: "smoke-" } }
  });
  await prisma.order.deleteMany({
    where: { email: { startsWith: "smoke-customer-" } }
  });
  await prisma.paymentSession.deleteMany({
    where: { guestEmail: { startsWith: "smoke-customer-" } }
  });
  await prisma.crmContact.deleteMany({
    where: {
      OR: [
        { email: { startsWith: "smoke-customer-" } },
        { email: { startsWith: "smoke-delivery-" } }
      ]
    }
  });
  await prisma.user.deleteMany({
    where: { email: { startsWith: "smoke-customer-" } }
  });

  await expectStatus(
    "readiness",
    await app.request("/api/v1/health"),
    200
  );

  const preflightOrigin = "http://localhost:3000";
  const preflightResponse = await app.request("/api/v1/products/demo/reviews", {
    method: "OPTIONS",
    headers: {
      origin: preflightOrigin,
      "access-control-request-method": "POST",
      "access-control-request-headers": "content-type"
    }
  });
  await expectStatus("cors preflight", preflightResponse, 204);

  if (preflightResponse.headers.get("access-control-allow-origin") !== preflightOrigin) {
    throw new Error("cors preflight did not echo the allowed storefront origin.");
  }

  const categoriesResponse = await app.request("/api/v1/categories");
  await expectStatus("categories", categoriesResponse, 200);
  const categories = await expectJson<{ data: unknown[] }>(
    "categories",
    categoriesResponse
  );

  if (categories.data.length === 0) {
    throw new Error("categories returned an empty list.");
  }

  await expectStatus(
    "dashboard without auth",
    await app.request("/api/v1/dashboard/products"),
    401
  );

  await expectStatus(
    "wrong password",
    await app.request("/api/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password: "wrong-password" })
    }),
    401
  );

  const loginResponse = await app.request("/api/v1/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  await expectStatus("login", loginResponse, 200);
  const login = await expectJson<{
    data?: {
      accessToken?: string;
      tokenType?: string;
      user?: { id?: string; permissions?: string[] };
    };
  }>("login", loginResponse);
  const token = login.data?.accessToken;

  if (
    !token ||
    login.data?.tokenType !== "Bearer" ||
    !login.data.user?.id ||
    !login.data.user.permissions?.includes("dashboard.access") ||
    !login.data.user.permissions.includes("service_accounts.manage")
  ) {
    throw new Error("login did not return a fully seeded super-admin Bearer token.");
  }
  const adminUserId = login.data.user.id;

  await expectStatus(
    "dashboard with auth",
    await app.request("/api/v1/dashboard/products", {
      headers: { authorization: `Bearer ${token}` }
    }),
    200
  );
  const unknownDashboardResponse = await app.request("/api/v1/dashboard/not-allowlisted", {
      headers: { authorization: `Bearer ${token}` }
    });
  await expectStatus("unknown dashboard route is denied", unknownDashboardResponse, 403);
  const unknownDashboardBody = await expectJson<{ error?: string }>(
    "unknown dashboard route is denied",
    unknownDashboardResponse
  );
  if (unknownDashboardBody.error !== "Dashboard route is not allowed.") {
    throw new Error("unknown Dashboard route did not reach the fail-closed permission branch.");
  }
  await requestJson<{ data: unknown[] }>(
    "dashboard operations alerts",
    "/api/v1/dashboard/operations/alerts",
    { token }
  );

  const suffix = Date.now().toString(36);
  const role = await requestJson<{ data: { id: string } }>(
    "create role",
    "/api/v1/dashboard/roles",
    {
      token,
      method: "POST",
      status: 201,
      body: {
        key: `smoke-role-${suffix}`,
        name: `Smoke Role ${suffix}`
      }
    }
  );
  await requestJson<{ data: { id: string } }>(
    "patch role",
    `/api/v1/dashboard/roles/${role.data.id}`,
    {
      token,
      method: "PATCH",
      body: { description: "Updated by API smoke." }
    }
  );
  await requestJson<{ data: { id: string } }>(
    "replace role permissions",
    `/api/v1/dashboard/roles/${role.data.id}/permissions`,
    {
      token,
      method: "PUT",
      body: {
        permissionKeys: [
          "dashboard.access",
          "users.manage",
          "products.read",
          "service_accounts.manage",
          "mcp.access",
          "mcp.tools.execute",
          "cli.access",
          "erp.sync.read",
          "erp.sync.retry",
          "email.outbox.read",
          "email.outbox.retry"
        ]
      }
    }
  );

  const strongerRole = await requestJson<{ data: { id: string } }>(
    "create stronger role",
    "/api/v1/dashboard/roles",
    {
      token,
      method: "POST",
      status: 201,
      body: {
        key: `smoke-stronger-role-${suffix}`,
        name: `Smoke Stronger Role ${suffix}`
      }
    }
  );
  await requestJson<{ data: { id: string } }>(
    "assign stronger role permissions",
    `/api/v1/dashboard/roles/${strongerRole.data.id}/permissions`,
    {
      token,
      method: "PUT",
      body: { permissionKeys: ["dashboard.access", "audit_logs.read"] }
    }
  );
  const unknownPermissionResponse = await app.request(
    `/api/v1/dashboard/roles/${strongerRole.data.id}/permissions`,
    {
      method: "PUT",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({ permissionKeys: ["dashboard.access", "permission.does.not.exist"] })
    }
  );
  await expectStatus("unknown role permission is rejected", unknownPermissionResponse, 400);

  await expectStatus(
    "mcp health",
    await app.request("/api/v1/mcp/health"),
    200
  );
  await expectStatus(
    "mcp tools without service account",
    await app.request("/api/v1/mcp/tools"),
    401
  );

  const serviceAccount = await requestJson<{ data: { id: string } }>(
    "create mcp service account",
    "/api/v1/dashboard/mcp/service-accounts",
    {
      token,
      method: "POST",
      status: 201,
      body: {
        key: `smoke-mcp-${suffix}`,
        name: `Smoke MCP ${suffix}`,
        roleIds: [role.data.id]
      }
    }
  );
  const serviceAccountToken = await requestJson<{
    data: { id: string; token: string };
  }>(
    "create mcp service account token",
    `/api/v1/dashboard/mcp/service-accounts/${serviceAccount.data.id}/tokens`,
    {
      token,
      method: "POST",
      status: 201,
      body: { name: "API smoke" }
    }
  );
  const mcpTools = await requestJson<{ data: Array<{ key: string }> }>(
    "mcp tool registry",
    "/api/v1/mcp/tools",
    { token: serviceAccountToken.data.token }
  );

  if (!mcpTools.data.some((tool) => tool.key === "operations.alerts")) {
    throw new Error("operations.alerts is missing from the MCP tool registry.");
  }
  await requestJson<{ data: { output: { status: string } } }>(
    "execute mcp tool",
    "/api/v1/mcp",
    {
      token: serviceAccountToken.data.token,
      method: "POST",
      body: { tool: "platform.health" }
    }
  );
  await requestJson<{ data: { output: { alerts: unknown[] } } }>(
    "execute operations alerts mcp tool",
    "/api/v1/mcp",
    {
      token: serviceAccountToken.data.token,
      method: "POST",
      body: { tool: "operations.alerts" }
    }
  );
  await requestJson<{ data: unknown[] }>(
    "cli erp sync jobs with service account",
    "/api/v1/cli/erp-sync-jobs",
    { token: serviceAccountToken.data.token }
  );
  await requestJson<{ data: unknown[] }>(
    "cli email outbox with service account",
    "/api/v1/cli/email/outbox",
    { token: serviceAccountToken.data.token }
  );
  const invocations = await requestJson<{ data: Array<{ toolKey: string; status: string }> }>(
    "dashboard mcp invocations",
    "/api/v1/dashboard/mcp/invocations",
    { token }
  );

  if (!invocations.data.some((item) => item.toolKey === "platform.health" && item.status === "succeeded")) {
    throw new Error("MCP tool invocation was not recorded.");
  }

  await requestJson<{ data: { revoked: boolean } }>(
    "revoke mcp service account token",
    `/api/v1/dashboard/mcp/service-accounts/${serviceAccount.data.id}/tokens/${serviceAccountToken.data.id}`,
    { token, method: "DELETE" }
  );
  await expectStatus(
    "revoked mcp token",
    await app.request("/api/v1/mcp/tools", {
      headers: { authorization: `Bearer ${serviceAccountToken.data.token}` }
    }),
    401
  );
  const lifecycleServiceAccountToken = await requestJson<{
    data: { id: string; token: string };
  }>(
    "create service account lifecycle token",
    `/api/v1/dashboard/mcp/service-accounts/${serviceAccount.data.id}/tokens`,
    {
      token,
      method: "POST",
      status: 201,
      body: { name: "Disable lifecycle smoke" }
    }
  );
  const lifecycleServiceAccountTokenTwo = await requestJson<{
    data: { id: string; token: string };
  }>(
    "create second service account lifecycle token",
    `/api/v1/dashboard/mcp/service-accounts/${serviceAccount.data.id}/tokens`,
    {
      token,
      method: "POST",
      status: 201,
      body: { name: "Disable lifecycle smoke two" }
    }
  );
  for (const lifecycleToken of [lifecycleServiceAccountToken, lifecycleServiceAccountTokenTwo]) {
    await expectStatus(
      "service account lifecycle token is active before disable",
      await app.request("/api/v1/mcp/tools", {
        headers: { authorization: `Bearer ${lifecycleToken.data.token}` }
      }),
      200
    );
  }
  const activeLifecycleTokenCount = await prisma.serviceAccountToken.count({
    where: {
      id: { in: [lifecycleServiceAccountToken.data.id, lifecycleServiceAccountTokenTwo.data.id] },
      revokedAt: null
    }
  });
  if (activeLifecycleTokenCount !== 2) {
    throw new Error("service account lifecycle tokens were not both active before disable.");
  }

  const roleManagerRole = await requestJson<{ data: { id: string } }>(
    "create role manager role",
    "/api/v1/dashboard/roles",
    {
      token,
      method: "POST",
      status: 201,
      body: {
        key: `smoke-role-manager-${suffix}`,
        name: `Smoke Role Manager ${suffix}`
      }
    }
  );
  await requestJson<{ data: { id: string } }>(
    "assign role manager permissions",
    `/api/v1/dashboard/roles/${roleManagerRole.data.id}/permissions`,
    {
      token,
      method: "PUT",
      body: { permissionKeys: ["dashboard.access", "users.manage", "products.read"] }
    }
  );
  const roleManagerUser = await requestJson<{ data: { id: string } }>(
    "create role manager user",
    "/api/v1/dashboard/users",
    {
      token,
      method: "POST",
      status: 201,
      body: {
        email: `smoke-admin-role-manager-${suffix}@vanstro.local`,
        kind: "admin",
        displayName: `Smoke Role Manager ${suffix}`,
        password: `SmokeRoleManager-${suffix}`,
        status: "active",
        roleIds: [roleManagerRole.data.id]
      }
    }
  );
  const roleManagerLogin = await requestJson<{ data: { accessToken: string } }>(
    "login role manager user",
    "/api/v1/auth/login",
    {
      method: "POST",
      body: {
        email: `smoke-admin-role-manager-${suffix}@vanstro.local`,
        password: `SmokeRoleManager-${suffix}`
      }
    }
  );
  const machineRoleMutationResponse = await app.request(
    `/api/v1/dashboard/roles/${role.data.id}/permissions`,
    {
      method: "PUT",
      headers: {
        authorization: `Bearer ${roleManagerLogin.data.accessToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        permissionKeys: ["dashboard.access", "users.manage", "products.read"]
      })
    }
  );
  await expectStatus(
    "role manager cannot mutate a service-account role",
    machineRoleMutationResponse,
    403
  );
  const machineRoleMutationBody = await expectJson<{ error?: string }>(
    "role manager cannot mutate a service-account role",
    machineRoleMutationResponse
  );
  if (!machineRoleMutationBody.error?.includes("service_accounts.manage")) {
    throw new Error("service-account role mutation was not rejected by its dedicated permission guard.");
  }

  const user = await requestJson<{ data: { id: string } }>(
    "create dashboard user",
    "/api/v1/dashboard/users",
    {
      token,
      method: "POST",
      status: 201,
      body: {
        email: `smoke-admin-${suffix}@vanstro.local`,
        kind: "admin",
        displayName: `Smoke Admin ${suffix}`,
        password: `SmokePassword-${suffix}`,
        status: "active",
        roleIds: [role.data.id]
      }
    }
  );
  const limitedAdminLogin = await requestJson<{
    data: { accessToken: string; user: { permissions: string[] } };
  }>(
    "login limited dashboard user",
    "/api/v1/auth/login",
    {
      method: "POST",
      body: {
        email: `smoke-admin-${suffix}@vanstro.local`,
        password: `SmokePassword-${suffix}`
      }
    }
  );
  if (
    !limitedAdminLogin.data.user.permissions.includes("service_accounts.manage") ||
    !limitedAdminLogin.data.user.permissions.includes("users.manage") ||
    limitedAdminLogin.data.user.permissions.includes("audit_logs.read")
  ) {
    throw new Error("limited dashboard user does not have the permission set required for the ceiling test.");
  }
  const limitedAdminSecondLogin = await requestJson<{ data: { accessToken: string } }>(
    "create second limited dashboard session",
    "/api/v1/auth/login",
    {
      method: "POST",
      body: {
        email: `smoke-admin-${suffix}@vanstro.local`,
        password: `SmokePassword-${suffix}`
      }
    }
  );
  await expectStatus(
    "limited dashboard user reads products",
    await app.request("/api/v1/dashboard/products", {
      headers: { authorization: `Bearer ${limitedAdminLogin.data.accessToken}` }
    }),
    200
  );
  await expectStatus(
    "limited dashboard user cannot read users",
    await app.request("/api/v1/dashboard/users", {
      headers: { authorization: `Bearer ${limitedAdminLogin.data.accessToken}` }
    }),
    403
  );
  const escalationResponse = await app.request("/api/v1/dashboard/mcp/service-accounts", {
      method: "POST",
      headers: {
        authorization: `Bearer ${limitedAdminLogin.data.accessToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        key: `smoke-escalation-${suffix}`,
        name: `Smoke Escalation ${suffix}`,
        roleIds: [strongerRole.data.id]
      })
    });
  await expectStatus(
    "limited dashboard user cannot assign stronger service account role",
    escalationResponse,
    403
  );
  const escalationBody = await expectJson<{ error?: string }>(
    "limited dashboard user cannot assign stronger service account role",
    escalationResponse
  );
  if (!escalationBody.error?.includes("Cannot assign permissions") || !escalationBody.error.includes("audit_logs.read")) {
    throw new Error("service-account escalation was not rejected by the permission ceiling.");
  }
  const escalatedServiceAccount = await prisma.serviceAccount.findUnique({
    where: { key: `smoke-escalation-${suffix}` },
    select: { id: true }
  });
  if (escalatedServiceAccount) {
    throw new Error("permission-ceiling rejection still created a service account.");
  }
  const roleEscalationResponse = await app.request(
    `/api/v1/dashboard/roles/${strongerRole.data.id}/permissions`,
    {
      method: "PUT",
      headers: {
        authorization: `Bearer ${limitedAdminLogin.data.accessToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({ permissionKeys: ["dashboard.access", "audit_logs.read"] })
    }
  );
  await expectStatus("limited admin cannot grant a stronger role permission", roleEscalationResponse, 403);
  const roleEscalationBody = await expectJson<{ error?: string }>(
    "limited admin cannot grant a stronger role permission",
    roleEscalationResponse
  );
  if (!roleEscalationBody.error?.includes("audit_logs.read")) {
    throw new Error("role permission escalation was not rejected by the actor ceiling.");
  }
  const userRoleEscalationResponse = await app.request(
    `/api/v1/dashboard/users/${user.data.id}/roles`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${limitedAdminLogin.data.accessToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({ roleId: strongerRole.data.id })
    }
  );
  await expectStatus("limited admin cannot assign itself a stronger role", userRoleEscalationResponse, 403);
  const assignedStrongerRole = await prisma.userRole.findUnique({
    where: { userId_roleId: { userId: user.data.id, roleId: strongerRole.data.id } },
    select: { id: true }
  });
  if (assignedStrongerRole) {
    throw new Error("user role escalation rejection still persisted the stronger role.");
  }
  await requestJson<{ data: { id: string } }>(
    "get dashboard user",
    `/api/v1/dashboard/users/${user.data.id}`,
    { token }
  );
  await requestJson<{ data: { id: string } }>(
    "patch dashboard user",
    `/api/v1/dashboard/users/${user.data.id}`,
    {
      token,
      method: "PATCH",
      body: {
        displayName: `Smoke Admin Updated ${suffix}`,
        password: `SmokePassword-Reset-${suffix}`
      }
    }
  );
  const preResetTokens = [
    limitedAdminLogin.data.accessToken,
    limitedAdminSecondLogin.data.accessToken
  ];
  for (const preResetToken of preResetTokens) {
    await expectStatus(
      "password reset revokes every existing session",
      await app.request("/api/v1/auth/me", {
        headers: { authorization: `Bearer ${preResetToken}` }
      }),
      401
    );
  }
  const resetSessionRecords = await prisma.refreshSession.findMany({
    where: { tokenHash: { in: preResetTokens.map(hashToken) } },
    select: { tokenHash: true, revokedAt: true }
  });
  if (resetSessionRecords.length !== 2 || resetSessionRecords.some((record) => !record.revokedAt)) {
    throw new Error("password reset did not persist revocation for every existing session.");
  }
  const resetAdminLogin = await requestJson<{ data: { accessToken: string } }>(
    "login dashboard user after password reset",
    "/api/v1/auth/login",
    {
      method: "POST",
      body: {
        email: `smoke-admin-${suffix}@vanstro.local`,
        password: `SmokePassword-Reset-${suffix}`
      }
    }
  );
  const resetAdminSecondLogin = await requestJson<{ data: { accessToken: string } }>(
    "create second dashboard session after password reset",
    "/api/v1/auth/login",
    {
      method: "POST",
      body: {
        email: `smoke-admin-${suffix}@vanstro.local`,
        password: `SmokePassword-Reset-${suffix}`
      }
    }
  );
  await requestJson<{ data: { id: string } }>(
    "patch dashboard user status",
    `/api/v1/dashboard/users/${user.data.id}/status`,
    {
      token,
      method: "PATCH",
      body: { status: "suspended" }
    }
  );
  const preSuspensionTokens = [
    resetAdminLogin.data.accessToken,
    resetAdminSecondLogin.data.accessToken
  ];
  for (const preSuspensionToken of preSuspensionTokens) {
    await expectStatus(
      "suspension revokes every existing session",
      await app.request("/api/v1/auth/me", {
        headers: { authorization: `Bearer ${preSuspensionToken}` }
      }),
      401
    );
  }
  const suspendedSessionRecords = await prisma.refreshSession.findMany({
    where: { tokenHash: { in: preSuspensionTokens.map(hashToken) } },
    select: { tokenHash: true, revokedAt: true }
  });
  if (suspendedSessionRecords.length !== 2 || suspendedSessionRecords.some((record) => !record.revokedAt)) {
    throw new Error("suspension did not persist revocation for every existing session.");
  }

  await requestJson<{ data: { id: string } }>(
    "disable service account",
    `/api/v1/dashboard/mcp/service-accounts/${serviceAccount.data.id}`,
    {
      token,
      method: "PATCH",
      body: { status: "disabled" }
    }
  );
  for (const lifecycleToken of [lifecycleServiceAccountToken, lifecycleServiceAccountTokenTwo]) {
    await expectStatus(
      "disabled service account token",
      await app.request("/api/v1/mcp/tools", {
        headers: { authorization: `Bearer ${lifecycleToken.data.token}` }
      }),
      401
    );
  }
  const disabledTokenRecords = await prisma.serviceAccountToken.findMany({
    where: {
      id: { in: [lifecycleServiceAccountToken.data.id, lifecycleServiceAccountTokenTwo.data.id] }
    },
    select: { id: true, revokedAt: true }
  });
  if (disabledTokenRecords.length !== 2 || disabledTokenRecords.some((record) => !record.revokedAt)) {
    throw new Error("disabling a service account did not revoke every active token.");
  }
  await requestJson<{ data: { id: string } }>(
    "add dashboard user role",
    `/api/v1/dashboard/users/${user.data.id}/roles`,
    {
      token,
      method: "POST",
      status: 201,
      body: { roleId: role.data.id }
    }
  );
  await requestJson<{ data: { ok: true } }>(
    "remove dashboard user role",
    `/api/v1/dashboard/users/${user.data.id}/roles/${role.data.id}`,
    {
      token,
      method: "DELETE"
    }
  );

  const category = await requestJson<{ data: { id: string } }>(
    "create category",
    "/api/v1/dashboard/categories",
    {
      token,
      method: "POST",
      status: 201,
      body: {
        slug: `smoke-category-${suffix}`,
        name: `Smoke Category ${suffix}`,
        isActive: false
      }
    }
  );
  await requestJson<{ data: { id: string } }>(
    "patch category",
    `/api/v1/dashboard/categories/${category.data.id}`,
    {
      token,
      method: "PATCH",
      body: { description: "Updated by API smoke." }
    }
  );

  const product = await requestJson<{ data: { id: string } }>(
    "create product",
    "/api/v1/dashboard/products",
    {
      token,
      method: "POST",
      status: 201,
      body: {
        slug: `smoke-product-${suffix}`,
        name: `Smoke Product ${suffix}`,
        categoryId: category.data.id,
        status: "active"
      }
    }
  );
  await requestJson<{ data: { id: string } }>(
    "patch product",
    `/api/v1/dashboard/products/${product.data.id}`,
    {
      token,
      method: "PATCH",
      body: { shortDescription: "Updated by API smoke." }
    }
  );

  const sku = await requestJson<{ data: { id: string } }>(
    "create sku",
    `/api/v1/dashboard/products/${product.data.id}/skus`,
    {
      token,
      method: "POST",
      status: 201,
      body: {
        skuCode: `SMOKE-${suffix}`,
        name: `Smoke SKU ${suffix}`
      }
    }
  );
  await requestJson<{ data: { id: string } }>(
    "patch sku",
    `/api/v1/dashboard/skus/${sku.data.id}`,
    {
      token,
      method: "PATCH",
      body: { sortOrder: 1 }
    }
  );

  await requestJson<{ data: { id: string } }>(
    "create asset",
    `/api/v1/dashboard/products/${product.data.id}/assets`,
    {
      token,
      method: "POST",
      status: 201,
      body: {
        url: `/assets/generated/smoke-${suffix}.png`,
        altText: "Smoke asset"
      }
    }
  );

  const price = await requestJson<{ data: { id: string } }>(
    "create price",
    "/api/v1/dashboard/pricing",
    {
      token,
      method: "POST",
      status: 201,
      body: {
        key: `retail:SMOKE-${suffix}`,
        skuId: sku.data.id,
        amountCents: 12345
      }
    }
  );
  await requestJson<{ data: { id: string } }>(
    "patch price",
    `/api/v1/dashboard/pricing/${price.data.id}`,
    {
      token,
      method: "PATCH",
      body: { amountCents: 12500 }
    }
  );

  const promotion = await requestJson<{ data: { id: string } }>(
    "create promotion",
    "/api/v1/dashboard/promotions",
    {
      token,
      method: "POST",
      status: 201,
      body: {
        key: `smoke-promo-${suffix}`,
        name: `Smoke Promo ${suffix}`,
        status: "draft"
      }
    }
  );
  await requestJson<{ data: { id: string } }>(
    "patch promotion",
    `/api/v1/dashboard/promotions/${promotion.data.id}`,
    {
      token,
      method: "PATCH",
      body: { discountLabel: "Smoke discount" }
    }
  );

  const mapping = await requestJson<{ data: { id: string } }>(
    "create sku mapping",
    "/api/v1/dashboard/sku-mappings",
    {
      token,
      method: "POST",
      status: 201,
      body: {
        skuId: sku.data.id,
        erpSystem: "smoke-erp",
        erpSkuKey: `SMOKE-ERP-${suffix}`
      }
    }
  );
  await requestJson<{ data: { id: string } }>(
    "patch sku mapping",
    `/api/v1/dashboard/sku-mappings/${mapping.data.id}`,
    {
      token,
      method: "PATCH",
      body: { erpSkuKey: `SMOKE-ERP-${suffix}-UPDATED` }
    }
  );

  const contactLead = await requestJson<{ data: { leadId: string; status: "new" } }>(
    "submit contact lead",
    "/api/v1/contact/leads",
    {
      method: "POST",
      status: 201,
      body: {
        name: `Smoke Lead ${suffix}`,
        email: `smoke-lead-${suffix}@vanstro.local`,
        topic: "careers",
        city: "Winnipeg, MB",
        message: "Smoke contact lead",
        locale: "en-CA"
      }
    }
  );
  await requestJson<{ data: unknown[] }>(
    "dashboard contact leads",
    "/api/v1/dashboard/contact-leads",
    { token }
  );
  await requestJson<{ data: { id: string } }>(
    "get contact lead",
    `/api/v1/dashboard/contact-leads/${contactLead.data.leadId}`,
    { token }
  );
  await requestJson<{ data: { id: string } }>(
    "assign contact lead",
    `/api/v1/dashboard/contact-leads/${contactLead.data.leadId}/assign`,
    {
      token,
      method: "POST",
      body: { assignedToUserId: login.data.user?.id }
    }
  );
  await requestJson<{ data: { id: string } }>(
    "patch contact lead status",
    `/api/v1/dashboard/contact-leads/${contactLead.data.leadId}/status`,
    {
      token,
      method: "PATCH",
      body: { status: "closed" }
    }
  );
  await requestJson<{ data: { id: string } }>(
    "add contact lead note",
    `/api/v1/dashboard/contact-leads/${contactLead.data.leadId}/notes`,
    {
      token,
      method: "POST",
      status: 201,
      body: { note: "Smoke lead note" }
    }
  );

  const dealerApplication = await requestJson<{
    data: { applicationId: string; status: "submitted" };
  }>("submit dealer application", "/api/v1/dealer-applications", {
    method: "POST",
    status: 201,
    body: {
      companyName: `Smoke Dealer ${suffix}`,
      contactName: `Smoke Contact ${suffix}`,
      email: `smoke-dealer-${suffix}@vanstro.local`,
      phone: "204-000-0000",
      city: "Winnipeg",
      province: "MB",
      serviceArea: "Manitoba",
      capabilities: ["Pickup coordination"],
      applicationAcknowledgement: true
    }
  });
  await requestJson<{ data: unknown[] }>(
    "dashboard dealer applications",
    "/api/v1/dashboard/dealer-applications",
    { token }
  );
  await requestJson<{ data: { id: string } }>(
    "get dealer application",
    `/api/v1/dashboard/dealer-applications/${dealerApplication.data.applicationId}`,
    { token }
  );
  await requestJson<{ data: { id: string } }>(
    "patch dealer application status",
    `/api/v1/dashboard/dealer-applications/${dealerApplication.data.applicationId}/status`,
    {
      token,
      method: "PATCH",
      body: { status: "under_review" }
    }
  );
  await requestJson<{ data: { id: string } }>(
    "add dealer application note",
    `/api/v1/dashboard/dealer-applications/${dealerApplication.data.applicationId}/notes`,
    {
      token,
      method: "POST",
      status: 201,
      body: { note: "Smoke dealer application note" }
    }
  );

  const publishedBefore = await requestJson<{ data: unknown[] }>(
    "published reviews before moderation",
    `/api/v1/products/${product.data.id}/reviews`
  );

  if (publishedBefore.data.length !== 0) {
    throw new Error("pending review appeared before moderation.");
  }

  const review = await requestJson<{
    data: { reviewId: string; status: "pending" };
  }>("submit product review", `/api/v1/products/${product.data.id}/reviews`, {
    method: "POST",
    status: 201,
    body: {
      rating: 5,
      title: "Smoke review",
      body: "Smoke review body",
      nickname: "SmokeReviewer",
      email: `smoke-review-${suffix}@vanstro.local`,
      topics: ["Cabinet fit"],
      acceptedTerms: true
    }
  });
  await requestJson<{ data: unknown[] }>(
    "dashboard product reviews",
    "/api/v1/dashboard/product-reviews",
    { token }
  );
  await requestJson<{ data: { id: string } }>(
    "get product review",
    `/api/v1/dashboard/product-reviews/${review.data.reviewId}`,
    { token }
  );
  await requestJson<{ data: { id: string } }>(
    "add product review note",
    `/api/v1/dashboard/product-reviews/${review.data.reviewId}/notes`,
    {
      token,
      method: "POST",
      status: 201,
      body: { note: "Smoke review note" }
    }
  );
  await requestJson<{ data: { id: string } }>(
    "publish product review",
    `/api/v1/dashboard/product-reviews/${review.data.reviewId}/status`,
    {
      token,
      method: "PATCH",
      body: { status: "published" }
    }
  );

  const publishedAfter = await requestJson<{
    data: Array<{ id: string; name?: string; email?: string }>;
  }>(
    "published reviews after moderation",
    `/api/v1/products/${product.data.id}/reviews`
  );

  const publicReview = publishedAfter.data.find((item) => item.id === review.data.reviewId);

  if (!publicReview) {
    throw new Error("published review did not appear in public reviews.");
  }

  if (!publicReview.name || "email" in publicReview) {
    throw new Error("published review response leaked private reviewer fields.");
  }

  const supportHandoff = await requestJson<{ data: { id: string; status: "new" } }>(
    "submit support handoff",
    "/api/v1/support/handoffs",
    {
      method: "POST",
      status: 201,
      body: {
        channel: "human",
        sourcePath: "/products",
        transcript: [{ role: "user", message: "Smoke handoff request", createdAt: new Date().toISOString() }]
      }
    }
  );
  await requestJson<{ data: unknown[] }>(
    "dashboard support handoffs",
    "/api/v1/dashboard/support/handoffs",
    { token }
  );
  await requestJson<{ data: { id: string } }>(
    "patch support handoff status",
    `/api/v1/dashboard/support/handoffs/${supportHandoff.data.id}/status`,
    {
      token,
      method: "PATCH",
      body: { status: "in_progress" }
    }
  );

  await requestJson<{ data: unknown[] }>(
    "dashboard email outbox",
    "/api/v1/dashboard/email/outbox",
    { token }
  );
  await requestJson<{ data: unknown[] }>(
    "dashboard audit logs",
    "/api/v1/dashboard/audit-logs",
    { token }
  );

  const p1bEmailCount = await prisma.emailOutbox.count({
    where: {
      createdAt: { gte: smokeStartedAt },
      templateKey: {
        in: [
          "contact_lead_received",
          "contact_lead_ack",
          "dealer_application_received",
          "dealer_application_ack",
          "product_review_pending",
          "support_handoff_received"
        ]
      }
    }
  });

  if (p1bEmailCount !== 6) {
    throw new Error("P1b submissions did not create six pending email outbox items.");
  }

  const retryableEmail = await prisma.emailOutbox.findFirstOrThrow({
    where: { createdAt: { gte: smokeStartedAt }, templateKey: "contact_lead_received" }
  });
  await prisma.emailOutbox.update({
    where: { id: retryableEmail.id },
    data: { status: "retry_wait", nextRunAt: new Date() }
  });
  await requestJson<{ data: { status: string } }>(
    "retry failed email",
    `/api/v1/dashboard/email/outbox/${retryableEmail.id}/retry`,
    { token, method: "POST" }
  );
  await expectStatus(
    "reject retry of pending email",
    await app.request(`/api/v1/dashboard/email/outbox/${retryableEmail.id}/retry`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` }
    }),
    409
  );

  const auditCount = await prisma.auditLog.count({
    where: {
      actorUserId: login.data.user?.id,
      resourceId: product.data.id
    }
  });

  if (auditCount === 0) {
    throw new Error("dashboard product writes did not create audit logs.");
  }

  const customerEmail = `smoke-customer-${suffix}@vanstro.local`;
  const customer = await requestJson<{ data: { accessToken: string } }>(
    "register customer",
    "/api/v1/auth/customer/register",
    {
      method: "POST",
      status: 201,
      body: {
        email: customerEmail,
        password: `SmokePassword-${suffix}`,
        firstName: "Smoke",
        lastName: "Customer"
      }
    }
  );
  await requestJson<{ data: { email: string } }>("read customer account", "/api/v1/account/me", {
    token: customer.data.accessToken
  });
  const crmAfterRegister = await prisma.crmContact.findUnique({ where: { email: customerEmail } });
  if (!crmAfterRegister || crmAfterRegister.stage !== "registered") {
    throw new Error("customer registration did not create a CRM contact in registered stage.");
  }
  const registeredEvent = await prisma.crmContactEvent.findFirst({
    where: { contactId: crmAfterRegister.id, type: "registered" }
  });
  if (!registeredEvent) throw new Error("customer registration did not write a CRM registered event.");

  const seededSku = await prisma.platformSku.findFirstOrThrow({
    where: { skuCode: "011090130" },
    include: { product: true }
  });
  const favorite = await requestJson<{ data: { id: string; product: { id: string; sku: string; price: { amountCents: number } } } }>(
    "add customer favorite",
    "/api/v1/account/favorites",
    {
      token: customer.data.accessToken,
      method: "POST",
      status: 201,
      body: { productId: seededSku.product.id }
    }
  );
  if (favorite.data.product.id !== seededSku.product.id || !favorite.data.product.sku || favorite.data.product.price.amountCents <= 0) {
    throw new Error("customer favorite did not return a renderable product summary.");
  }
  await requestJson<{ data: Array<{ product: { id: string } }> }>(
    "read customer favorites",
    "/api/v1/account/favorites",
    { token: customer.data.accessToken }
  );
  await requestJson<{ data: { ok: true } }>(
    "remove customer favorite",
    `/api/v1/account/favorites/${seededSku.product.id}`,
    { token: customer.data.accessToken, method: "DELETE" }
  );
  const location = await prisma.dealerLocation.findFirstOrThrow({ where: { code: "WPG-MAIN" } });
  await prisma.inventorySnapshot.upsert({
    where: { skuId_dealerLocationId: { skuId: seededSku.id, dealerLocationId: location.id } },
    update: { quantityOnHand: 100, quantityReserved: 0, updatedAt: new Date() },
    create: { skuId: seededSku.id, dealerLocationId: location.id, quantityOnHand: 100 }
  });
  const inventoryBeforeCheckout = await prisma.inventorySnapshot.findUniqueOrThrow({
    where: { skuId_dealerLocationId: { skuId: seededSku.id, dealerLocationId: location.id } }
  });

  const guestCart = await requestJson<{ data: { id: string }; meta?: { cartToken?: string } }>(
    "create guest cart",
    "/api/v1/cart"
  );
  const cartToken = guestCart.meta?.cartToken;
  if (!cartToken) throw new Error("guest cart did not return a cart token.");
  const cart = await requestJson<{ data: { items: Array<{ id: string }> } }>(
    "add guest cart item",
    "/api/v1/cart/items",
    { method: "POST", status: 201, headers: { "x-cart-token": cartToken }, body: { productId: seededSku.product.id, quantity: 2 } }
  );
  if (cart.data.items.length !== 1) throw new Error("guest cart did not contain the added item.");
  const persistedCart = await requestJson<{ data: { items: Array<{ quantity: number }> } }>(
    "read guest cart with token",
    "/api/v1/cart",
    { headers: { "x-cart-token": cartToken } }
  );
  if (persistedCart.data.items[0]?.quantity !== 2) {
    throw new Error("guest cart token did not preserve the item quantity.");
  }
  await requestJson("read product inventory", `/api/v1/products/${seededSku.product.id}/inventory`);
  const bulkInventory = await requestJson<{ data: Array<{ productId: string }> }>(
    "read bulk product inventory",
    "/api/v1/products/inventory",
    {
      method: "POST",
      body: { productIds: [seededSku.product.id, seededSku.product.id] }
    }
  );
  if (bulkInventory.data.length !== 2 || bulkInventory.data.some((item) => item.productId !== seededSku.product.id)) {
    throw new Error("bulk inventory did not preserve duplicate input order.");
  }
  await requestJson(
    "reject oversized bulk product inventory request",
    "/api/v1/products/inventory",
    {
      method: "POST",
      status: 400,
      body: { productIds: Array.from({ length: 101 }, () => seededSku.product.id) }
    }
  );
  await requestJson(
    "reject delivery checkout without shipping address",
    "/api/v1/checkout/session",
    {
      method: "POST",
      status: 400,
      headers: { "x-cart-token": cartToken, "idempotency-key": `smoke-invalid-delivery-${suffix}` },
      body: {
        firstName: "Smoke",
        lastName: "Customer",
        email: customerEmail,
        phone: "204-555-0199",
        fulfillment: "delivery",
        paymentMethod: "cash",
        dealerLocationId: location.id
      }
    }
  );
  const checkout = await requestJson<{ data: { id: string; guestOrderToken: string; paymentMethod: string; fulfillment: string } }>(
    "create checkout session",
    "/api/v1/checkout/session",
    { method: "POST", status: 201, headers: { "x-cart-token": cartToken, "idempotency-key": `smoke-checkout-${suffix}` }, body: { firstName: "Smoke", lastName: "Customer", email: customerEmail, phone: "204-555-0199", fulfillment: "pickup", paymentMethod: "cash", notes: "Call on arrival", dealerLocationId: location.id } }
  );
  const checkoutSnapshot = await prisma.paymentSession.findUniqueOrThrow({ where: { id: checkout.data.id } });
  if (checkoutSnapshot.guestFirstName !== "Smoke" || checkoutSnapshot.guestLastName !== "Customer" || checkoutSnapshot.guestPhone !== "204-555-0199" || checkoutSnapshot.paymentMethod !== "cash" || checkoutSnapshot.notes !== "Call on arrival") {
    throw new Error("checkout session did not persist customer, payment, and notes fields.");
  }
  if (checkout.data.paymentMethod !== "cash" || checkout.data.fulfillment !== "pickup") {
    throw new Error("checkout session response did not include payment and fulfillment metadata.");
  }
  const crmAfterCheckout = await prisma.crmContact.findUnique({ where: { email: customerEmail } });
  if (!crmAfterCheckout || crmAfterCheckout.stage !== "checkout_started") {
    throw new Error("checkout session did not advance CRM contact to checkout_started.");
  }
  const ordersBeforePayment = await prisma.order.count({ where: { email: customerEmail } });
  if (ordersBeforePayment !== 0) throw new Error("pending payment session created an order.");
  await expectStatus(
    "reject invalid payment callback",
    await app.request("/api/v1/payments/callback", {
      method: "POST",
      headers: { "content-type": "application/json", "x-payment-signature": "invalid" },
      body: JSON.stringify({ sessionId: checkout.data.id, providerPaymentId: `smoke-payment-${suffix}`, status: "paid" })
    }),
    401
  );
  const providerPaymentId = `smoke-payment-${suffix}`;
  const paymentSignature = createHmac("sha256", paymentCallbackSecret)
    .update(`${checkout.data.id}:${providerPaymentId}`)
    .digest("hex");
  const paidOrder = await requestJson<{ data: { id: string; status: string } }>(
    "accept signed payment callback",
    "/api/v1/payments/callback",
    { method: "POST", headers: { "x-payment-signature": paymentSignature }, body: { sessionId: checkout.data.id, providerPaymentId, status: "paid" } }
  );
  if (paidOrder.data.status !== "paid") throw new Error("paid callback did not create a paid order.");
  const paidOrderSnapshot = await prisma.order.findUniqueOrThrow({ where: { id: paidOrder.data.id } });
  if (paidOrderSnapshot.firstName !== "Smoke" || paidOrderSnapshot.lastName !== "Customer" || paidOrderSnapshot.phone !== "204-555-0199" || paidOrderSnapshot.paymentMethod !== "cash" || paidOrderSnapshot.notes !== "Call on arrival") {
    throw new Error("paid order did not preserve checkout customer, payment, and notes fields.");
  }
  await requestJson("get guest order", `/api/v1/orders/${paidOrder.data.id}?token=${checkout.data.guestOrderToken}`);
  await requestJson("read guest order status", `/api/v1/orders/${paidOrder.data.id}/status?token=${checkout.data.guestOrderToken}`);
  await requestJson(
    "replay signed payment callback",
    "/api/v1/payments/callback",
    { method: "POST", headers: { "x-payment-signature": paymentSignature }, body: { sessionId: checkout.data.id, providerPaymentId, status: "paid" } }
  );
  const [paidOrderCount, erpJobCount] = await Promise.all([
    prisma.order.count({ where: { email: customerEmail } }),
    prisma.erpSyncJob.count({ where: { payload: { path: ["orderId"], equals: paidOrder.data.id } } })
  ]);
  if (paidOrderCount !== 1 || erpJobCount !== 1) throw new Error("payment callback was not idempotent for order or ERP sync job creation.");
  const inventoryAfterPaid = await prisma.inventorySnapshot.findUniqueOrThrow({
    where: { skuId_dealerLocationId: { skuId: seededSku.id, dealerLocationId: location.id } }
  });
  if (inventoryAfterPaid.quantityOnHand !== inventoryBeforeCheckout.quantityOnHand - 2) {
    throw new Error("paid order did not decrement inventory on hand.");
  }
  const erpOrderJob = await prisma.erpSyncJob.findFirst({
    where: { type: "order_create", payload: { path: ["orderId"], equals: paidOrder.data.id } }
  });
  if (!erpOrderJob) throw new Error("paid order did not enqueue order_create ERP job.");
  const crmAfterPaid = await prisma.crmContact.findUnique({ where: { email: customerEmail } });
  if (!crmAfterPaid || crmAfterPaid.stage !== "customer") {
    throw new Error("paid order did not mark CRM contact as customer.");
  }
  const orderPaidEvent = await prisma.crmContactEvent.findFirst({
    where: { contactId: crmAfterPaid.id, type: "order_paid" }
  });
  if (!orderPaidEvent) throw new Error("paid order did not write a CRM order_paid event.");
  const orderConfirmationCount = await prisma.emailOutbox.count({
    where: {
      createdAt: { gte: smokeStartedAt },
      templateKey: "order_confirmation",
      toEmail: customerEmail
    }
  });
  if (orderConfirmationCount !== 1) {
    throw new Error("payment callback did not enqueue an order confirmation email.");
  }

  // --- Extended local-backend coverage: consent, addresses, reservation, CMS, delivery tax ---
  await requestJson<{ data: { id: string } }>(
    "record privacy consent event",
    "/api/v1/privacy/consent-events",
    {
      method: "POST",
      status: 201,
      body: {
        anonymousId: `smoke-anon-${suffix}`,
        source: "accept-all",
        preferences: { strictlyNecessary: true, functional: true, analytics: true, targeting: true }
      }
    }
  );
  const address = await requestJson<{ data: { id: string; province: string } }>(
    "create customer address",
    "/api/v1/account/addresses",
    {
      token: customer.data.accessToken,
      method: "POST",
      status: 201,
      body: {
        firstName: "Smoke",
        lastName: "Customer",
        addressLine1: "100 Main St",
        city: "Winnipeg",
        province: "MB",
        postalCode: "R3C 1A1",
        country: "CA"
      }
    }
  );
  if (address.data.province !== "MB") throw new Error("customer address province was not persisted.");
  await requestJson<{ data: Array<{ id: string }> }>("list customer addresses", "/api/v1/account/addresses", {
    token: customer.data.accessToken
  });

  const reservation = await requestJson<{ data: { reservationId: string; reservationToken: string } }>(
    "create inventory reservation",
    "/api/v1/inventory/reservations",
    {
      method: "POST",
      status: 201,
      body: { productId: seededSku.product.id, quantity: 1, dealerLocationId: location.id }
    }
  );
  await requestJson(
    "release inventory reservation",
    `/api/v1/inventory/reservations/${reservation.data.reservationId}`,
    {
      method: "DELETE",
      headers: { "x-reservation-token": reservation.data.reservationToken }
    }
  );

  const banners = await requestJson<{ data: Array<{ id: string }> }>("read CMS home banners", "/api/v1/home/banners?locale=en-CA");
  if (!Array.isArray(banners.data) || banners.data.length === 0) throw new Error("CMS home banners were empty.");
  const navigation = await requestJson<{ data: { primaryItems: unknown[] }; meta: { locale: string } }>(
    "read CMS navigation fr-CA",
    "/api/v1/navigation?locale=fr-CA"
  );
  if (navigation.meta.locale !== "fr-CA" || !Array.isArray(navigation.data.primaryItems)) {
    throw new Error("CMS navigation did not return fr-CA primary items.");
  }
  await requestJson("read CMS legal page", "/api/v1/legal-pages/privacy?locale=en-CA");
  await requestJson<{ data: Array<{ slug: string }> }>("read CMS articles", "/api/v1/articles?locale=en-CA");

  // Delivery checkout should apply MB 12% tax + flat delivery fee from TaxRate + DELIVERY_FLAT_FEE_CENTS.
  await prisma.inventorySnapshot.update({
    where: { skuId_dealerLocationId: { skuId: seededSku.id, dealerLocationId: location.id } },
    data: { quantityOnHand: 100, quantityReserved: 0, updatedAt: new Date() }
  });
  const deliveryCart = await requestJson<{ meta?: { cartToken?: string } }>("create delivery cart", "/api/v1/cart");
  const deliveryCartToken = deliveryCart.meta?.cartToken;
  if (!deliveryCartToken) throw new Error("delivery cart did not return a cart token.");
  await requestJson("add delivery cart item", "/api/v1/cart/items", {
    method: "POST",
    status: 201,
    headers: { "x-cart-token": deliveryCartToken },
    body: { productId: seededSku.product.id, quantity: 1 }
  });
  const deliveryCheckout = await requestJson<{ data: { id: string; total: { amount: number } }; meta?: { payment?: { provider: string } } }>(
    "create delivery checkout session",
    "/api/v1/checkout/session",
    {
      method: "POST",
      status: 201,
      headers: { "x-cart-token": deliveryCartToken, "idempotency-key": `smoke-delivery-${suffix}` },
      body: {
        firstName: "Smoke",
        lastName: "Delivery",
        email: `smoke-delivery-${suffix}@vanstro.local`,
        phone: "204-555-0198",
        fulfillment: "delivery",
        paymentMethod: "pos",
        dealerLocationId: location.id,
        shippingAddressLine1: "100 Main Street",
        shippingCity: "Winnipeg",
        shippingProvince: "MB",
        shippingPostalCode: "R3C 1A1",
        shippingCountry: "CA"
      }
    }
  );
  const deliverySession = await prisma.paymentSession.findUniqueOrThrow({ where: { id: deliveryCheckout.data.id } });
  const expectedDeliveryShipping = Number(process.env.DELIVERY_FLAT_FEE_CENTS ?? "1500");
  if (deliverySession.shippingCents !== expectedDeliveryShipping) {
    throw new Error(`delivery shipping expected ${expectedDeliveryShipping}, got ${deliverySession.shippingCents}.`);
  }
  if (deliverySession.taxCents <= 0) throw new Error("delivery checkout did not apply provincial tax.");
  if (deliveryCheckout.meta?.payment?.provider !== "manual") {
    throw new Error("checkout did not advertise the manual payment provider.");
  }
  // Release unused delivery reservations and expire the session so smoke leaves no holds.
  const deliveryReservations = await prisma.inventoryReservation.findMany({
    where: { paymentSessionId: deliverySession.id, status: "active" }
  });
  for (const held of deliveryReservations) {
    await prisma.$transaction(async (transaction) => {
      await transaction.inventoryReservation.update({ where: { id: held.id }, data: { status: "released" } });
      const snapshot = await transaction.inventorySnapshot.findFirst({
        where: { skuId: held.skuId, dealerLocationId: held.dealerLocationId }
      });
      if (snapshot) {
        await transaction.inventorySnapshot.update({
          where: { id: snapshot.id },
          data: { quantityReserved: { decrement: held.quantity } }
        });
      }
    });
  }
  await prisma.paymentSession.update({ where: { id: deliverySession.id }, data: { status: "expired" } });

  // ERP inbound webhook (signed) against the paid order.
  const erpExternalId = `smoke-erp-${suffix}`;
  const erpSignature = createHmac("sha256", process.env.ERP_WEBHOOK_SECRET ?? "")
    .update(`configured-erp:${paidOrder.data.id}:${erpExternalId}:fulfilled`)
    .digest("hex");
  await requestJson("accept signed ERP order-status webhook", "/api/v1/integrations/erp/webhooks/order-status", {
    method: "POST",
    headers: { "x-erp-signature": erpSignature },
    body: { orderId: paidOrder.data.id, status: "fulfilled", externalId: erpExternalId, erpSystem: "configured-erp" }
  });
  const fulfilledOrder = await prisma.order.findUniqueOrThrow({ where: { id: paidOrder.data.id } });
  if (fulfilledOrder.status !== "fulfilled") throw new Error("ERP webhook did not update order status to fulfilled.");
  await requestJson(
    "reject ERP webhook without signature",
    "/api/v1/integrations/erp/webhooks/order-status",
    {
      method: "POST",
      status: 401,
      body: { orderId: paidOrder.data.id, status: "cancelled", externalId: `smoke-erp-bad-${suffix}`, erpSystem: "configured-erp" }
    }
  );

  await prisma.privacyConsentEvent.deleteMany({ where: { anonymousId: `smoke-anon-${suffix}` } });
  await prisma.customerAddress.deleteMany({ where: { id: address.data.id } });
  await prisma.paymentSession.deleteMany({ where: { guestEmail: `smoke-delivery-${suffix}@vanstro.local` } });
  await prisma.erpWebhookEvent.deleteMany({ where: { externalId: erpExternalId } });

  await prisma.product.update({
    where: { id: product.data.id },
    data: { status: "archived" }
  });
  await prisma.productReview.delete({ where: { id: review.data.reviewId } });
  await prisma.contactLead.delete({ where: { id: contactLead.data.leadId } });
  await prisma.dealerApplication.delete({
    where: { id: dealerApplication.data.applicationId }
  });
  await prisma.supportHandoff.delete({ where: { id: supportHandoff.data.id } });
  await prisma.emailOutbox.deleteMany({
    where: {
      createdAt: { gte: smokeStartedAt },
      templateKey: {
        in: [
          "contact_lead_received",
          "contact_lead_ack",
          "dealer_application_received",
          "dealer_application_ack",
          "product_review_pending",
          "support_handoff_received",
          "order_confirmation"
        ]
      }
    }
  });
  await prisma.category.update({
    where: { id: category.data.id },
    data: { isActive: false }
  });
  await prisma.promotion.update({
    where: { id: promotion.data.id },
    data: { status: "archived" }
  });
  await prisma.user.delete({ where: { id: user.data.id } });
  await prisma.user.delete({ where: { id: roleManagerUser.data.id } });
  await prisma.serviceAccount.delete({ where: { id: serviceAccount.data.id } });
  await prisma.role.delete({ where: { id: role.data.id } });
  await prisma.role.delete({ where: { id: strongerRole.data.id } });
  await prisma.role.delete({ where: { id: roleManagerRole.data.id } });
  await prisma.order.deleteMany({ where: { email: customerEmail } });
  await prisma.erpSyncJob.deleteMany({
    where: { payload: { path: ["orderId"], equals: paidOrder.data.id } }
  });
  await prisma.paymentSession.deleteMany({ where: { guestEmail: customerEmail } });
  await prisma.user.deleteMany({ where: { email: customerEmail } });

  const sessionCountBeforeRefresh = await prisma.refreshSession.count({
    where: { userId: adminUserId }
  });
  const refreshResponses = await Promise.all([
    app.request("/api/v1/auth/refresh", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` }
    }),
    app.request("/api/v1/auth/refresh", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` }
    })
  ]);
  const refreshStatuses = refreshResponses.map((response) => response.status).sort();
  if (refreshStatuses[0] !== 200 || refreshStatuses[1] !== 401) {
    throw new Error(`concurrent refresh expected one 200 and one 401, received ${refreshStatuses.join(", ")}.`);
  }
  const refreshResponse = refreshResponses.find((response) => response.status === 200);
  if (!refreshResponse) throw new Error("concurrent refresh did not return a successful response.");
  const refresh = await expectJson<{ data?: { accessToken?: string } }>(
    "refresh",
    refreshResponse
  );
  const nextToken = refresh.data?.accessToken;

  if (!nextToken || nextToken === token) {
    throw new Error("refresh did not rotate the token.");
  }
  const [sessionCountAfterRefresh, oldRefreshSession, successorSession] = await Promise.all([
    prisma.refreshSession.count({ where: { userId: adminUserId } }),
    prisma.refreshSession.findUnique({
      where: { tokenHash: hashToken(token) },
      select: { revokedAt: true }
    }),
    prisma.refreshSession.findUnique({
      where: { tokenHash: hashToken(nextToken) },
      select: { revokedAt: true, userId: true }
    })
  ]);
  if (sessionCountAfterRefresh !== sessionCountBeforeRefresh + 1) {
    throw new Error("concurrent refresh did not create exactly one successor session.");
  }
  if (!oldRefreshSession?.revokedAt || !successorSession || successorSession.revokedAt || successorSession.userId !== adminUserId) {
    throw new Error("concurrent refresh did not persist one active successor and one revoked predecessor.");
  }

  await expectStatus(
    "old token revoked",
    await app.request("/api/v1/auth/me", {
      headers: { authorization: `Bearer ${token}` }
    }),
    401
  );

  await expectStatus(
    "new token valid",
    await app.request("/api/v1/auth/me", {
      headers: { authorization: `Bearer ${nextToken}` }
    }),
    200
  );

  await expectStatus(
    "logout",
    await app.request("/api/v1/auth/logout", {
      method: "POST",
      headers: { authorization: `Bearer ${nextToken}` }
    }),
    200
  );

  await expectStatus(
    "token revoked after logout",
    await app.request("/api/v1/auth/me", {
      headers: { authorization: `Bearer ${nextToken}` }
    }),
    401
  );

  console.log("API smoke passed.");
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

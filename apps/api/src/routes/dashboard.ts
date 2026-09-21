import { hashPassword, prisma, type Prisma } from "@vanstro/db";
import { Hono, type Context } from "hono";
import {
  requireDashboardPermission,
  type DashboardEnv,
  writeAudit
} from "../dashboard/access.js";
import { createDashboardSystemRoutes } from "../dashboard/system.js";
import { createDashboardFoundationRoutes } from "../dashboard/foundation.js";
import { createP02AccessRoutes } from "../dashboard/p02-access.js";
import { createDashboardCmsRoutes } from "../dashboard/cms.js";
import { createDashboardCatalogRoutes } from "../dashboard/catalog.js";
import { createDashboardBatchRoutes } from "../dashboard/batch.js";
import { createDashboardErpWebhookRoutes } from "../dashboard/erp-webhooks.js";
import { createDashboardModuleRoutes } from "../dashboard/modules.js";
import { createDashboardDealerRoutes } from "../dashboard/dealers.js";
import { createDashboardCrmRoutes } from "../dashboard/crm.js";
import { createDashboardSupportRoutes } from "../dashboard/support.js";
import { createDashboardJobRoutes } from "../dashboard/jobs.js";
import { createDashboardWorkQueueRoutes } from "../dashboard/work-queue.js";
import { createDashboardMediaRoutes } from "../dashboard/media.js";
import { createDashboardDataJobRoutes } from "../dashboard/data-jobs.js";
import { createDashboardRuntimeFoundationRoutes } from "../dashboard/runtime-foundation.js";
import { createDashboardAnalyticsFoundationRoutes } from "../dashboard/analytics-foundation.js";
import { createDashboardSettingsRoutes } from "../dashboard/settings.js";
import { createDashboardS02SettingsRoutes } from "../dashboard/s02-settings.js";
import { createDashboardS09SettingsRoutes } from "../dashboard/s09-settings.js";
import { createDashboardS10SettingsRoutes } from "../dashboard/s10-settings.js";
import { createDashboardS03SettingsRoutes } from "../dashboard/s03-settings.js";
import { createDashboardS08SettingsRoutes } from "../dashboard/s08-settings.js";
import { revokeUserSessions } from "../auth/session.js";
import { isDealerScopedRoleKey } from "../dashboard/authorization.js";
import { assertLastSuperAdminPreserved, P02InvariantError } from "../dashboard/p02-invariants.js";
import {
  assertAssignableRoles,
  assertManageableUsers,
  assertPermissionsWithinActorCeiling,
  getActorPermissionCeiling,
  lockUsersForPermissionChange,
  PermissionCeilingError
} from "../dashboard/permission-ceiling.js";
import {
  CUSTOMER_ADDRESS_INVALID_MESSAGE,
  CUSTOMER_ADDRESS_REQUIRED_FIELDS,
  CUSTOMER_ADDRESS_REQUIRED_MESSAGE,
  parseCustomerAddressCreate,
  parseCustomerAddressPatch
} from "../customer-address-validation.js";

type CatalogStatus = "draft" | "active" | "archived";
type PriceStatusValue = "draft" | "active" | "archived";
type PromotionStatusValue = "draft" | "active" | "archived";
type UserKindValue = "customer" | "admin";
type UserStatusValue = "active" | "invited" | "suspended" | "archived";
type ContactLeadStatusValue = "new" | "routed" | "closed" | "spam";
type DealerApplicationStatusValue =
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "archived";
type ProductReviewStatusValue = "pending" | "published" | "rejected" | "archived";

const CONTACT_LEAD_STATUSES = new Set<ContactLeadStatusValue>(["new", "routed", "closed", "spam"]);
const DEALER_APPLICATION_STATUSES = new Set<DealerApplicationStatusValue>([
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "archived"
]);
const PRODUCT_REVIEW_STATUSES = new Set<ProductReviewStatusValue>([
  "pending",
  "published",
  "rejected",
  "archived"
]);
import {
  badRequest,
  conflict,
  notFound,
  optionalBoolean,
  optionalNumber,
  optionalRecord,
  optionalString,
  optionalStringArray,
  pageMeta,
  parsePagination,
  readBody
} from "../dashboard/request.js";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function resolveCategoryId(body: Record<string, unknown>) {
  const categoryId = optionalString(body, "categoryId");

  if (categoryId) return categoryId;

  const categorySlug = optionalString(body, "categorySlug");

  if (!categorySlug) return undefined;

  const category = await prisma.category.findUnique({
    where: { slug: categorySlug },
    select: { id: true }
  });

  return category?.id;
}

export function createDashboardRoutes() {
  const routes = new Hono<DashboardEnv>();

  routes.use("/dashboard/*", requireDashboardPermission);

  routes.get("/dashboard/permissions", async (context) => {
    const permissions = await prisma.permission.findMany({
      orderBy: { key: "asc" }
    });

    return context.json({ data: permissions });
  });

  routes.get("/dashboard/roles", async (context) => {
    const roles = await prisma.role.findMany({
      include: { rolePermissions: { include: { permission: true } } },
      orderBy: { key: "asc" }
    });

    return context.json({ data: roles });
  });

  routes.post("/dashboard/roles", async (context) => {
    const body = await readBody(context);

    if (!body) return badRequest(context, "JSON body is required.");

    const key = optionalString(body, "key");
    const name = optionalString(body, "name");

    if (!key || !name) {
      return badRequest(context, "key and name are required.");
    }

    const role = await prisma.role.create({
      data: {
        key,
        name,
        description: optionalString(body, "description"),
        isSystem: optionalBoolean(body, "isSystem") ?? false
      }
    });

    await writeAudit(context, "dashboard.roles.create", "role", role.id);

    return context.json({ data: role }, 201);
  });

  routes.patch("/dashboard/roles/:id", async (context) => {
    const body = await readBody(context);

    if (!body) return badRequest(context, "JSON body is required.");

    const roleId = context.req.param("id");
    const nextKey = optionalString(body, "key");
    const nextIsSystem = optionalBoolean(body, "isSystem");
    const role = await prisma.$transaction(async (database) => {
      const actorPermissionSet = await getActorPermissionCeiling(database, context.get("actorUserId"), [roleId]);
      const current = await database.role.findUnique({ where: { id: roleId } });
      if (!current) throw new PermissionCeilingError(400, "Role not found.");
      if ((current.isSystem || isDealerScopedRoleKey(current.key)) && (nextKey !== undefined || nextIsSystem !== undefined)) {
        throw new PermissionCeilingError(403, "System role scope identity cannot be changed.");
      }
      if (nextIsSystem === true && !actorPermissionSet.has("settings.write")) {
        throw new PermissionCeilingError(403, "settings.write is required to create a system role identity.");
      }
      const updated = await database.role.update({
        where: { id: roleId },
        data: {
          key: nextKey,
          name: optionalString(body, "name"),
          description: optionalString(body, "description"),
          isSystem: nextIsSystem
        }
      });
      await writeAudit(context, "dashboard.roles.update", "role", updated.id, {
        previousKey: current.key,
        nextKey: updated.key,
        previousIsSystem: current.isSystem,
        nextIsSystem: updated.isSystem
      }, database);
      return updated;
    }).catch((error: unknown) => {
      if (error instanceof PermissionCeilingError) return error;
      throw error;
    });

    if (role instanceof PermissionCeilingError) return context.json({ error: role.message }, role.status);
    return context.json({ data: role });
  });

  routes.delete("/dashboard/roles/:id", async (context) => {
    const role = await prisma.role.findUnique({
      where: { id: context.req.param("id") },
      include: { _count: { select: { userRoles: true, serviceAccountRoles: true } } }
    });
    if (!role) return notFound(context, "Role not found.");
    if (role.isSystem) return conflict(context, "System roles cannot be deleted.");
    if (role._count.userRoles > 0 || role._count.serviceAccountRoles > 0) {
      return conflict(context, "Role is still assigned to users or service accounts.");
    }

    await prisma.role.delete({ where: { id: role.id } });
    await writeAudit(context, "dashboard.roles.delete", "role", role.id);

    return context.json({ data: { id: role.id, deleted: true } });
  });

  routes.put("/dashboard/roles/:id/permissions", async (context) => {
    const body = await readBody(context);

    if (!body) return badRequest(context, "JSON body is required.");

    const roleId = context.req.param("id");
    const permissionIds = optionalStringArray(body, "permissionIds");
    const permissionKeys = optionalStringArray(body, "permissionKeys");

    if (
      (body.permissionIds !== undefined &&
        (!Array.isArray(body.permissionIds) || permissionIds?.length !== body.permissionIds.length)) ||
      (body.permissionKeys !== undefined &&
        (!Array.isArray(body.permissionKeys) || permissionKeys?.length !== body.permissionKeys.length))
    ) {
      return badRequest(context, "permissionIds and permissionKeys must be arrays of strings.");
    }

    if (!permissionIds?.length && !permissionKeys?.length) {
      return badRequest(context, "permissionIds or permissionKeys is required.");
    }

    const result = await prisma
      .$transaction(async (database) => {
        const actorPermissionSet = await getActorPermissionCeiling(
          database,
          context.get("actorUserId"),
          [roleId]
        );
        const targetRole = await database.role.findUnique({
          where: { id: roleId },
          include: { rolePermissions: { include: { permission: { select: { key: true } } } } }
        });
        if (!targetRole) throw new PermissionCeilingError(400, "Role not found.");
        assertPermissionsWithinActorCeiling(
          targetRole.rolePermissions.map((entry) => entry.permission.key),
          actorPermissionSet
        );
        if (targetRole.isSystem && !actorPermissionSet.has("settings.write")) {
          throw new PermissionCeilingError(403, "settings.write is required to change a system role.");
        }
        const uniquePermissionIds = [...new Set(permissionIds ?? [])];
        const uniquePermissionKeys = [...new Set(permissionKeys ?? [])];
        const permissions = await database.permission.findMany({
          where: {
            OR: [
              ...(uniquePermissionIds.length ? [{ id: { in: uniquePermissionIds } }] : []),
              ...(uniquePermissionKeys.length ? [{ key: { in: uniquePermissionKeys } }] : [])
            ]
          },
          select: { id: true, key: true }
        });
        const foundPermissionIds = new Set(permissions.map((permission) => permission.id));
        const foundPermissionKeys = new Set(permissions.map((permission) => permission.key));

        if (uniquePermissionIds.some((id) => !foundPermissionIds.has(id))) {
          throw new PermissionCeilingError(400, "Every permissionId must reference an existing permission.");
        }
        if (uniquePermissionKeys.some((key) => !foundPermissionKeys.has(key))) {
          throw new PermissionCeilingError(400, "Every permissionKey must reference an existing permission.");
        }

        assertPermissionsWithinActorCeiling(
          permissions.map((permission) => permission.key),
          actorPermissionSet
        );

        const serviceAccountRoleCount = await database.serviceAccountRole.count({
          where: { roleId }
        });
        if (serviceAccountRoleCount && !actorPermissionSet.has("service_accounts.manage")) {
          throw new PermissionCeilingError(
            403,
            "service_accounts.manage is required to change a role used by a service account."
          );
        }

        const beforePermissionKeys = targetRole.rolePermissions.map((entry) => entry.permission.key).sort();
        await database.rolePermission.deleteMany({ where: { roleId } });
        if (permissions.length) {
          await database.rolePermission.createMany({
            data: permissions.map((permission) => ({ roleId, permissionId: permission.id }))
          });
        }
        await writeAudit(context, "dashboard.roles.permissions.replace", "role", roleId, {
          beforePermissionKeys,
          afterPermissionKeys: permissions.map((permission) => permission.key).sort()
        }, database);

        return true;
      })
      .catch((error: unknown) => {
        if (error instanceof PermissionCeilingError || error instanceof P02InvariantError) return error;
        throw error;
      });

    if (result instanceof PermissionCeilingError) {
      return context.json({ error: result.message }, result.status);
    }

    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: { rolePermissions: { include: { permission: true } } }
    });

    return context.json({ data: role });
  });

  routes.get("/dashboard/users", async (context) => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        kind: true,
        status: true,
        createdAt: true,
        adminProfile: { select: { displayName: true } },
        userRoles: { select: { role: { select: { id: true, key: true, name: true } } } }
      },
      orderBy: { createdAt: "desc" }
    });

    return context.json({ data: users });
  });

  routes.post("/dashboard/users", async (context) => {
    const body = await readBody(context);

    if (!body) return badRequest(context, "JSON body is required.");

    const email = optionalString(body, "email")?.trim().toLowerCase();
    const kind = (optionalString(body, "kind") as UserKindValue | undefined) ?? "admin";

    if (!email) {
      return badRequest(context, "email is required.");
    }

    const roleIdsValue = optionalStringArray(body, "roleIds");
    if (body.roleIds !== undefined && (!Array.isArray(body.roleIds) || roleIdsValue?.length !== body.roleIds.length)) {
      return badRequest(context, "roleIds must be an array of strings.");
    }
    const roleIds = [...new Set(roleIdsValue ?? [])];
    const password = optionalString(body, "password");
    if (password && password.length < 12) {
      return badRequest(context, "password must be at least 12 characters.");
    }
    const user = await prisma
      .$transaction(async (database) => {
        await assertAssignableRoles(database, roleIds, context.get("actorUserId"));

        return database.user.create({
          data: {
            email,
            kind,
            status: (optionalString(body, "status") as UserStatusValue | undefined) ?? "invited",
            emailVerifiedAt: optionalBoolean(body, "emailVerified") ? new Date() : undefined,
            adminProfile:
              kind === "admin"
                ? {
                    create: {
                      displayName: optionalString(body, "displayName") ?? email
                    }
                  }
                : undefined,
            customerProfile:
              kind === "customer"
                ? {
                    create: {
                      firstName: optionalString(body, "firstName"),
                      lastName: optionalString(body, "lastName"),
                      phone: optionalString(body, "phone")
                    }
                  }
                : undefined,
            passwordCredential: password
              ? { create: hashPassword(password) }
              : undefined,
            userRoles: roleIds.length
              ? { create: roleIds.map((roleId) => ({ roleId })) }
              : undefined
          }
        });
      })
      .catch((error: unknown) => {
        if (error instanceof PermissionCeilingError || error instanceof P02InvariantError) return error;
        throw error;
      });

    if (user instanceof PermissionCeilingError || user instanceof P02InvariantError) {
      return context.json({ error: user.message }, user.status);
    }

    await writeAudit(context, "dashboard.users.create", "user", user.id);

    return context.json({ data: user }, 201);
  });

  routes.get("/dashboard/users/:id", async (context) => {
    const user = await prisma.user.findUnique({
      where: { id: context.req.param("id") },
      select: {
        id: true,
        email: true,
        kind: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        emailVerifiedAt: true,
        // Safe detail DTO: customer/admin profile fields only. Never includes
        // password hashes, reset tokens, sessions or payment data.
        adminProfile: { select: { displayName: true } },
        customerProfile: { select: { firstName: true, lastName: true, phone: true } },
        addresses: {
          select: {
            id: true,
            label: true,
            firstName: true,
            lastName: true,
            phone: true,
            addressLine1: true,
            addressLine2: true,
            city: true,
            province: true,
            postalCode: true,
            country: true,
            isDefault: true
          },
          orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }]
        },
        userRoles: { select: { role: { select: { id: true, key: true, name: true } } } }
      }
    });

    if (!user) {
      return context.json({ error: "User not found." }, 404);
    }

    return context.json({ data: user });
  });

  routes.patch("/dashboard/users/:id", async (context) => {
    const body = await readBody(context);

    if (!body) return badRequest(context, "JSON body is required.");

    const userId = context.req.param("id");
    const displayName = optionalString(body, "displayName");
    const password = optionalString(body, "password");
    if (password && password.length < 12) {
      return badRequest(context, "password must be at least 12 characters.");
    }
    const passwordCredential = password ? hashPassword(password) : undefined;
    const status = optionalString(body, "status") as UserStatusValue | undefined;
    const firstName = optionalString(body, "firstName");
    const lastName = optionalString(body, "lastName");
    const phone = optionalString(body, "phone");
    const user = await prisma.$transaction(async (transaction) => {
      await assertManageableUsers(transaction, context.get("actorUserId"), [userId]);
      await assertLastSuperAdminPreserved(transaction, userId, { nextStatus: status });
      if (passwordCredential || status === "suspended" || status === "archived") {
        await revokeUserSessions(transaction,userId,{sessionTokenHash:context.get("actorSessionTokenHash"),actorId:context.get("actorUserId")});
      }

      // Profile writes are kind-guarded: an admin edit can never create a
      // CustomerProfile and a customer edit can never create an AdminProfile.
      const current = await transaction.user.findUniqueOrThrow({
        where: { id: userId },
        select: { id: true, kind: true }
      });
      const updatedUser = await transaction.user.update({
        where: { id: userId },
        data: {
          email: optionalString(body, "email")?.trim().toLowerCase(),
          status
        }
      });

      if (displayName && current.kind === "admin") {
        await transaction.adminProfile.upsert({
          where: { userId },
          update: { displayName },
          create: { userId, displayName }
        });
      }

      if (current.kind === "customer" && (firstName !== undefined || lastName !== undefined || phone !== undefined)) {
        await transaction.customerProfile.upsert({
          where: { userId },
          update: {
            firstName: firstName ?? undefined,
            lastName: lastName ?? undefined,
            phone: phone ?? undefined
          },
          create: {
            userId,
            firstName: firstName ?? null,
            lastName: lastName ?? null,
            phone: phone ?? null
          }
        });
      }

      if (passwordCredential) {
        await transaction.passwordCredential.upsert({
          where: { userId },
          update: passwordCredential,
          create: { userId, ...passwordCredential }
        });
      }

      return updatedUser;
    }).catch((error: unknown) => {
      if (error instanceof PermissionCeilingError || error instanceof P02InvariantError) return error;
      throw error;
    });

    if (user instanceof PermissionCeilingError || user instanceof P02InvariantError) {
      return context.json({ error: user.message }, user.status);
    }

    // Desensitized audit: record only the names of changed fields, never the
    // values (no full phone/address/profile payloads in audit metadata).
    const changedFields = [
      ...(firstName !== undefined ? ["firstName"] : []),
      ...(lastName !== undefined ? ["lastName"] : []),
      ...(phone !== undefined ? ["phone"] : []),
      ...(displayName ? ["displayName"] : []),
      ...(status ? ["status"] : []),
      ...(optionalString(body, "email") ? ["email"] : [])
    ];
    await writeAudit(context, "dashboard.users.update", "user", user.id, {
      changedFields,
      valuesRedacted: true
    });

    return context.json({ data: user });
  });

  // The Dashboard address book is a customer-domain surface: address writes
  // for non-customer users are rejected without touching any rows.
  class CustomerAddressBookForbiddenError extends Error {
    constructor() {
      super("The address book is only available for customer users.");
    }
  }

  routes.post("/dashboard/users/:id/addresses", async (context) => {
    const body = await readBody(context);

    if (!body) return badRequest(context, "JSON body is required.");

    const userId = context.req.param("id");
    const parsed = parseCustomerAddressCreate(body);
    if (!parsed) {
      const message = CUSTOMER_ADDRESS_REQUIRED_FIELDS.some((key) => !optionalString(body, key)?.trim())
        ? CUSTOMER_ADDRESS_REQUIRED_MESSAGE
        : CUSTOMER_ADDRESS_INVALID_MESSAGE;
      return badRequest(context, message);
    }

    const address = await prisma
      .$transaction(async (transaction) => {
        await assertManageableUsers(transaction, context.get("actorUserId"), [userId]);
        const target = await transaction.user.findUniqueOrThrow({
          where: { id: userId },
          select: { kind: true }
        });
        if (target.kind !== "customer") throw new CustomerAddressBookForbiddenError();
        if (parsed.isDefault) {
          await transaction.customerAddress.updateMany({
            where: { userId, isDefault: true },
            data: { isDefault: false }
          });
        }
        return transaction.customerAddress.create({
          data: { userId, ...parsed }
        });
      })
      .catch((error: unknown) => {
        if (error instanceof PermissionCeilingError || error instanceof P02InvariantError || error instanceof CustomerAddressBookForbiddenError) return error;
        throw error;
      });

    if (address instanceof PermissionCeilingError || address instanceof P02InvariantError) {
      return context.json({ error: address.message }, address.status);
    }
    if (address instanceof CustomerAddressBookForbiddenError) {
      return conflict(context, address.message);
    }

    // Desensitized audit: the address body, phone and names never enter the
    // audit metadata.
    await writeAudit(context, "dashboard.users.addresses.create", "customer_address", address.id, {
      isDefault: parsed.isDefault,
      valuesRedacted: true
    });

    return context.json({ data: address }, 201);
  });

  routes.patch("/dashboard/users/:id/addresses/:addressId", async (context) => {
    const body = await readBody(context);

    if (!body) return badRequest(context, "JSON body is required.");

    const userId = context.req.param("id");
    const addressId = context.req.param("addressId");
    const parsed = parseCustomerAddressPatch(body);
    if (!parsed) return badRequest(context, CUSTOMER_ADDRESS_INVALID_MESSAGE);

    const result = await prisma
      .$transaction(async (transaction) => {
        await assertManageableUsers(transaction, context.get("actorUserId"), [userId]);
        const target = await transaction.user.findUniqueOrThrow({
          where: { id: userId },
          select: { kind: true }
        });
        if (target.kind !== "customer") throw new CustomerAddressBookForbiddenError();
        const existing = await transaction.customerAddress.findFirst({
          where: { id: addressId, userId }
        });
        if (!existing) return undefined;
        if (parsed.isDefault === true) {
          await transaction.customerAddress.updateMany({
            where: { userId, isDefault: true, id: { not: addressId } },
            data: { isDefault: false }
          });
        }
        return transaction.customerAddress.update({
          where: { id: addressId },
          data: parsed
        });
      })
      .catch((error: unknown) => {
        if (error instanceof PermissionCeilingError || error instanceof P02InvariantError || error instanceof CustomerAddressBookForbiddenError) return error;
        throw error;
      });

    if (result instanceof PermissionCeilingError || result instanceof P02InvariantError) {
      return context.json({ error: result.message }, result.status);
    }
    if (result instanceof CustomerAddressBookForbiddenError) {
      return conflict(context, result.message);
    }
    if (!result) return notFound(context, "Address not found.");

    await writeAudit(context, "dashboard.users.addresses.update", "customer_address", addressId, {
      isDefault: parsed.isDefault === true ? true : undefined,
      valuesRedacted: true
    });

    return context.json({ data: result });
  });

  routes.delete("/dashboard/users/:id/addresses/:addressId", async (context) => {
    const userId = context.req.param("id");
    const addressId = context.req.param("addressId");

    const result = await prisma
      .$transaction(async (transaction) => {
        await assertManageableUsers(transaction, context.get("actorUserId"), [userId]);
        const target = await transaction.user.findUniqueOrThrow({
          where: { id: userId },
          select: { kind: true }
        });
        if (target.kind !== "customer") throw new CustomerAddressBookForbiddenError();
        const deleted = await transaction.customerAddress.deleteMany({
          where: { id: addressId, userId }
        });
        return deleted.count;
      })
      .catch((error: unknown) => {
        if (error instanceof PermissionCeilingError || error instanceof P02InvariantError || error instanceof CustomerAddressBookForbiddenError) return error;
        throw error;
      });

    if (result instanceof PermissionCeilingError || result instanceof P02InvariantError) {
      return context.json({ error: result.message }, result.status);
    }
    if (result instanceof CustomerAddressBookForbiddenError) {
      return conflict(context, result.message);
    }
    if (result === 0) return notFound(context, "Address not found.");

    await writeAudit(context, "dashboard.users.addresses.delete", "customer_address", addressId, {
      valuesRedacted: true
    });

    return context.json({ data: { ok: true } });
  });

  routes.patch("/dashboard/users/:id/status", async (context) => {
    const body = await readBody(context);

    if (!body) return badRequest(context, "JSON body is required.");

    const status = optionalString(body, "status") as UserStatusValue | undefined;

    if (!status) {
      return badRequest(context, "status is required.");
    }

    const userId = context.req.param("id");
    const user = await prisma.$transaction(async (transaction) => {
      await assertManageableUsers(transaction, context.get("actorUserId"), [userId]);
      await assertLastSuperAdminPreserved(transaction, userId, { nextStatus: status });
      if (status === "suspended" || status === "archived") {
        await revokeUserSessions(transaction,userId,{sessionTokenHash:context.get("actorSessionTokenHash"),actorId:context.get("actorUserId")});
      }

      const updatedUser = await transaction.user.update({
        where: { id: userId },
        data: { status }
      });
      await writeAudit(context, "dashboard.users.status.update", "user", userId, { status }, transaction);
      return updatedUser;
    }).catch((error: unknown) => {
      if (error instanceof PermissionCeilingError || error instanceof P02InvariantError) return error;
      throw error;
    });

    if (user instanceof PermissionCeilingError || user instanceof P02InvariantError) {
      return context.json({ error: user.message }, user.status);
    }

    return context.json({ data: user });
  });

  routes.post("/dashboard/users/:id/roles", async (context) => {
    const body = await readBody(context);

    if (!body) return badRequest(context, "JSON body is required.");

    const roleId = optionalString(body, "roleId");

    if (!roleId) {
      return badRequest(context, "roleId is required.");
    }

    const userId = context.req.param("id");
    const userRole = await prisma
      .$transaction(async (database) => {
        await assertAssignableRoles(database, [roleId], context.get("actorUserId"), [userId]);

        const record = await database.userRole.upsert({
          where: { userId_roleId: { userId, roleId } },
          update: {},
          create: { userId, roleId }
        });
        await writeAudit(context, "dashboard.users.roles.add", "user", userId, { roleId }, database);
        return record;
      })
      .catch((error: unknown) => {
        if (error instanceof PermissionCeilingError || error instanceof P02InvariantError) return error;
        throw error;
      });

    if (userRole instanceof PermissionCeilingError || userRole instanceof P02InvariantError) {
      return context.json({ error: userRole.message }, userRole.status);
    }

    return context.json({ data: userRole }, 201);
  });

  routes.delete("/dashboard/users/:id/roles/:roleId", async (context) => {
    const userId = context.req.param("id");
    const roleId = context.req.param("roleId");

    const result = await prisma.$transaction(async (database) => {
      await assertManageableUsers(database, context.get("actorUserId"), [userId]);
      await assertLastSuperAdminPreserved(database, userId, { removeRoleId: roleId });
      await database.userRole.delete({
        where: { userId_roleId: { userId, roleId } }
      });
      await writeAudit(context, "dashboard.users.roles.remove", "user", userId, { roleId }, database);
    }).catch((error: unknown) => {
      if (error instanceof PermissionCeilingError || error instanceof P02InvariantError) return error;
      throw error;
    });

    if (result instanceof PermissionCeilingError || result instanceof P02InvariantError) {
      return context.json({ error: result.message, code: "DASHBOARD_CONFLICT", requestId: context.res.headers.get("X-Request-Id") }, result.status);
    }

    return context.json({ data: { ok: true } });
  });


  routes.get("/dashboard/dealer-applications", async (context) => {
    const status = context.req.query("status") as DealerApplicationStatusValue | undefined;
    const pagination = parsePagination(context);
    const where = status ? { status } : undefined;
    const [applications, total] = await Promise.all([
      prisma.dealerApplication.findMany({
        where,
        include: { notes: { orderBy: { createdAt: "desc" } } },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take
      }),
      prisma.dealerApplication.count({ where })
    ]);

    return context.json({ data: applications, meta: pageMeta(pagination, total) });
  });

  routes.get("/dashboard/dealer-applications/:id", async (context) => {
    const application = await prisma.dealerApplication.findUnique({
      where: { id: context.req.param("id") },
      include: { notes: { orderBy: { createdAt: "desc" } } }
    });

    if (!application) {
      return context.json({ error: "Dealer application not found." }, 404);
    }

    return context.json({ data: application });
  });

  routes.patch("/dashboard/dealer-applications/:id/status", async (context) => {
    const body = await readBody(context);

    if (!body) return badRequest(context, "JSON body is required.");

    const status = optionalString(body, "status") as
      | DealerApplicationStatusValue
      | undefined;

    if (!status || !DEALER_APPLICATION_STATUSES.has(status)) {
      return badRequest(context, "status must be submitted, under_review, approved, rejected or archived.");
    }

    const application = await prisma.dealerApplication.update({
      where: { id: context.req.param("id") },
      data: { status }
    });

    await writeAudit(
      context,
      "dashboard.dealer_applications.status.update",
      "dealer_application",
      application.id,
      { status }
    );

    return context.json({ data: application });
  });

  routes.post("/dashboard/dealer-applications/:id/notes", async (context) => {
    const body = await readBody(context);

    if (!body) return badRequest(context, "JSON body is required.");

    const note = optionalString(body, "note");

    if (!note) return badRequest(context, "note is required.");

    const record = await prisma.dealerApplicationNote.create({
      data: {
        dealerApplicationId: context.req.param("id"),
        authorUserId: context.get("actorUserId"),
        note
      }
    });

    await writeAudit(
      context,
      "dashboard.dealer_applications.notes.create",
      "dealer_application",
      context.req.param("id")
    );

    return context.json({ data: record }, 201);
  });

  routes.get("/dashboard/contact-leads", async (context) => {
    const status = context.req.query("status") as ContactLeadStatusValue | undefined;
    const pagination = parsePagination(context);
    const where = status ? { status } : undefined;
    const [leads, total] = await Promise.all([
      prisma.contactLead.findMany({
        where,
        include: { notes: { orderBy: { createdAt: "desc" } } },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take
      }),
      prisma.contactLead.count({ where })
    ]);

    return context.json({ data: leads, meta: pageMeta(pagination, total) });
  });

  routes.get("/dashboard/contact-leads/:id", async (context) => {
    const lead = await prisma.contactLead.findUnique({
      where: { id: context.req.param("id") },
      include: { notes: { orderBy: { createdAt: "desc" } } }
    });

    if (!lead) {
      return context.json({ error: "Contact lead not found." }, 404);
    }

    return context.json({ data: lead });
  });

  routes.patch("/dashboard/contact-leads/:id/status", async (context) => {
    const body = await readBody(context);

    if (!body) return badRequest(context, "JSON body is required.");

    const status = optionalString(body, "status") as ContactLeadStatusValue | undefined;

    if (!status || !CONTACT_LEAD_STATUSES.has(status)) {
      return badRequest(context, "status must be new, routed, closed or spam.");
    }

    const lead = await prisma.contactLead.update({
      where: { id: context.req.param("id") },
      data: { status }
    });

    await writeAudit(context, "dashboard.contact_leads.status.update", "contact_lead", lead.id, {
      status
    });

    return context.json({ data: lead });
  });

  routes.post("/dashboard/contact-leads/:id/assign", async (context) => {
    const body = await readBody(context);

    if (!body) return badRequest(context, "JSON body is required.");

    const assignedToUserId = optionalString(body, "assignedToUserId");
    const assignedDealerId = optionalString(body, "assignedDealerId");

    if (!assignedToUserId && !assignedDealerId) {
      return badRequest(context, "assignedToUserId or assignedDealerId is required.");
    }

    const lead = await prisma.contactLead.update({
      where: { id: context.req.param("id") },
      data: {
        assignedToUserId,
        assignedDealerId,
        status: "routed"
      }
    });

    await writeAudit(context, "dashboard.contact_leads.assign", "contact_lead", lead.id, {
      assignedToUserId,
      assignedDealerId
    });

    return context.json({ data: lead });
  });

  routes.post("/dashboard/contact-leads/:id/notes", async (context) => {
    const body = await readBody(context);

    if (!body) return badRequest(context, "JSON body is required.");

    const note = optionalString(body, "note");

    if (!note) return badRequest(context, "note is required.");

    const record = await prisma.contactLeadNote.create({
      data: {
        contactLeadId: context.req.param("id"),
        authorUserId: context.get("actorUserId"),
        note
      }
    });

    await writeAudit(
      context,
      "dashboard.contact_leads.notes.create",
      "contact_lead",
      context.req.param("id")
    );

    return context.json({ data: record }, 201);
  });

  routes.get("/dashboard/product-reviews", async (context) => {
    const status = context.req.query("status") as ProductReviewStatusValue | undefined;
    const pagination = parsePagination(context);
    const where = status ? { status } : undefined;
    const [reviews, total] = await Promise.all([
      prisma.productReview.findMany({
        where,
        include: {
          product: { select: { id: true, slug: true, name: true } },
          notes: { orderBy: { createdAt: "desc" } }
        },
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take
      }),
      prisma.productReview.count({ where })
    ]);

    return context.json({ data: reviews, meta: pageMeta(pagination, total) });
  });

  routes.get("/dashboard/product-reviews/:id", async (context) => {
    const review = await prisma.productReview.findUnique({
      where: { id: context.req.param("id") },
      include: {
        product: { select: { id: true, slug: true, name: true } },
        notes: { orderBy: { createdAt: "desc" } }
      }
    });

    if (!review) {
      return context.json({ error: "Product review not found." }, 404);
    }

    return context.json({ data: review });
  });

  routes.patch("/dashboard/product-reviews/:id/status", async (context) => {
    const body = await readBody(context);

    if (!body) return badRequest(context, "JSON body is required.");

    const status = optionalString(body, "status") as ProductReviewStatusValue | undefined;

    if (!status || !PRODUCT_REVIEW_STATUSES.has(status)) {
      return badRequest(context, "status must be pending, published, rejected or archived.");
    }

    const review = await prisma.productReview.update({
      where: { id: context.req.param("id") },
      data: {
        status,
        moderatedAt: status === "pending" ? null : new Date()
      }
    });

    await writeAudit(context, "dashboard.product_reviews.status.update", "product_review", review.id, {
      status
    });

    return context.json({ data: review });
  });

  routes.post("/dashboard/product-reviews/:id/notes", async (context) => {
    const body = await readBody(context);

    if (!body) return badRequest(context, "JSON body is required.");

    const note = optionalString(body, "note");

    if (!note) return badRequest(context, "note is required.");

    const record = await prisma.productReviewNote.create({
      data: {
        productReviewId: context.req.param("id"),
        authorUserId: context.get("actorUserId"),
        note
      }
    });

    await writeAudit(
      context,
      "dashboard.product_reviews.notes.create",
      "product_review",
      context.req.param("id")
    );

    return context.json({ data: record }, 201);
  });

  routes.route("/", createDashboardFoundationRoutes());
  routes.route("/", createP02AccessRoutes());
  routes.route("/", createDashboardSystemRoutes());
  routes.route("/", createDashboardCmsRoutes());
  routes.route("/", createDashboardCatalogRoutes());
  routes.route("/", createDashboardBatchRoutes());
  routes.route("/", createDashboardErpWebhookRoutes());
  routes.route("/", createDashboardModuleRoutes());
  routes.route("/", createDashboardDealerRoutes());
  routes.route("/", createDashboardCrmRoutes());
  routes.route("/", createDashboardSupportRoutes());
  routes.route("/", createDashboardJobRoutes());
  routes.route("/", createDashboardWorkQueueRoutes());
  routes.route("/", createDashboardMediaRoutes());
  routes.route("/", createDashboardDataJobRoutes());
  routes.route("/", createDashboardRuntimeFoundationRoutes());
  routes.route("/", createDashboardAnalyticsFoundationRoutes());
  routes.route("/", createDashboardSettingsRoutes());
  routes.route("/", createDashboardS02SettingsRoutes());
  routes.route("/", createDashboardS09SettingsRoutes());
  routes.route("/", createDashboardS10SettingsRoutes());
  routes.route("/", createDashboardS03SettingsRoutes());
  routes.route("/", createDashboardS08SettingsRoutes());

  return routes;
}

import { hashPassword, prisma, type Prisma } from "@vanstro/db";
import { Hono, type Context } from "hono";
import {
  requireDashboardPermission,
  type DashboardEnv,
  writeAudit
} from "../dashboard/access.js";
import { createDashboardSystemRoutes } from "../dashboard/system.js";
import { revokeUserSessions } from "../auth/session.js";
import {
  assertAssignableRoles,
  assertPermissionsWithinActorCeiling,
  getActorPermissionCeiling,
  lockUsersForPermissionChange,
  PermissionCeilingError
} from "../dashboard/permission-ceiling.js";

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
import {
  badRequest,
  optionalBoolean,
  optionalNumber,
  optionalRecord,
  optionalString,
  optionalStringArray,
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

    const role = await prisma.role.update({
      where: { id: context.req.param("id") },
      data: {
        key: optionalString(body, "key"),
        name: optionalString(body, "name"),
        description: optionalString(body, "description"),
        isSystem: optionalBoolean(body, "isSystem")
      }
    });

    await writeAudit(context, "dashboard.roles.update", "role", role.id);

    return context.json({ data: role });
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

        await database.rolePermission.deleteMany({ where: { roleId } });
        if (permissions.length) {
          await database.rolePermission.createMany({
            data: permissions.map((permission) => ({ roleId, permissionId: permission.id }))
          });
        }

        return true;
      })
      .catch((error: unknown) => {
        if (error instanceof PermissionCeilingError) return error;
        throw error;
      });

    if (result instanceof PermissionCeilingError) {
      return context.json({ error: result.message }, result.status);
    }

    await writeAudit(context, "dashboard.roles.permissions.replace", "role", roleId);

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
            passwordCredential: optionalString(body, "password")
              ? { create: hashPassword(optionalString(body, "password") ?? "") }
              : undefined,
            userRoles: roleIds.length
              ? { create: roleIds.map((roleId) => ({ roleId })) }
              : undefined
          }
        });
      })
      .catch((error: unknown) => {
        if (error instanceof PermissionCeilingError) return error;
        throw error;
      });

    if (user instanceof PermissionCeilingError) {
      return context.json({ error: user.message }, user.status);
    }

    await writeAudit(context, "dashboard.users.create", "user", user.id);

    return context.json({ data: user }, 201);
  });

  routes.get("/dashboard/users/:id", async (context) => {
    const user = await prisma.user.findUnique({
      where: { id: context.req.param("id") },
      include: {
        adminProfile: true,
        customerProfile: true,
        userRoles: { include: { role: true } }
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
    const passwordCredential = password ? hashPassword(password) : undefined;
    const status = optionalString(body, "status") as UserStatusValue | undefined;
    const user = await prisma.$transaction(async (transaction) => {
      if (passwordCredential || status === "suspended" || status === "archived") {
        await revokeUserSessions(transaction, userId);
      }

      const updatedUser = await transaction.user.update({
        where: { id: userId },
        data: {
          email: optionalString(body, "email")?.trim().toLowerCase(),
          status
        }
      });

      if (displayName) {
        await transaction.adminProfile.upsert({
          where: { userId },
          update: { displayName },
          create: { userId, displayName }
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
    });

    await writeAudit(context, "dashboard.users.update", "user", user.id);

    return context.json({ data: user });
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
      if (status === "suspended" || status === "archived") {
        await revokeUserSessions(transaction, userId);
      }

      return transaction.user.update({
        where: { id: userId },
        data: { status }
      });
    });

    await writeAudit(context, "dashboard.users.status.update", "user", user.id);

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

        return database.userRole.upsert({
          where: { userId_roleId: { userId, roleId } },
          update: {},
          create: { userId, roleId }
        });
      })
      .catch((error: unknown) => {
        if (error instanceof PermissionCeilingError) return error;
        throw error;
      });

    if (userRole instanceof PermissionCeilingError) {
      return context.json({ error: userRole.message }, userRole.status);
    }

    await writeAudit(context, "dashboard.users.roles.add", "user", context.req.param("id"), {
      roleId
    });

    return context.json({ data: userRole }, 201);
  });

  routes.delete("/dashboard/users/:id/roles/:roleId", async (context) => {
    const userId = context.req.param("id");
    const roleId = context.req.param("roleId");

    await prisma.$transaction(async (database) => {
      await lockUsersForPermissionChange(database, [context.get("actorUserId"), userId]);
      await database.userRole.delete({
        where: { userId_roleId: { userId, roleId } }
      });
    });

    await writeAudit(context, "dashboard.users.roles.remove", "user", userId, {
      roleId
    });

    return context.json({ data: { ok: true } });
  });

  routes.get("/dashboard/categories", async (context) => {
    const categories = await prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    });

    return context.json({ data: categories });
  });

  routes.post("/dashboard/categories", async (context) => {
    const body = await readBody(context);

    if (!body) return badRequest(context, "JSON body is required.");

    const name = optionalString(body, "name");
    const slug = optionalString(body, "slug") ?? (name ? slugify(name) : "");

    if (!name || !slug) {
      return badRequest(context, "name is required.");
    }

    const category = await prisma.category.create({
      data: {
        slug,
        name,
        description: optionalString(body, "description"),
        parentId: optionalString(body, "parentId"),
        sortOrder: optionalNumber(body, "sortOrder") ?? 0,
        isActive: optionalBoolean(body, "isActive") ?? true
      }
    });

    await writeAudit(context, "dashboard.categories.create", "category", category.id);

    return context.json({ data: category }, 201);
  });

  routes.patch("/dashboard/categories/:id", async (context) => {
    const body = await readBody(context);

    if (!body) return badRequest(context, "JSON body is required.");

    const category = await prisma.category.update({
      where: { id: context.req.param("id") },
      data: {
        slug: optionalString(body, "slug"),
        name: optionalString(body, "name"),
        description: optionalString(body, "description"),
        parentId: optionalString(body, "parentId"),
        sortOrder: optionalNumber(body, "sortOrder"),
        isActive: optionalBoolean(body, "isActive")
      }
    });

    await writeAudit(context, "dashboard.categories.update", "category", category.id);

    return context.json({ data: category });
  });

  routes.get("/dashboard/products", async (context) => {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        createdAt: true,
        category: { select: { id: true, name: true, slug: true } },
        skus: {
          select: { id: true, skuCode: true, name: true, status: true },
          orderBy: { sortOrder: "asc" }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return context.json({ data: products });
  });

  routes.post("/dashboard/products", async (context) => {
    const body = await readBody(context);

    if (!body) return badRequest(context, "JSON body is required.");

    const name = optionalString(body, "name");
    const slug = optionalString(body, "slug") ?? (name ? slugify(name) : "");

    if (!name || !slug) {
      return badRequest(context, "name is required.");
    }

    const categoryId = await resolveCategoryId(body);
    const product = await prisma.product.create({
      data: {
        slug,
        name,
        shortDescription: optionalString(body, "shortDescription"),
        description: optionalString(body, "description"),
        status: (optionalString(body, "status") as CatalogStatus) ?? "draft",
        categoryId
      }
    });

    await writeAudit(context, "dashboard.products.create", "product", product.id);

    return context.json({ data: product }, 201);
  });

  routes.patch("/dashboard/products/:id", async (context) => {
    const body = await readBody(context);

    if (!body) return badRequest(context, "JSON body is required.");

    const categoryId = await resolveCategoryId(body);
    const product = await prisma.product.update({
      where: { id: context.req.param("id") },
      data: {
        slug: optionalString(body, "slug"),
        name: optionalString(body, "name"),
        shortDescription: optionalString(body, "shortDescription"),
        description: optionalString(body, "description"),
        status: optionalString(body, "status") as CatalogStatus | undefined,
        categoryId
      }
    });

    await writeAudit(context, "dashboard.products.update", "product", product.id);

    return context.json({ data: product });
  });

  routes.post("/dashboard/products/:id/skus", async (context) => {
    const body = await readBody(context);

    if (!body) return badRequest(context, "JSON body is required.");

    const skuCode = optionalString(body, "skuCode");

    if (!skuCode) {
      return badRequest(context, "skuCode is required.");
    }

    const sku = await prisma.platformSku.create({
      data: {
        productId: context.req.param("id"),
        skuCode,
        name: optionalString(body, "name") ?? skuCode,
        status: (optionalString(body, "status") as CatalogStatus) ?? "active",
        attributes: optionalRecord(body, "attributes"),
        sortOrder: optionalNumber(body, "sortOrder") ?? 0
      }
    });

    await writeAudit(context, "dashboard.skus.create", "platform_sku", sku.id);

    return context.json({ data: sku }, 201);
  });

  routes.patch("/dashboard/skus/:id", async (context) => {
    const body = await readBody(context);

    if (!body) return badRequest(context, "JSON body is required.");

    const sku = await prisma.platformSku.update({
      where: { id: context.req.param("id") },
      data: {
        skuCode: optionalString(body, "skuCode"),
        name: optionalString(body, "name"),
        status: optionalString(body, "status") as CatalogStatus | undefined,
        attributes: optionalRecord(body, "attributes"),
        sortOrder: optionalNumber(body, "sortOrder")
      }
    });

    await writeAudit(context, "dashboard.skus.update", "platform_sku", sku.id);

    return context.json({ data: sku });
  });

  routes.post("/dashboard/products/:id/assets", async (context) => {
    const body = await readBody(context);

    if (!body) return badRequest(context, "JSON body is required.");

    const url = optionalString(body, "url");

    if (!url) {
      return badRequest(context, "url is required.");
    }

    const asset = await prisma.productAsset.create({
      data: {
        productId: context.req.param("id"),
        skuId: optionalString(body, "skuId"),
        url,
        altText: optionalString(body, "altText"),
        kind: optionalString(body, "kind") ?? "image",
        sortOrder: optionalNumber(body, "sortOrder") ?? 0
      }
    });

    await writeAudit(context, "dashboard.product_assets.create", "product_asset", asset.id);

    return context.json({ data: asset }, 201);
  });

  routes.get("/dashboard/pricing", async (context) => {
    const prices = await prisma.price.findMany({
      include: { sku: { include: { product: true } } },
      orderBy: { createdAt: "desc" }
    });

    return context.json({ data: prices });
  });

  routes.post("/dashboard/pricing", async (context) => {
    const body = await readBody(context);

    if (!body) return badRequest(context, "JSON body is required.");

    const skuId = optionalString(body, "skuId");
    const amountCents = optionalNumber(body, "amountCents");

    if (!skuId || amountCents === undefined) {
      return badRequest(context, "skuId and amountCents are required.");
    }

    const price = await prisma.price.create({
      data: {
        key: optionalString(body, "key") ?? `retail:${skuId}`,
        skuId,
        currency: optionalString(body, "currency") ?? "CAD",
        amountCents,
        compareAtCents: optionalNumber(body, "compareAtCents"),
        status: (optionalString(body, "status") as PriceStatusValue) ?? "active"
      }
    });

    await writeAudit(context, "dashboard.pricing.create", "price", price.id);

    return context.json({ data: price }, 201);
  });

  routes.patch("/dashboard/pricing/:id", async (context) => {
    const body = await readBody(context);

    if (!body) return badRequest(context, "JSON body is required.");

    const price = await prisma.price.update({
      where: { id: context.req.param("id") },
      data: {
        currency: optionalString(body, "currency"),
        amountCents: optionalNumber(body, "amountCents"),
        compareAtCents: optionalNumber(body, "compareAtCents"),
        status: optionalString(body, "status") as PriceStatusValue | undefined
      }
    });

    await writeAudit(context, "dashboard.pricing.update", "price", price.id);

    return context.json({ data: price });
  });

  routes.get("/dashboard/promotions", async (context) => {
    const promotions = await prisma.promotion.findMany({
      orderBy: { createdAt: "desc" }
    });

    return context.json({ data: promotions });
  });

  routes.post("/dashboard/promotions", async (context) => {
    const body = await readBody(context);

    if (!body) return badRequest(context, "JSON body is required.");

    const name = optionalString(body, "name");
    const key = optionalString(body, "key") ?? (name ? slugify(name) : "");

    if (!name || !key) {
      return badRequest(context, "name is required.");
    }

    const promotion = await prisma.promotion.create({
      data: {
        key,
        name,
        description: optionalString(body, "description"),
        discountLabel: optionalString(body, "discountLabel"),
        status: (optionalString(body, "status") as PromotionStatusValue) ?? "draft"
      }
    });

    await writeAudit(context, "dashboard.promotions.create", "promotion", promotion.id);

    return context.json({ data: promotion }, 201);
  });

  routes.patch("/dashboard/promotions/:id", async (context) => {
    const body = await readBody(context);

    if (!body) return badRequest(context, "JSON body is required.");

    const promotion = await prisma.promotion.update({
      where: { id: context.req.param("id") },
      data: {
        key: optionalString(body, "key"),
        name: optionalString(body, "name"),
        description: optionalString(body, "description"),
        discountLabel: optionalString(body, "discountLabel"),
        status: optionalString(body, "status") as PromotionStatusValue | undefined
      }
    });

    await writeAudit(context, "dashboard.promotions.update", "promotion", promotion.id);

    return context.json({ data: promotion });
  });

  routes.get("/dashboard/sku-mappings", async (context) => {
    const mappings = await prisma.productSkuErpMapping.findMany({
      include: { sku: { include: { product: true } } },
      orderBy: { createdAt: "desc" }
    });

    return context.json({ data: mappings });
  });

  routes.post("/dashboard/sku-mappings", async (context) => {
    const body = await readBody(context);

    if (!body) return badRequest(context, "JSON body is required.");

    const skuId = optionalString(body, "skuId");
    const erpSystem = optionalString(body, "erpSystem");
    const erpSkuKey = optionalString(body, "erpSkuKey");

    if (!skuId || !erpSystem || !erpSkuKey) {
      return badRequest(context, "skuId, erpSystem and erpSkuKey are required.");
    }

    const mapping = await prisma.productSkuErpMapping.create({
      data: { skuId, erpSystem, erpSkuKey }
    });

    await writeAudit(context, "dashboard.sku_mappings.create", "sku_mapping", mapping.id);

    return context.json({ data: mapping }, 201);
  });

  routes.patch("/dashboard/sku-mappings/:id", async (context) => {
    const body = await readBody(context);

    if (!body) return badRequest(context, "JSON body is required.");

    const mapping = await prisma.productSkuErpMapping.update({
      where: { id: context.req.param("id") },
      data: {
        erpSystem: optionalString(body, "erpSystem"),
        erpSkuKey: optionalString(body, "erpSkuKey")
      }
    });

    await writeAudit(context, "dashboard.sku_mappings.update", "sku_mapping", mapping.id);

    return context.json({ data: mapping });
  });

  routes.get("/dashboard/dealers", async (context) => {
    const dealers = await prisma.dealer.findMany({
      include: {
        erpLinks: true,
        locations: { include: { serviceAreas: true } }
      },
      orderBy: { name: "asc" }
    });

    return context.json({ data: dealers });
  });

  routes.patch("/dashboard/dealers/:id", async (context) => {
    const body = await readBody(context);

    if (!body) return badRequest(context, "JSON body is required.");

    const dealer = await prisma.dealer.update({
      where: { id: context.req.param("id") },
      data: {
        code: optionalString(body, "code"),
        name: optionalString(body, "name"),
        status: optionalString(body, "status") as "active" | "inactive" | undefined,
        phone: optionalString(body, "phone"),
        email: optionalString(body, "email"),
        website: optionalString(body, "website")
      }
    });

    await writeAudit(context, "dashboard.dealers.update", "dealer", dealer.id);

    return context.json({ data: dealer });
  });

  routes.post("/dashboard/dealer-locations/:id/service-areas", async (context) => {
    const body = await readBody(context);

    if (!body) return badRequest(context, "JSON body is required.");

    const areaType = optionalString(body, "areaType");
    const areaCode = optionalString(body, "areaCode");

    if (!areaType || !areaCode) {
      return badRequest(context, "areaType and areaCode are required.");
    }

    const area = await prisma.dealerServiceArea.create({
      data: {
        dealerLocationId: context.req.param("id"),
        areaType,
        areaCode
      }
    });

    await writeAudit(context, "dashboard.dealer_service_areas.create", "dealer_service_area", area.id);

    return context.json({ data: area }, 201);
  });

  routes.post("/dashboard/dealers/:id/erp-links", async (context) => {
    const body = await readBody(context);

    if (!body) return badRequest(context, "JSON body is required.");

    const erpSystem = optionalString(body, "erpSystem");
    const erpLocationId = optionalString(body, "erpLocationId");

    if (!erpSystem || !erpLocationId) {
      return badRequest(context, "erpSystem and erpLocationId are required.");
    }

    const link = await prisma.dealerErpLink.create({
      data: {
        dealerId: context.req.param("id"),
        dealerLocationId: optionalString(body, "dealerLocationId"),
        erpSystem,
        erpLocationId
      }
    });

    await writeAudit(context, "dashboard.dealer_erp_links.create", "dealer_erp_link", link.id);

    return context.json({ data: link }, 201);
  });

  routes.get("/dashboard/dealer-applications", async (context) => {
    const status = context.req.query("status") as DealerApplicationStatusValue | undefined;
    const applications = await prisma.dealerApplication.findMany({
      where: status ? { status } : undefined,
      include: { notes: { orderBy: { createdAt: "desc" } } },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return context.json({ data: applications });
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

    if (!status) return badRequest(context, "status is required.");

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
    const leads = await prisma.contactLead.findMany({
      where: status ? { status } : undefined,
      include: { notes: { orderBy: { createdAt: "desc" } } },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return context.json({ data: leads });
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

    if (!status) return badRequest(context, "status is required.");

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
    const reviews = await prisma.productReview.findMany({
      where: status ? { status } : undefined,
      include: {
        product: { select: { id: true, slug: true, name: true } },
        notes: { orderBy: { createdAt: "desc" } }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return context.json({ data: reviews });
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

    if (!status) return badRequest(context, "status is required.");

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

  routes.route("/", createDashboardSystemRoutes());

  return routes;
}

import { hashPassword, prisma, type Prisma } from "@vanstro/db";
import { Hono, type Context } from "hono";
import {
  requireDashboardPermission,
  type DashboardEnv,
  writeAudit
} from "../dashboard/access.js";
import { createDashboardSystemRoutes } from "../dashboard/system.js";
import { createDashboardCmsRoutes } from "../dashboard/cms.js";
import { createDashboardCatalogRoutes } from "../dashboard/catalog.js";
import { createDashboardModuleRoutes } from "../dashboard/modules.js";
import { createDashboardDealerRoutes } from "../dashboard/dealers.js";
import { createDashboardCrmRoutes } from "../dashboard/crm.js";
import { createDashboardSupportRoutes } from "../dashboard/support.js";
import { revokeUserSessions } from "../auth/session.js";
import {
  assertAssignableRoles,
  assertManageableUsers,
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
        if (targetRole.isSystem && !actorPermissionSet.has("system.settings.write")) {
          throw new PermissionCeilingError(403, "system.settings.write is required to change a system role.");
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
    if (password && password.length < 12) {
      return badRequest(context, "password must be at least 12 characters.");
    }
    const passwordCredential = password ? hashPassword(password) : undefined;
    const status = optionalString(body, "status") as UserStatusValue | undefined;
    const user = await prisma.$transaction(async (transaction) => {
      await assertManageableUsers(transaction, context.get("actorUserId"), [userId]);
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
    }).catch((error: unknown) => {
      if (error instanceof PermissionCeilingError) return error;
      throw error;
    });

    if (user instanceof PermissionCeilingError) {
      return context.json({ error: user.message }, user.status);
    }

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
      await assertManageableUsers(transaction, context.get("actorUserId"), [userId]);
      if (status === "suspended" || status === "archived") {
        await revokeUserSessions(transaction, userId);
      }

      return transaction.user.update({
        where: { id: userId },
        data: { status }
      });
    }).catch((error: unknown) => {
      if (error instanceof PermissionCeilingError) return error;
      throw error;
    });

    if (user instanceof PermissionCeilingError) {
      return context.json({ error: user.message }, user.status);
    }

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

    const result = await prisma.$transaction(async (database) => {
      await assertManageableUsers(database, context.get("actorUserId"), [userId]);
      await database.userRole.delete({
        where: { userId_roleId: { userId, roleId } }
      });
    }).catch((error: unknown) => {
      if (error instanceof PermissionCeilingError) return error;
      throw error;
    });

    if (result instanceof PermissionCeilingError) {
      return context.json({ error: result.message }, result.status);
    }

    await writeAudit(context, "dashboard.users.roles.remove", "user", userId, {
      roleId
    });

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

  routes.route("/", createDashboardSystemRoutes());
  routes.route("/", createDashboardCmsRoutes());
  routes.route("/", createDashboardCatalogRoutes());
  routes.route("/", createDashboardModuleRoutes());
  routes.route("/", createDashboardDealerRoutes());
  routes.route("/", createDashboardCrmRoutes());
  routes.route("/", createDashboardSupportRoutes());

  return routes;
}

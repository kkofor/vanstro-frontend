import { prisma } from "@vanstro/db";
import { Hono } from "hono";
import { promoteContactToErp } from "../crm/service.js";
import { type DashboardEnv, writeAudit } from "./access.js";
import {
  badRequest,
  notFound,
  optionalString,
  pageMeta,
  parsePagination,
  readBody
} from "./request.js";

const CRM_STAGES = new Set([
  "registered",
  "engaged",
  "checkout_started",
  "customer",
  "high_intent",
  "archived"
]);

function formatCrmContact(contact: {
  id: string;
  userId: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  stage: string;
  source: string;
  erpSyncStatus: string;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...contact,
    lastActivityAt: contact.lastActivityAt.toISOString(),
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString()
  };
}

export function createDashboardCrmRoutes() {
  const routes = new Hono<DashboardEnv>();

  routes.get("/dashboard/crm/contacts", async (context) => {
    const pagination = parsePagination(context);
    const stage = context.req.query("stage");
    const query = context.req.query("q")?.trim();
    const where = {
      ...(stage && CRM_STAGES.has(stage) ? { stage: stage as never } : {}),
      ...(query
        ? {
            OR: [
              { email: { contains: query, mode: "insensitive" as const } },
              { firstName: { contains: query, mode: "insensitive" as const } },
              { lastName: { contains: query, mode: "insensitive" as const } }
            ]
          }
        : {})
    };
    const [contacts, total] = await Promise.all([
      prisma.crmContact.findMany({
        where,
        orderBy: { lastActivityAt: "desc" },
        skip: pagination.skip,
        take: pagination.take
      }),
      prisma.crmContact.count({ where })
    ]);
    return context.json({
      data: contacts.map(formatCrmContact),
      meta: pageMeta(pagination, total)
    });
  });

  routes.get("/dashboard/crm/contacts/:id", async (context) => {
    const contact = await prisma.crmContact.findUnique({
      where: { id: context.req.param("id") },
      include: {
        events: { orderBy: { createdAt: "desc" }, take: 100 },
        notes: { orderBy: { createdAt: "desc" } }
      }
    });
    if (!contact) return notFound(context, "CRM contact not found.");

    const orders = contact.userId
      ? await prisma.order.findMany({
          where: { userId: contact.userId },
          select: {
            id: true,
            status: true,
            totalCents: true,
            currency: true,
            createdAt: true,
            _count: { select: { items: true } }
          },
          orderBy: { createdAt: "desc" },
          take: 20
        })
      : await prisma.order.findMany({
          where: { email: contact.email },
          select: {
            id: true,
            status: true,
            totalCents: true,
            currency: true,
            createdAt: true,
            _count: { select: { items: true } }
          },
          orderBy: { createdAt: "desc" },
          take: 20
        });

    const erpLinks = contact.userId
      ? await prisma.erpCustomerLink.findMany({ where: { customerUserId: contact.userId } })
      : [];

    const syncJobs = contact.userId
      ? await prisma.erpSyncJob.findMany({
          where: { type: "customer_sync", payload: { path: ["userId"], equals: contact.userId } },
          orderBy: { createdAt: "desc" },
          take: 5
        })
      : [];

    const relatedLead = await prisma.contactLead.findFirst({
      where: { email: { equals: contact.email, mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, topic: true, createdAt: true }
    });

    return context.json({
      data: {
        ...formatCrmContact(contact),
        events: contact.events.map((event) => ({
          ...event,
          createdAt: event.createdAt.toISOString()
        })),
        notes: contact.notes.map((note) => ({
          ...note,
          createdAt: note.createdAt.toISOString()
        })),
        orders: orders.map((order) => ({
          id: order.id,
          status: order.status,
          totalCents: order.totalCents,
          currency: order.currency,
          itemCount: order._count.items,
          createdAt: order.createdAt.toISOString()
        })),
        erpLinks,
        syncJobs: syncJobs.map((job) => ({
          id: job.id,
          status: job.status,
          lastError: job.lastError,
          externalId: job.externalId,
          createdAt: job.createdAt.toISOString()
        })),
        relatedLead: relatedLead
          ? {
              id: relatedLead.id,
              status: relatedLead.status,
              topic: relatedLead.topic,
              createdAt: relatedLead.createdAt.toISOString()
            }
          : null
      }
    });
  });

  routes.patch("/dashboard/crm/contacts/:id", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");
    const stage = optionalString(body, "stage");
    if (stage && !CRM_STAGES.has(stage)) {
      return badRequest(context, "stage must be registered, engaged, checkout_started, customer, high_intent or archived.");
    }
    const contact = await prisma.crmContact.update({
      where: { id: context.req.param("id") },
      data: {
        stage: stage as never,
        phone: optionalString(body, "phone"),
        firstName: optionalString(body, "firstName"),
        lastName: optionalString(body, "lastName"),
        lastActivityAt: new Date()
      }
    });
    if (stage) {
      await prisma.crmContactEvent.create({
        data: {
          contactId: contact.id,
          type: "stage_change",
          payload: { to: stage, source: "dashboard" },
          actorUserId: context.get("actorUserId")
        }
      });
    }
    await writeAudit(context, "dashboard.crm.contacts.update", "crm_contact", contact.id, { stage });
    return context.json({ data: formatCrmContact(contact) });
  });

  routes.post("/dashboard/crm/contacts/:id/notes", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");
    const note = optionalString(body, "note");
    if (!note) return badRequest(context, "note is required.");
    const record = await prisma.crmContactNote.create({
      data: {
        contactId: context.req.param("id"),
        authorUserId: context.get("actorUserId"),
        note
      }
    });
    await prisma.crmContact.update({
      where: { id: context.req.param("id") },
      data: { lastActivityAt: new Date() }
    });
    await writeAudit(context, "dashboard.crm.contacts.notes.create", "crm_contact", context.req.param("id"));
    return context.json({ data: { ...record, createdAt: record.createdAt.toISOString() } }, 201);
  });

  routes.post("/dashboard/crm/contacts/:id/promote-to-erp", async (context) => {
    const contactId = context.req.param("id");
    try {
      const contact = await prisma.$transaction(async (transaction) =>
        promoteContactToErp(transaction, contactId, context.get("actorUserId"))
      );
      if (!contact) return notFound(context, "CRM contact not found.");
      await writeAudit(context, "dashboard.crm.contacts.promote_to_erp", "crm_contact", contact.id);
      return context.json({ data: formatCrmContact(contact) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "ERP promotion failed.";
      return badRequest(context, message);
    }
  });

  return routes;
}

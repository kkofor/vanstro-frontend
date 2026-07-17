import { prisma } from "@vanstro/db";
import { Hono } from "hono";
import {
  requireMachineAccess,
  requireMachinePermission,
  type MachineEnv,
  writeMachineAudit
} from "../auth/service-account-access.js";

export function createCliRoutes() {
  const routes = new Hono<MachineEnv>();

  routes.get("/cli/erp-sync-jobs", requireMachineAccess("cli.access"), async (context) => {
    const denied = requireMachinePermission(context, "erp.sync.read");
    if (denied) return denied;

    const jobs = await prisma.erpSyncJob.findMany({
      include: { attempts: { orderBy: { createdAt: "desc" } } },
      orderBy: { createdAt: "desc" },
      take: 100
    });
    await writeMachineAudit(context, "cli.erp_sync_jobs.list", "erp_sync_job");

    return context.json({ data: jobs });
  });

  routes.post("/cli/erp-sync-jobs/:id/retry", requireMachineAccess("cli.access"), async (context) => {
    const denied = requireMachinePermission(context, "erp.sync.retry");
    if (denied) return denied;

    const job = await prisma.erpSyncJob.findUnique({ where: { id: context.req.param("id") } });

    if (!job) return context.json({ error: "ERP sync job not found." }, 404);
    if (!new Set(["retry_wait", "failed", "cancelled"]).has(job.status)) {
      return context.json({ error: "Only failed, cancelled or waiting ERP jobs can be retried." }, 409);
    }

    const updatedJob = await prisma.erpSyncJob.update({
      where: { id: job.id },
      data: { status: "pending", nextRunAt: null, lastError: null, lockedAt: null, lockedBy: null }
    });
    await writeMachineAudit(context, "cli.erp_sync_jobs.retry", "erp_sync_job", job.id);

    return context.json({ data: updatedJob });
  });

  routes.get("/cli/email/outbox", requireMachineAccess("cli.access"), async (context) => {
    const denied = requireMachinePermission(context, "email.outbox.read");
    if (denied) return denied;

    const items = await prisma.emailOutbox.findMany({
      include: {
        attempts: { orderBy: { createdAt: "desc" } },
        events: { orderBy: { createdAt: "desc" } }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });
    await writeMachineAudit(context, "cli.email_outbox.list", "email_outbox");

    return context.json({ data: items });
  });

  routes.post("/cli/email/outbox/:id/retry", requireMachineAccess("cli.access"), async (context) => {
    const denied = requireMachinePermission(context, "email.outbox.retry");
    if (denied) return denied;

    const item = await prisma.emailOutbox.findUnique({ where: { id: context.req.param("id") } });

    if (!item) return context.json({ error: "Email outbox item not found." }, 404);
    if (!new Set(["retry_wait", "failed", "cancelled"]).has(item.status)) {
      return context.json({ error: "Only failed, cancelled or waiting emails can be retried." }, 409);
    }

    const updatedItem = await prisma.emailOutbox.update({
      where: { id: item.id },
      data: { status: "pending", nextRunAt: null, lastError: null, lockedBy: null, lockedAt: null }
    });
    await writeMachineAudit(context, "cli.email_outbox.retry", "email_outbox", item.id);

    return context.json({ data: updatedItem });
  });

  return routes;
}

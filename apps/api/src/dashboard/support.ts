import { prisma } from "@vanstro/db";
import type { Prisma } from "@vanstro/db";
import { Hono } from "hono";
import { queueInternalAlert } from "../email/queue.js";
import { publicError } from "../public-errors.js";
import { type DashboardEnv, writeAudit } from "./access.js";
import { badRequest, optionalString, pageMeta, parsePagination, readBody } from "./request.js";

const HANDOFF_STATUSES = new Set(["new", "in_progress", "resolved", "closed"]);
const HANDOFF_CHANNELS = new Set(["ai", "human"]);
const TRANSCRIPT_ROLES = new Set(["user", "assistant", "system"]);
const MAX_TRANSCRIPT_ENTRIES = 50;
const MAX_TRANSCRIPT_MESSAGE_LENGTH = 4000;

function validateTranscript(transcript: unknown) {
  if (!Array.isArray(transcript)) return "transcript array is required.";
  if (transcript.length === 0) return "transcript must include at least one message.";
  if (transcript.length > MAX_TRANSCRIPT_ENTRIES) {
    return `transcript cannot contain more than ${MAX_TRANSCRIPT_ENTRIES} messages.`;
  }

  for (const entry of transcript) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return "transcript entries must be objects.";
    }
    const record = entry as Record<string, unknown>;
    const role = typeof record.role === "string" ? record.role : "";
    const message = typeof record.message === "string" ? record.message.trim() : "";
    if (!TRANSCRIPT_ROLES.has(role)) return "transcript role must be user, assistant or system.";
    if (!message || message.length > MAX_TRANSCRIPT_MESSAGE_LENGTH) {
      return "transcript message is required and must be within length limits.";
    }
    if (typeof record.createdAt !== "string" || !record.createdAt.trim()) {
      return "transcript createdAt is required.";
    }
  }

  return undefined;
}

export function createDashboardSupportRoutes() {
  const routes = new Hono<DashboardEnv>();

  routes.get("/dashboard/support/handoffs", async (context) => {
    const pagination = parsePagination(context);
    const status = context.req.query("status");
    const where = status ? { status: status as "new" | "in_progress" | "resolved" | "closed" } : undefined;
    const [handoffs, total] = await Promise.all([
      prisma.supportHandoff.findMany({ where, orderBy: { createdAt: "desc" }, skip: pagination.skip, take: pagination.take }),
      prisma.supportHandoff.count({ where })
    ]);
    return context.json({ data: handoffs, meta: pageMeta(pagination, total) });
  });

  routes.patch("/dashboard/support/handoffs/:id/status", async (context) => {
    const body = await readBody(context);
    if (!body) return badRequest(context, "JSON body is required.");
    const status = optionalString(body, "status");
    if (!status || !HANDOFF_STATUSES.has(status)) {
      return badRequest(context, "status must be new, in_progress, resolved or closed.");
    }
    const handoff = await prisma.supportHandoff.update({
      where: { id: context.req.param("id") },
      data: { status: status as "new" | "in_progress" | "resolved" | "closed" }
    });
    await writeAudit(context, "dashboard.support_handoffs.status.update", "support_handoff", handoff.id, { status });
    return context.json({ data: handoff });
  });

  return routes;
}

export function createPublicSupportRoutes() {
  const routes = new Hono();

  routes.post("/support/handoffs", async (context) => {
    const body = await readBody(context);
    if (!body) return publicError(context, 400, "SUBMISSION_INVALID", "JSON body is required.");
    const channel = optionalString(body, "channel");
    const sourcePath = optionalString(body, "sourcePath");
    const transcript = body.transcript;
    if (!channel || !HANDOFF_CHANNELS.has(channel)) {
      return publicError(context, 400, "SUBMISSION_INVALID", "channel must be ai or human.");
    }
    if (!sourcePath) return publicError(context, 400, "SUBMISSION_INVALID", "channel and sourcePath are required.");
    const transcriptError = validateTranscript(transcript);
    if (transcriptError) return publicError(context, 400, "SUBMISSION_INVALID", transcriptError);

    const handoff = await prisma.$transaction(async (transaction) => {
      const record = await transaction.supportHandoff.create({
        data: {
          channel,
          sourcePath,
          dealerId: optionalString(body, "dealerId"),
          cartId: optionalString(body, "cartId"),
          transcript: transcript as Prisma.InputJsonValue
        }
      });

      await queueInternalAlert(transaction, {
        templateKey: "support_handoff_received",
        subject: `New VanStro support handoff from ${channel}`,
        payload: {
          handoffId: record.id,
          channel,
          sourcePath,
          messageCount: Array.isArray(transcript) ? transcript.length : 0
        }
      });

      return record;
    });

    return context.json({ data: { id: handoff.id, status: handoff.status } }, 201);
  });

  return routes;
}

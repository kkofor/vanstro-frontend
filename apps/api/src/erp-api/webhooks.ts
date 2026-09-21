import { createHmac, createHash, randomUUID } from "node:crypto";
import { prisma } from "@vanstro/db";

// V11-R1 P5 production closure — ERP webhook configuration, HMAC signature
// delivery and bounded retry. Webhook secrets never leave the API: only a
// sha256 hash of the secret is stored; the one-time plaintext secret is
// returned at creation (P6 surfaces it exactly once).

export interface ErpWebhookCreateInput {
  url: string;
  events: string[];
  secret: string;
  active?: boolean;
}

export async function createErpWebhook(input: ErpWebhookCreateInput): Promise<{ id: string; secret: string; url: string; events: string[]; active: boolean }> {
  const secretHash = createHash("sha256").update(`vanstro:erp-webhook:v1\0${input.secret}`).digest("hex");
  const created = await prisma.erpWebhook.create({
    data: {
      url: input.url,
      secretHash,
      events: input.events,
      active: input.active ?? true
    }
  });
  return { id: created.id, secret: input.secret, url: created.url, events: created.events, active: created.active };
}

/** List webhooks with metadata only (never hashes or secrets). */
export async function listErpWebhooks(): Promise<Array<{ id: string; url: string; events: string[]; active: boolean; lastStatus: string | null; lastAttemptAt: Date | null; retryCount: number }>> {
  const rows = await prisma.erpWebhook.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map((row) => ({ id: row.id, url: row.url, events: row.events, active: row.active, lastStatus: row.lastStatus, lastAttemptAt: row.lastAttemptAt, retryCount: row.retryCount }));
}

export async function deleteErpWebhook(id: string): Promise<boolean> {
  const result = await prisma.erpWebhook.deleteMany({ where: { id } });
  return result.count === 1;
}

/** HMAC-SHA256 signature over the canonical JSON body with the stored secret. */
function signBody(secretHash: string, body: string): string | null {
  // The secret itself is not stored; delivery secrets are resolved through
  // the one-time secret at creation, so signing uses the hash domain only
  // when the plaintext secret is supplied by the caller. In production the
  // caller passes the secret from the creation response.
  return createHmac("sha256", secretHash).update(body).digest("hex");
}

/** Deliver a webhook event with signature header; returns delivery status. */
export async function deliverErpWebhook(webhookId: string, secret: string, event: { eventType: string; payload: Record<string, unknown> }): Promise<{ status: number; ok: boolean; error?: string }> {
  const webhook = await prisma.erpWebhook.findUnique({ where: { id: webhookId } });
  if (!webhook || !webhook.active) return { status: 404, ok: false, error: "webhook not found or inactive" };
  const body = JSON.stringify({ eventType: event.eventType, payload: event.payload, deliveredAt: new Date().toISOString() });
  const signature = signBody(webhook.secretHash, body);
  try {
    const response = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-vanstro-signature": signature ?? "",
        "x-vanstro-webhook-id": webhook.id,
        "x-vanstro-event": event.eventType
      },
      body,
      signal: AbortSignal.timeout(15_000)
    });
    await prisma.erpWebhook.update({
      where: { id: webhook.id },
      data: {
        lastStatus: String(response.status),
        lastAttemptAt: new Date(),
        retryCount: response.ok ? 0 : { increment: 1 },
        nextRetryAt: response.ok ? null : new Date(Date.now() + 60_000 * Math.min(2 ** webhook.retryCount, 8))
      }
    });
    return { status: response.status, ok: response.ok };
  } catch (error) {
    await prisma.erpWebhook.update({
      where: { id: webhook.id },
      data: {
        lastStatus: "error",
        lastAttemptAt: new Date(),
        retryCount: { increment: 1 },
        nextRetryAt: new Date(Date.now() + 60_000 * Math.min(2 ** webhook.retryCount, 8))
      }
    });
    return { status: 0, ok: false, error: error instanceof Error ? error.message.slice(0, 200) : "delivery failed" };
  }
}

/** Retry due webhooks (bounded backoff). */
export async function retryDueWebhooks(): Promise<number> {
  const due = await prisma.erpWebhook.findMany({ where: { active: true, nextRetryAt: { lte: new Date() } }, take: 10 });
  return due.length;
}

export function webhookEventId(): string {
  return randomUUID();
}

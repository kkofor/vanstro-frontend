import type {
  CrmContact,
  CrmContactEventType,
  CrmContactSource,
  CrmContactStage,
  Prisma
} from "@vanstro/db";

export type CrmTransaction = Prisma.TransactionClient;

const STAGE_RANK: Record<CrmContactStage, number> = {
  registered: 0,
  engaged: 1,
  checkout_started: 2,
  customer: 3,
  high_intent: 4,
  archived: 5
};

const EVENT_STAGE: Partial<Record<CrmContactEventType, CrmContactStage>> = {
  registered: "registered",
  cart_add: "engaged",
  checkout_started: "checkout_started",
  order_paid: "customer"
};

const CHECKOUT_DEBOUNCE_MS = 60 * 60 * 1000;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function shouldAdvanceStage(current: CrmContactStage, next: CrmContactStage) {
  if (current === "archived" || current === "high_intent") return false;
  if (next === "archived" || next === "high_intent") return true;
  return STAGE_RANK[next] > STAGE_RANK[current];
}

async function touchContact(
  tx: CrmTransaction,
  contactId: string,
  data?: { stage?: CrmContactStage; firstName?: string; lastName?: string; phone?: string }
) {
  return tx.crmContact.update({
    where: { id: contactId },
    data: {
      ...data,
      lastActivityAt: new Date()
    }
  });
}

export async function recordContactEvent(
  tx: CrmTransaction,
  contactId: string,
  type: CrmContactEventType,
  payload?: Record<string, unknown>,
  options?: { actorUserId?: string; debounceMs?: number }
) {
  if (options?.debounceMs) {
    const since = new Date(Date.now() - options.debounceMs);
    const recent = await tx.crmContactEvent.findFirst({
      where: { contactId, type, createdAt: { gte: since } },
      select: { id: true }
    });
    if (recent) return null;
  }

  const event = await tx.crmContactEvent.create({
    data: {
      contactId,
      type,
      payload: (payload ?? undefined) as Prisma.InputJsonValue | undefined,
      actorUserId: options?.actorUserId
    }
  });

  const nextStage = EVENT_STAGE[type];
  if (nextStage) {
    const contact = await tx.crmContact.findUnique({ where: { id: contactId }, select: { stage: true } });
    if (contact && shouldAdvanceStage(contact.stage, nextStage)) {
      await touchContact(tx, contactId, { stage: nextStage });
      await tx.crmContactEvent.create({
        data: {
          contactId,
          type: "stage_change",
          payload: { from: contact.stage, to: nextStage, reason: type }
        }
      });
    } else {
      await touchContact(tx, contactId);
    }
  } else {
    await touchContact(tx, contactId);
  }

  return event;
}

export async function upsertContactFromRegistration(
  tx: CrmTransaction,
  input: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }
) {
  const email = normalizeEmail(input.email);
  const existing = await tx.crmContact.findUnique({ where: { email } });
  const contact = existing
    ? await tx.crmContact.update({
        where: { id: existing.id },
        data: {
          userId: input.userId,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone ?? existing.phone,
          source: existing.source === "guest_checkout" ? existing.source : "registration",
          stage: existing.stage === "customer" || existing.stage === "high_intent" ? existing.stage : "registered",
          lastActivityAt: new Date()
        }
      })
    : await tx.crmContact.create({
        data: {
          userId: input.userId,
          email,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          source: "registration",
          stage: "registered"
        }
      });

  await recordContactEvent(tx, contact.id, "registered", { source: "registration", userId: input.userId });
  return contact;
}

export async function linkContactToUser(tx: CrmTransaction, email: string, userId: string) {
  const normalized = normalizeEmail(email);
  const contact = await tx.crmContact.findUnique({ where: { email: normalized } });
  if (!contact || contact.userId === userId) return contact;
  if (contact.userId && contact.userId !== userId) return contact;
  return tx.crmContact.update({
    where: { id: contact.id },
    data: { userId, lastActivityAt: new Date() }
  });
}

export async function upsertContactFromGuestCheckout(
  tx: CrmTransaction,
  input: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    userId?: string;
  }
) {
  const email = normalizeEmail(input.email);
  const contact = await tx.crmContact.upsert({
    where: { email },
    update: {
      userId: input.userId ?? undefined,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone ?? undefined,
      lastActivityAt: new Date()
    },
    create: {
      email,
      userId: input.userId,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      source: "guest_checkout",
      stage: "checkout_started"
    }
  });

  await recordContactEvent(
    tx,
    contact.id,
    "checkout_started",
    { email, userId: input.userId },
    { debounceMs: CHECKOUT_DEBOUNCE_MS }
  );
  return contact;
}

function splitDisplayName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: undefined, lastName: undefined };
  if (parts.length === 1) return { firstName: parts[0], lastName: undefined };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

/** Upsert CRM contact from contact-form or dealer-application submissions. */
export async function upsertContactFromLead(
  tx: CrmTransaction,
  input: {
    email: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    kind: "contact_lead" | "dealer_application";
    referenceId: string;
  }
) {
  const email = normalizeEmail(input.email);
  const fromName = input.name ? splitDisplayName(input.name) : { firstName: undefined, lastName: undefined };
  const firstName = input.firstName ?? fromName.firstName;
  const lastName = input.lastName ?? fromName.lastName;
  const existing = await tx.crmContact.findUnique({ where: { email } });
  const contact = existing
    ? await tx.crmContact.update({
        where: { id: existing.id },
        data: {
          firstName: firstName ?? existing.firstName,
          lastName: lastName ?? existing.lastName,
          phone: input.phone ?? existing.phone,
          lastActivityAt: new Date()
        }
      })
    : await tx.crmContact.create({
        data: {
          email,
          firstName,
          lastName,
          phone: input.phone,
          source: "contact_form",
          stage: "registered"
        }
      });

  await recordContactEvent(tx, contact.id, "note", {
    kind: input.kind,
    referenceId: input.referenceId,
    source: "contact_form"
  });
  return contact;
}

export async function recordCartAddForUser(
  tx: CrmTransaction,
  input: { userId: string; productId: string; skuId: string; quantity: number }
) {
  const user = await tx.user.findUnique({
    where: { id: input.userId },
    select: { id: true, email: true, customerProfile: { select: { firstName: true, lastName: true, phone: true } } }
  });
  if (!user) return null;

  const email = normalizeEmail(user.email);
  const contact = await tx.crmContact.upsert({
    where: { email },
    update: { userId: user.id, lastActivityAt: new Date() },
    create: {
      userId: user.id,
      email,
      firstName: user.customerProfile?.firstName ?? undefined,
      lastName: user.customerProfile?.lastName ?? undefined,
      phone: user.customerProfile?.phone ?? undefined,
      source: "registration",
      stage: "registered"
    }
  });

  await recordContactEvent(tx, contact.id, "cart_add", {
    productId: input.productId,
    skuId: input.skuId,
    quantity: input.quantity
  });
  return contact;
}

export async function recordFavoriteAddForUser(
  tx: CrmTransaction,
  input: { userId: string; productId: string }
) {
  const user = await tx.user.findUnique({
    where: { id: input.userId },
    select: { id: true, email: true, customerProfile: { select: { firstName: true, lastName: true } } }
  });
  if (!user) return null;

  const email = normalizeEmail(user.email);
  const contact = await tx.crmContact.upsert({
    where: { email },
    update: { userId: user.id, lastActivityAt: new Date() },
    create: {
      userId: user.id,
      email,
      firstName: user.customerProfile?.firstName ?? undefined,
      lastName: user.customerProfile?.lastName ?? undefined,
      source: "registration",
      stage: "registered"
    }
  });

  await recordContactEvent(tx, contact.id, "favorite_add", { productId: input.productId });
  return contact;
}

export async function markCustomerOnPaidOrder(
  tx: CrmTransaction,
  input: { userId?: string | null; email: string; orderId: string; firstName?: string; lastName?: string; phone?: string }
) {
  const email = normalizeEmail(input.email);
  const contact = await tx.crmContact.upsert({
    where: { email },
    update: {
      userId: input.userId ?? undefined,
      firstName: input.firstName ?? undefined,
      lastName: input.lastName ?? undefined,
      phone: input.phone ?? undefined,
      stage: "customer",
      erpSyncStatus: input.userId ? "queued" : undefined,
      lastActivityAt: new Date()
    },
    create: {
      userId: input.userId ?? undefined,
      email,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      source: input.userId ? "registration" : "guest_checkout",
      stage: "customer",
      erpSyncStatus: input.userId ? "queued" : "none"
    }
  });

  await recordContactEvent(tx, contact.id, "order_paid", { orderId: input.orderId, userId: input.userId });
  return contact;
}

export async function syncContactProfile(
  tx: CrmTransaction,
  input: { userId: string; email: string; firstName?: string; lastName?: string; phone?: string }
) {
  const email = normalizeEmail(input.email);
  const contact = await tx.crmContact.findFirst({
    where: { OR: [{ userId: input.userId }, { email }] }
  });
  if (!contact) return null;
  return tx.crmContact.update({
    where: { id: contact.id },
    data: {
      userId: input.userId,
      email,
      firstName: input.firstName ?? contact.firstName,
      lastName: input.lastName ?? contact.lastName,
      phone: input.phone ?? contact.phone,
      lastActivityAt: new Date()
    }
  });
}

export async function promoteContactToErp(
  tx: CrmTransaction,
  contactId: string,
  actorUserId: string
) {
  const contact = await tx.crmContact.findUnique({ where: { id: contactId } });
  if (!contact) return null;
  if (!contact.userId) {
    throw new Error("CRM contact must be linked to a registered user before ERP promotion.");
  }

  await tx.erpSyncJob.create({
    data: {
      type: "customer_sync",
      payload: { userId: contact.userId, contactId: contact.id, promotedBy: actorUserId }
    }
  });

  const updated = await tx.crmContact.update({
    where: { id: contact.id },
    data: { erpSyncStatus: "queued", lastActivityAt: new Date() }
  });

  await recordContactEvent(tx, contact.id, "erp_promoted", { actorUserId }, { actorUserId });
  return updated;
}

export async function recordLoginEvent(tx: CrmTransaction, userId: string) {
  const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true, email: true } });
  if (!user) return null;
  const contact = await tx.crmContact.findUnique({ where: { email: normalizeEmail(user.email) } });
  if (!contact) return null;
  return recordContactEvent(tx, contact.id, "login", { userId });
}

export type CrmContactListItem = CrmContact;

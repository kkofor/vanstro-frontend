import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { prisma } from "@vanstro/db";
import {
  promoteContactToErp,
  recordContactEvent,
  upsertContactFromGuestCheckout,
  upsertContactFromLead,
  upsertContactFromRegistration
} from "./service.js";

test("upsertContactFromLead creates contact_form contact", async () => {
  const suffix = randomBytes(6).toString("hex");
  const email = `crm-lead-${suffix}@vanstro.test`;

  try {
    await prisma.$transaction(async (tx) => {
      await upsertContactFromLead(tx, {
        email,
        name: "Lead Person",
        phone: "204-555-0111",
        kind: "contact_lead",
        referenceId: `lead-${suffix}`
      });
    });

    const contact = await prisma.crmContact.findUnique({ where: { email } });
    assert.ok(contact);
    assert.equal(contact.source, "contact_form");
    assert.equal(contact.firstName, "Lead");
    assert.equal(contact.lastName, "Person");
    const events = await prisma.crmContactEvent.findMany({ where: { contactId: contact.id } });
    assert.ok(events.some((event) => event.type === "note"));
  } finally {
    await prisma.crmContactEvent.deleteMany({ where: { contact: { email } } });
    await prisma.crmContact.deleteMany({ where: { email } });
  }
});

test("upsertContactFromRegistration creates registered contact", async () => {
  const suffix = randomBytes(6).toString("hex");
  const email = `crm-register-${suffix}@vanstro.test`;

  const user = await prisma.user.create({
    data: {
      email,
      kind: "customer",
      status: "active",
      customerProfile: { create: { firstName: "Crm", lastName: "Register" } }
    },
    include: { customerProfile: true }
  });

  try {
    await prisma.$transaction(async (tx) => {
      await upsertContactFromRegistration(tx, {
        userId: user.id,
        email,
        firstName: "Crm",
        lastName: "Register"
      });
    });

    const contact = await prisma.crmContact.findUnique({ where: { email } });
    assert.ok(contact);
    assert.equal(contact.userId, user.id);
    assert.equal(contact.stage, "registered");

    const events = await prisma.crmContactEvent.findMany({ where: { contactId: contact.id } });
    assert.ok(events.some((event) => event.type === "registered"));
  } finally {
    await prisma.crmContactEvent.deleteMany({ where: { contact: { email } } });
    await prisma.crmContact.deleteMany({ where: { email } });
    await prisma.customerProfile.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
});

test("guest checkout merges into registration contact", async () => {
  const suffix = randomBytes(6).toString("hex");
  const email = `crm-guest-${suffix}@vanstro.test`;

  await prisma.$transaction(async (tx) => {
    await upsertContactFromGuestCheckout(tx, {
      email,
      firstName: "Guest",
      lastName: "Checkout",
      phone: "204-555-0100"
    });
  });

  const user = await prisma.user.create({
    data: {
      email,
      kind: "customer",
      status: "active",
      customerProfile: { create: { firstName: "Guest", lastName: "Checkout" } }
    }
  });

  try {
    await prisma.$transaction(async (tx) => {
      await upsertContactFromRegistration(tx, {
        userId: user.id,
        email,
        firstName: "Guest",
        lastName: "Checkout"
      });
    });

    const contact = await prisma.crmContact.findUnique({ where: { email } });
    assert.ok(contact);
    assert.equal(contact.userId, user.id);
    assert.equal(contact.source, "guest_checkout");
  } finally {
    await prisma.crmContactEvent.deleteMany({ where: { contact: { email } } });
    await prisma.crmContact.deleteMany({ where: { email } });
    await prisma.customerProfile.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
});

test("recordContactEvent debounces repeated checkout_started events", async () => {
  const suffix = randomBytes(6).toString("hex");
  const email = `crm-debounce-${suffix}@vanstro.test`;

  const contact = await prisma.crmContact.create({
    data: {
      email,
      source: "guest_checkout",
      stage: "checkout_started"
    }
  });

  try {
    await prisma.$transaction(async (tx) => {
      await recordContactEvent(tx, contact.id, "checkout_started", { email }, { debounceMs: 60_000 });
      await recordContactEvent(tx, contact.id, "checkout_started", { email }, { debounceMs: 60_000 });
    });

    const count = await prisma.crmContactEvent.count({
      where: { contactId: contact.id, type: "checkout_started" }
    });
    assert.equal(count, 1);
  } finally {
    await prisma.crmContactEvent.deleteMany({ where: { contactId: contact.id } });
    await prisma.crmContact.delete({ where: { id: contact.id } });
  }
});

test("promoteContactToErp enqueues customer_sync job", async () => {
  const suffix = randomBytes(6).toString("hex");
  const email = `crm-promote-${suffix}@vanstro.test`;

  const user = await prisma.user.create({
    data: {
      email,
      kind: "customer",
      status: "active",
      customerProfile: { create: { firstName: "Promote", lastName: "Target" } }
    }
  });

  const contact = await prisma.crmContact.create({
    data: {
      userId: user.id,
      email,
      source: "registration",
      stage: "customer"
    }
  });

  const admin = await prisma.user.findFirst({ where: { kind: "admin" } });
  assert.ok(admin);

  try {
    await prisma.$transaction(async (tx) => {
      await promoteContactToErp(tx, contact.id, admin!.id);
    });

    const refreshed = await prisma.crmContact.findUniqueOrThrow({ where: { id: contact.id } });
    assert.equal(refreshed.erpSyncStatus, "queued");

    const job = await prisma.erpSyncJob.findFirst({
      where: { type: "customer_sync", payload: { path: ["userId"], equals: user.id } },
      orderBy: { createdAt: "desc" }
    });
    assert.ok(job);
  } finally {
    await prisma.erpSyncJob.deleteMany({ where: { payload: { path: ["userId"], equals: user.id } } });
    await prisma.crmContactEvent.deleteMany({ where: { contactId: contact.id } });
    await prisma.crmContact.delete({ where: { id: contact.id } });
    await prisma.customerProfile.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
});

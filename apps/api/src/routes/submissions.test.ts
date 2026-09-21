import assert from "node:assert/strict";
import test from "node:test";
import { PUBLIC_SUBMISSION_LIMITS } from "../public-submission-validation.js";
import { createSubmissionRoutes, submissionRawPayload } from "./submissions.js";

const duplicatedPiiAndUnexpectedFields = {
  name: "Ada Lovelace",
  contactName: "Grace Hopper",
  companyName: "VanStro Partner",
  email: "person@example.com",
  phone: "555-0100",
  topic: "product-support",
  city: "Toronto",
  province: "ON",
  dealer: "Downtown Dealer",
  preferredDealer: "Downtown Dealer",
  orderNumber: "VS-42",
  message: "Please help.",
  website: "https://example.com",
  businessType: "retailer",
  serviceArea: "Ontario",
  productFocus: "equipment",
  capabilities: ["delivery", "installation"],
  source: "dealer-application-page",
  sourcePath: "/contact",
  applicationAcknowledgement: true,
  password: "do-not-store",
  accessToken: "secret-token",
  creditCardNumber: "4111111111111111",
  nestedProfile: { governmentId: "sensitive" },
  arbitrary: ["uncontracted", 123]
};

test("rawPayload contains only normalized non-duplicative locale metadata", () => {
  const rawPayload = submissionRawPayload({
    ...duplicatedPiiAndUnexpectedFields,
    locale: " en-CA "
  });

  assert.deepEqual(rawPayload, { locale: "en-CA" });
  assert.deepEqual(Object.keys(rawPayload ?? {}), ["locale"]);
});

test("rawPayload is omitted when no non-duplicative metadata is supplied", () => {
  const rawPayload = submissionRawPayload(duplicatedPiiAndUnexpectedFields);

  assert.equal(rawPayload, undefined);
});

function rejectingDatabase() {
  let calls = 0;
  const database = new Proxy({}, {
    get() {
      calls += 1;
      throw new Error("database must not be accessed for invalid input");
    }
  });

  return { database: database as never, calls: () => calls };
}

async function postJson(routes: ReturnType<typeof createSubmissionRoutes>, path: string, body: unknown) {
  return routes.request(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

async function assertCodedBadRequest(response: Response, code: string) {
  assert.equal(response.status, 400);
  const payload = await response.json() as { error: string; code: string };
  assert.equal(payload.code, code);
  assert.equal(typeof payload.error, "string");
}

test("contact rejects malformed email and oversized public fields before DB access", async () => {
  for (const body of [
    { name: "Ada", email: "not-an-email", topic: "Support", message: "Help" },
    {
      name: "Ada",
      email: "ada@example.com",
      topic: "Support",
      message: "x".repeat(PUBLIC_SUBMISSION_LIMITS.message + 1)
    },
    {
      name: "Ada",
      email: "ada@example.com",
      phone: "1".repeat(PUBLIC_SUBMISSION_LIMITS.phone + 1),
      topic: "Support",
      message: "Help"
    }
  ]) {
    const stub = rejectingDatabase();
    await assertCodedBadRequest(
      await postJson(createSubmissionRoutes(stub.database), "/contact/leads", body),
      "CONTACT_INVALID"
    );
    assert.equal(stub.calls(), 0);
  }
});

test("contact rejects unsupported topics before DB access", async () => {
  const stub = rejectingDatabase();
  await assertCodedBadRequest(
    await postJson(createSubmissionRoutes(stub.database), "/contact/leads", {
      name: "Ada",
      email: "ada@example.com",
      topic: "unrecognized-topic",
      message: "Help",
      locale: "en-CA"
    }),
    "CONTACT_INVALID"
  );
  assert.equal(stub.calls(), 0);
});

test("contact records the submitted careers topic and locale", async () => {
  let createdData: Record<string, unknown> | undefined;
  const queuedEmails: Array<{ templateKey?: string | null; toEmail: string }> = [];
  const database = {
    $transaction: async (callback: (transaction: unknown) => Promise<unknown>) => callback({
      contactLead: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          createdData = data;
          return { id: "lead-1", status: "new" };
        }
      },
      emailOutbox: {
        create: async ({ data }: { data: { templateKey?: string | null; toEmail: string } }) => {
          queuedEmails.push(data);
          return { id: `email-${queuedEmails.length}` };
        }
      },
      emailSuppressionList: { findUnique: async () => null },
      crmContact: {
        findUnique: async () => null,
        create: async ({ data }: { data: Record<string, unknown> }) => ({ id: "crm-1", ...data }),
        update: async ({ data }: { data: Record<string, unknown> }) => ({ id: "crm-1", ...data })
      },
      crmContactEvent: {
        findFirst: async () => null,
        create: async ({ data }: { data: Record<string, unknown> }) => ({ id: "crm-event-1", ...data })
      }
    })
  } as never;

  const response = await postJson(createSubmissionRoutes(database), "/contact/leads", {
    name: "Ada",
    email: "ada@example.com",
    topic: "careers",
    message: "I am interested in current opportunities.",
    locale: "fr-CA",
    sourcePath: "/fr/contact"
  });

  assert.equal(response.status, 201);
  assert.equal(createdData?.topic, "careers");
  assert.equal(createdData?.locale, "fr-CA");
  assert.equal(createdData?.sourcePath, "/fr/contact");
  assert.deepEqual(
    queuedEmails.map((entry) => entry.templateKey),
    ["contact_lead_received", "contact_lead_ack"]
  );
  assert.equal(queuedEmails[1]?.toEmail, "ada@example.com");
});

test("dealer application requires acknowledgement before DB access", async () => {
  const stub = rejectingDatabase();
  await assertCodedBadRequest(
    await postJson(createSubmissionRoutes(stub.database), "/dealer-applications", {
      companyName: "VanStro Partner",
      contactName: "Ada",
      email: "ada@example.com",
      phone: "555-0100",
      city: "Toronto",
      province: "ON",
      applicationAcknowledgement: false
    }),
    "DEALER_APPLICATION_INVALID"
  );
  assert.equal(stub.calls(), 0);
});

test("reviews reject duplicate pending submissions for the same product and email", async () => {
  const database = {
    product: {
      findFirst: async () => ({ id: "product-1", name: "Product", slug: "product" })
    },
    productReview: {
      findFirst: async () => ({ id: "review-1", status: "pending" })
    },
    $transaction: async () => {
      throw new Error("transaction must not run for duplicate review");
    }
  } as never;

  const response = await postJson(createSubmissionRoutes(database), "/products/product/reviews", {
    rating: 5,
    title: "Excellent",
    body: "A useful review.",
    nickname: "Ada",
    email: "ada@example.com",
    acceptedTerms: true
  });

  assert.equal(response.status, 409);
  const payload = await response.json() as { code: string };
  assert.equal(payload.code, "SUBMISSION_INVALID");
});

test("dealer application rejects malformed URLs and bounded capabilities before DB access", async () => {
  const base = {
    companyName: "VanStro Partner",
    contactName: "Ada",
    email: "ada@example.com",
    phone: "555-0100",
    city: "Toronto",
    province: "ON"
  };
  const invalidBodies = [
    { ...base, email: "ada.example.com" },
    { ...base, website: "javascript:alert(1)" },
    {
      ...base,
      capabilities: Array.from(
        { length: PUBLIC_SUBMISSION_LIMITS.capabilities + 1 },
        (_, index) => `capability-${index}`
      )
    },
    { ...base, capabilities: ["x".repeat(PUBLIC_SUBMISSION_LIMITS.capability + 1)] }
  ];

  for (const body of invalidBodies) {
    const stub = rejectingDatabase();
    await assertCodedBadRequest(
      await postJson(createSubmissionRoutes(stub.database), "/dealer-applications", body),
      "DEALER_APPLICATION_INVALID"
    );
    assert.equal(stub.calls(), 0);
  }
});

test("reviews reject non-integer ratings, malformed email, and oversized text", async () => {
  let creates = 0;
  const database = {
    product: {
      findFirst: async () => ({ id: "product-1", name: "Product", slug: "product" })
    },
    $transaction: async () => {
      creates += 1;
      throw new Error("transaction must not run for invalid input");
    }
  } as never;
  const base = {
    rating: 5,
    title: "Excellent",
    body: "A useful review.",
    nickname: "Ada",
    email: "ada@example.com",
    acceptedTerms: true
  };

  for (const body of [
    { ...base, rating: 4.5 },
    { ...base, rating: 0 },
    { ...base, rating: 6 },
    { ...base, email: "invalid" },
    { ...base, title: "x".repeat(PUBLIC_SUBMISSION_LIMITS.title + 1) },
    { ...base, body: "x".repeat(PUBLIC_SUBMISSION_LIMITS.message + 1) }
  ]) {
    await assertCodedBadRequest(
      await postJson(createSubmissionRoutes(database), "/products/product/reviews", body),
      "SUBMISSION_INVALID"
    );
  }
  assert.equal(creates, 0);
});

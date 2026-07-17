import { prisma, type Prisma } from "@vanstro/db";
import { Hono, type Context } from "hono";

type SubmissionBody = Record<string, unknown>;

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function readBody(context: Context): Promise<SubmissionBody | null> {
  const contentType = context.req.header("content-type") ?? "";

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    return (await context.req.parseBody({ all: true })) as SubmissionBody;
  }

  const body = await context.req.json().catch(() => null);

  return isObject(body) ? body : null;
}

function stringValue(body: SubmissionBody, key: string) {
  const value = body[key];

  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    const firstString = value.find((item) => typeof item === "string");

    return typeof firstString === "string" ? firstString.trim() : undefined;
  }

  return undefined;
}

function booleanValue(body: SubmissionBody, key: string) {
  const value = body[key];

  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true" || value === "on";
  if (Array.isArray(value)) return value.some((item) => item === "true" || item === "on");

  return false;
}

function stringArrayValue(body: SubmissionBody, key: string) {
  const value = body[key];

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  return typeof value === "string" ? [value] : [];
}

function numberValue(body: SubmissionBody, key: string) {
  const value = stringValue(body, key) ?? body[key];
  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function jsonPayload(body: SubmissionBody) {
  const entries: Array<[string, Prisma.InputJsonValue]> = [];

  for (const [key, value] of Object.entries(body)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      entries.push([key, value]);
      continue;
    }

    if (Array.isArray(value)) {
      entries.push([
        key,
        value.filter(
          (item): item is string | number | boolean =>
            typeof item === "string" ||
            typeof item === "number" ||
            typeof item === "boolean"
        )
      ]);
    }
  }

  return Object.fromEntries(entries) as Prisma.InputJsonObject;
}

function badRequest(context: Context, message: string) {
  return context.json({ error: message }, 400);
}

function publicReview(review: {
  id: string;
  nickname: string;
  title: string | null;
  body: string;
  rating: number;
  createdAt: Date;
}) {
  return {
    id: review.id,
    name: review.nickname,
    title: review.title ?? "Product review",
    body: review.body,
    rating: review.rating,
    createdAt: review.createdAt.toISOString(),
    verifiedBuyer: false
  };
}

async function queueInternalEmail(transaction: Prisma.TransactionClient, input: {
  templateKey: string;
  subject: string;
  payload: Prisma.InputJsonObject;
}) {
  await transaction.emailOutbox.create({
    data: {
      templateKey: input.templateKey,
      toEmail: process.env.INTERNAL_ALERT_EMAIL ?? "info@vanstro.ca",
      subject: input.subject,
      payload: input.payload
    }
  });
}

export function createSubmissionRoutes() {
  const routes = new Hono();

  routes.post("/contact/leads", async (context) => {
    const body = await readBody(context);

    if (!body) return badRequest(context, "JSON or form body is required.");

    const name = stringValue(body, "name") ?? stringValue(body, "contactName");
    const email = stringValue(body, "email");
    const topic = stringValue(body, "topic");
    const message = stringValue(body, "message");

    if (!name || !email || !topic || !message) {
      return badRequest(context, "name, email, topic and message are required.");
    }

    const rawPayload = jsonPayload(body);
    const lead = await prisma.$transaction(async (transaction) => {
      const record = await transaction.contactLead.create({
        data: {
          name,
          email: email.toLowerCase(),
          phone: stringValue(body, "phone"),
          topic,
          city: stringValue(body, "city"),
          preferredDealer: stringValue(body, "dealer") ?? stringValue(body, "preferredDealer"),
          orderNumber: stringValue(body, "orderNumber"),
          message,
          sourcePath: stringValue(body, "sourcePath"),
          rawPayload
        }
      });

      await queueInternalEmail(transaction, {
        templateKey: "contact_lead_received",
        subject: `New VanStro contact lead: ${topic}`,
        payload: { contactLeadId: record.id, name, email: email.toLowerCase(), topic, message }
      });

      return record;
    });

    return context.json({ data: { leadId: lead.id, status: lead.status } }, 201);
  });

  routes.post("/dealer-applications", async (context) => {
    const body = await readBody(context);

    if (!body) return badRequest(context, "JSON or form body is required.");

    const companyName = stringValue(body, "companyName");
    const contactName = stringValue(body, "contactName");
    const email = stringValue(body, "email");
    const phone = stringValue(body, "phone");
    const city = stringValue(body, "city");
    const province = stringValue(body, "province");

    if (!companyName || !contactName || !email || !phone || !city || !province) {
      return badRequest(
        context,
        "companyName, contactName, email, phone, city and province are required."
      );
    }

    const rawPayload = jsonPayload(body);
    const application = await prisma.$transaction(async (transaction) => {
      const record = await transaction.dealerApplication.create({
        data: {
          companyName, contactName, email: email.toLowerCase(), phone,
          website: stringValue(body, "website"), businessType: stringValue(body, "businessType"), city, province,
          serviceArea: stringValue(body, "serviceArea"), productFocus: stringValue(body, "productFocus"),
          capabilities: stringArrayValue(body, "capabilities"), message: stringValue(body, "message"),
          source: stringValue(body, "source"), applicationAcknowledgement: booleanValue(body, "applicationAcknowledgement"), rawPayload
        }
      });

      await queueInternalEmail(transaction, {
        templateKey: "dealer_application_received",
        subject: `New VanStro dealer application: ${companyName}`,
        payload: { dealerApplicationId: record.id, companyName, contactName, email: email.toLowerCase(), city, province }
      });

      return record;
    });

    return context.json(
      { data: { applicationId: application.id, status: application.status } },
      201
    );
  });

  routes.post("/products/:identifier/reviews", async (context) => {
    const body = await readBody(context);

    if (!body) return badRequest(context, "JSON or form body is required.");

    const identifier = context.req.param("identifier");
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id: identifier }, { slug: identifier }],
        status: "active"
      },
      select: { id: true, name: true, slug: true }
    });

    if (!product) {
      return context.json({ error: "Product not found." }, 404);
    }

    const rating = numberValue(body, "rating");
    const title = stringValue(body, "title");
    const reviewBody = stringValue(body, "body");
    const nickname = stringValue(body, "nickname");
    const email = stringValue(body, "email");
    const acceptedTerms = booleanValue(body, "acceptedTerms");

    if (!rating || rating < 1 || rating > 5 || !reviewBody || !nickname || !email || !acceptedTerms) {
      return badRequest(
        context,
        "rating, body, nickname, email and acceptedTerms are required."
      );
    }

    const review = await prisma.$transaction(async (transaction) => {
      const record = await transaction.productReview.create({
        data: {
          productId: product.id, rating, title, body: reviewBody, nickname,
          email: email.toLowerCase(), topics: stringArrayValue(body, "topics"), acceptedTerms, status: "pending"
        }
      });

      await queueInternalEmail(transaction, {
        templateKey: "product_review_pending",
        subject: `New VanStro product review pending: ${product.name}`,
        payload: { productReviewId: record.id, productId: product.id, productSlug: product.slug, rating, nickname }
      });

      return record;
    });

    return context.json(
      { data: { reviewId: review.id, status: review.status } },
      201
    );
  });

  routes.get("/products/:identifier/reviews", async (context) => {
    const identifier = context.req.param("identifier");
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id: identifier }, { slug: identifier }],
        status: "active"
      },
      select: { id: true }
    });

    if (!product) {
      return context.json({ error: "Product not found." }, 404);
    }

    const reviews = await prisma.productReview.findMany({
      where: { productId: product.id, status: "published" },
      orderBy: { createdAt: "desc" }
    });

    return context.json({ data: reviews.map(publicReview) });
  });

  return routes;
}

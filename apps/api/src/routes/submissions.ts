import { prisma, type Prisma } from "@vanstro/db";
import { Hono, type Context } from "hono";
import { queueCustomerEmail, queueInternalAlert } from "../email/queue.js";
import { publicError, type PublicApiErrorCode } from "../public-errors.js";
import {
  PUBLIC_SUBMISSION_LIMITS,
  isBoundedText,
  isValidCapabilities,
  isValidEmail,
  isValidLocale,
  isValidOptionalUrl,
  isValidRating
} from "../public-submission-validation.js";

type SubmissionBody = Record<string, unknown>;

const contactTopics = new Set([
  "products",
  "orders",
  "dealer-service",
  "dealer-program",
  "careers",
  "website-support"
]);

function isValidContactTopic(topic: string | undefined): topic is string {
  return typeof topic === "string" && contactTopics.has(topic);
}

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

export function submissionRawPayload(body: SubmissionBody): Prisma.InputJsonObject | undefined {
  const locale = stringValue(body, "locale");

  return locale ? { locale } : undefined;
}

function badRequest(context: Context, code: PublicApiErrorCode, message: string) {
  return publicError(context, 400, code, message);
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
    title: review.title,
    body: review.body,
    rating: review.rating,
    createdAt: review.createdAt.toISOString(),
    verifiedBuyer: false
  };
}

export function createSubmissionRoutes(database: typeof prisma = prisma) {
  const routes = new Hono();

  routes.post("/contact/leads", async (context) => {
    const body = await readBody(context);

    if (!body) return badRequest(context, "SUBMISSION_INVALID", "JSON or form body is required.");

    const name = stringValue(body, "name") ?? stringValue(body, "contactName");
    const email = stringValue(body, "email");
    const phone = stringValue(body, "phone");
    const topic = stringValue(body, "topic");
    const city = stringValue(body, "city");
    const preferredDealer = stringValue(body, "dealer") ?? stringValue(body, "preferredDealer");
    const orderNumber = stringValue(body, "orderNumber");
    const message = stringValue(body, "message");
    const sourcePath = stringValue(body, "sourcePath");
    const locale = stringValue(body, "locale");

    if (
      !isBoundedText(name, PUBLIC_SUBMISSION_LIMITS.name, { required: true }) ||
      !isValidEmail(email) ||
      !isBoundedText(phone, PUBLIC_SUBMISSION_LIMITS.phone) ||
      !isValidContactTopic(topic) ||
      !isBoundedText(city, PUBLIC_SUBMISSION_LIMITS.shortText) ||
      !isBoundedText(preferredDealer, PUBLIC_SUBMISSION_LIMITS.shortText) ||
      !isBoundedText(orderNumber, PUBLIC_SUBMISSION_LIMITS.shortText) ||
      !isBoundedText(message, PUBLIC_SUBMISSION_LIMITS.message, { required: true }) ||
      !isBoundedText(sourcePath, PUBLIC_SUBMISSION_LIMITS.url) ||
      !locale ||
      !isValidLocale(locale)
    ) {
      return badRequest(context, "CONTACT_INVALID", "Contact submission is invalid.");
    }

    const validatedName = name as string;
    const validatedEmail = email as string;
    const validatedTopic = topic as string;
    const validatedMessage = message as string;
    const rawPayload = submissionRawPayload(body);
    const lead = await database.$transaction(async (transaction) => {
      const record = await transaction.contactLead.create({
        data: {
          name: validatedName,
          email: validatedEmail.toLowerCase(),
          phone,
          topic: validatedTopic,
          city,
          preferredDealer,
          orderNumber,
          message: validatedMessage,
          locale,
          sourcePath,
          rawPayload
        }
      });

      await queueInternalAlert(transaction, {
        templateKey: "contact_lead_received",
        subject: `New VanStro contact lead: ${validatedTopic}`,
        payload: {
          contactLeadId: record.id,
          name: validatedName,
          email: validatedEmail.toLowerCase(),
          topic: validatedTopic,
          message: validatedMessage
        }
      });
      await queueCustomerEmail(transaction, {
        templateKey: "contact_lead_ack",
        toEmail: validatedEmail.toLowerCase(),
        payload: {
          contactLeadId: record.id,
          name: validatedName,
          topic: validatedTopic
        }
      });

      return record;
    });

    return context.json({ data: { leadId: lead.id, status: lead.status } }, 201);
  });

  routes.post("/dealer-applications", async (context) => {
    const body = await readBody(context);

    if (!body) return badRequest(context, "SUBMISSION_INVALID", "JSON or form body is required.");

    const companyName = stringValue(body, "companyName");
    const contactName = stringValue(body, "contactName");
    const email = stringValue(body, "email");
    const phone = stringValue(body, "phone");
    const website = stringValue(body, "website");
    const businessType = stringValue(body, "businessType");
    const city = stringValue(body, "city");
    const province = stringValue(body, "province");
    const serviceArea = stringValue(body, "serviceArea");
    const productFocus = stringValue(body, "productFocus");
    const capabilities = stringArrayValue(body, "capabilities").map((value) => value.trim());
    const message = stringValue(body, "message");
    const source = stringValue(body, "source");
    const locale = stringValue(body, "locale");

    const applicationAcknowledgement = booleanValue(body, "applicationAcknowledgement");

    if (
      !isBoundedText(companyName, PUBLIC_SUBMISSION_LIMITS.companyName, { required: true }) ||
      !isBoundedText(contactName, PUBLIC_SUBMISSION_LIMITS.name, { required: true }) ||
      !isValidEmail(email) ||
      !isBoundedText(phone, PUBLIC_SUBMISSION_LIMITS.phone, { required: true }) ||
      !isValidOptionalUrl(website) ||
      !isBoundedText(businessType, PUBLIC_SUBMISSION_LIMITS.shortText) ||
      !isBoundedText(city, PUBLIC_SUBMISSION_LIMITS.shortText, { required: true }) ||
      !isBoundedText(province, PUBLIC_SUBMISSION_LIMITS.shortText, { required: true }) ||
      !isBoundedText(serviceArea, PUBLIC_SUBMISSION_LIMITS.shortText) ||
      !isBoundedText(productFocus, PUBLIC_SUBMISSION_LIMITS.shortText) ||
      !isValidCapabilities(body.capabilities, capabilities) ||
      !isBoundedText(message, PUBLIC_SUBMISSION_LIMITS.message) ||
      !isBoundedText(source, PUBLIC_SUBMISSION_LIMITS.shortText) ||
      !isValidLocale(locale) ||
      applicationAcknowledgement !== true
    ) {
      return badRequest(context, "DEALER_APPLICATION_INVALID", "Dealer application is invalid.");
    }

    const validatedCompanyName = companyName as string;
    const validatedContactName = contactName as string;
    const validatedEmail = email as string;
    const validatedPhone = phone as string;
    const validatedCity = city as string;
    const validatedProvince = province as string;
    const rawPayload = submissionRawPayload(body);
    const application = await database.$transaction(async (transaction) => {
      const record = await transaction.dealerApplication.create({
        data: {
          companyName: validatedCompanyName,
          contactName: validatedContactName,
          email: validatedEmail.toLowerCase(),
          phone: validatedPhone,
          website,
          businessType,
          city: validatedCity,
          province: validatedProvince,
          serviceArea, productFocus,
          capabilities, message,
          source, applicationAcknowledgement, rawPayload
        }
      });

      await queueInternalAlert(transaction, {
        templateKey: "dealer_application_received",
        subject: `New VanStro dealer application: ${validatedCompanyName}`,
        payload: {
          dealerApplicationId: record.id,
          companyName: validatedCompanyName,
          contactName: validatedContactName,
          email: validatedEmail.toLowerCase(),
          city: validatedCity,
          province: validatedProvince
        }
      });
      await queueCustomerEmail(transaction, {
        templateKey: "dealer_application_ack",
        toEmail: validatedEmail.toLowerCase(),
        payload: {
          dealerApplicationId: record.id,
          companyName: validatedCompanyName,
          contactName: validatedContactName
        }
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

    if (!body) return badRequest(context, "SUBMISSION_INVALID", "JSON or form body is required.");

    const identifier = context.req.param("identifier");
    const product = await database.product.findFirst({
      where: {
        OR: [{ id: identifier }, { slug: identifier }],
        status: "active"
      },
      select: { id: true, name: true, slug: true }
    });

    if (!product) {
      return publicError(context, 404, "COMMERCE_NOT_FOUND", "Product not found.");
    }

    const rating = numberValue(body, "rating");
    const title = stringValue(body, "title");
    const reviewBody = stringValue(body, "body");
    const nickname = stringValue(body, "nickname");
    const email = stringValue(body, "email");
    const acceptedTerms = booleanValue(body, "acceptedTerms");

    if (
      !isValidRating(rating) ||
      !isBoundedText(title, PUBLIC_SUBMISSION_LIMITS.title) ||
      !isBoundedText(reviewBody, PUBLIC_SUBMISSION_LIMITS.message, { required: true }) ||
      !isBoundedText(nickname, PUBLIC_SUBMISSION_LIMITS.name, { required: true }) ||
      !isValidEmail(email) ||
      !acceptedTerms
    ) {
      return badRequest(context, "SUBMISSION_INVALID", "Product review is invalid.");
    }

    const validatedRating = rating as number;
    const validatedReviewBody = reviewBody as string;
    const validatedNickname = nickname as string;
    const validatedEmail = email as string;

    const existingPending = await database.productReview.findFirst({
      where: {
        productId: product.id,
        email: validatedEmail.toLowerCase(),
        status: "pending"
      }
    });
    if (existingPending) {
      return publicError(context, 409, "SUBMISSION_INVALID", "A pending review already exists for this product and email.");
    }

    const review = await database.$transaction(async (transaction) => {
      const record = await transaction.productReview.create({
        data: {
          productId: product.id,
          rating: validatedRating,
          title,
          body: validatedReviewBody,
          nickname: validatedNickname,
          email: validatedEmail.toLowerCase(),
          topics: stringArrayValue(body, "topics"),
          acceptedTerms,
          status: "pending"
        }
      });

      await queueInternalAlert(transaction, {
        templateKey: "product_review_pending",
        subject: `New VanStro product review pending: ${product.name}`,
        payload: {
          productReviewId: record.id,
          productId: product.id,
          productSlug: product.slug,
          productName: product.name,
          rating: validatedRating,
          nickname: validatedNickname
        }
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
    const product = await database.product.findFirst({
      where: {
        OR: [{ id: identifier }, { slug: identifier }],
        status: "active"
      },
      select: { id: true }
    });

    if (!product) {
      return publicError(context, 404, "COMMERCE_NOT_FOUND", "Product not found.");
    }

    const reviews = await database.productReview.findMany({
      where: { productId: product.id, status: "published" },
      orderBy: { createdAt: "desc" }
    });

    return context.json({ data: reviews.map(publicReview) });
  });

  return routes;
}

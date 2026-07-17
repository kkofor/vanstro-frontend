import { prisma } from "@vanstro/db";
import { Hono } from "hono";
import { createAuthRoutes } from "./routes/auth.js";
import { createCatalogRoutes } from "./routes/catalog.js";
import { createCliRoutes } from "./routes/cli.js";
import { createCommerceRoutes } from "./routes/commerce.js";
import { createDashboardRoutes } from "./routes/dashboard.js";
import { createMcpRoutes } from "./routes/mcp.js";
import { createPrivacyRoutes } from "./routes/privacy.js";
import { createSubmissionRoutes } from "./routes/submissions.js";
import { rateLimitPublicWrites } from "./middleware/rate-limit.js";

type HealthPayload = {
  status: "ok";
  service: "vanstro-api";
  database: "ok" | "not_configured" | "error";
  timestamp: string;
};

async function checkDatabase() {
  if (!process.env.DATABASE_URL) return "not_configured" as const;

  try {
    await prisma.$queryRaw`SELECT 1`;
    return "ok" as const;
  } catch {
    return "error" as const;
  }
}

async function healthResponse() {
  const payload: HealthPayload = {
    status: "ok",
    service: "vanstro-api",
    database: await checkDatabase(),
    timestamp: new Date().toISOString()
  };

  return { data: payload };
}

async function readyResponse() {
  const response = await healthResponse();
  const statusCode: 200 | 503 = response.data.database === "ok" ? 200 : 503;

  return { response, statusCode };
}

function liveResponse() {
  return {
    data: {
      status: "ok",
      service: "vanstro-api",
      timestamp: new Date().toISOString()
    }
  };
}

function getAllowedOrigins() {
  const configuredOrigins =
    process.env.VANSTRO_CORS_ORIGINS?.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean) ?? [];

  return new Set([
    "https://vanstro.vip",
    "https://www.vanstro.vip",
    "https://vanstro.ca",
    "https://www.vanstro.ca",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:4000",
    "http://127.0.0.1:4000",
    ...configuredOrigins
  ]);
}

export function createApp() {
  const app = new Hono();
  const apiRoutes = new Hono();
  const allowedOrigins = getAllowedOrigins();

  app.use("*", async (context, next) => {
    const origin = context.req.header("origin");

    if (origin && allowedOrigins.has(origin)) {
      context.header("Access-Control-Allow-Origin", origin);
      context.header("Access-Control-Allow-Credentials", "true");
      context.header("Access-Control-Allow-Headers", "Authorization, Content-Type, Accept");
      context.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      context.header("Vary", "Origin");
    }

    if (context.req.method === "OPTIONS") {
      return context.body(null, 204);
    }

    await next();
  });
  app.use("*", rateLimitPublicWrites);

  apiRoutes.route("/", createAuthRoutes());
  apiRoutes.route("/", createSubmissionRoutes());
  apiRoutes.route("/", createCommerceRoutes());
  apiRoutes.route("/", createCatalogRoutes());
  apiRoutes.route("/", createCliRoutes());
  apiRoutes.route("/", createDashboardRoutes());
  apiRoutes.route("/", createMcpRoutes());
  apiRoutes.route("/", createPrivacyRoutes());

  app.get("/health/live", (context) => context.json(liveResponse()));
  app.get("/health/ready", async (context) => {
    const { response, statusCode } = await readyResponse();

    return context.json(response, statusCode);
  });
  app.get("/health", async (context) => {
    const { response, statusCode } = await readyResponse();

    return context.json(response, statusCode);
  });
  app.get("/api/v1/health", async (context) => {
    const { response, statusCode } = await readyResponse();

    return context.json(response, statusCode);
  });
  app.route("/", apiRoutes);
  app.route("/api/v1", apiRoutes);

  return app;
}

export type VanstroApiApp = ReturnType<typeof createApp>;

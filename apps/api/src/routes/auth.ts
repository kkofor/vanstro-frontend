import { hashPassword, prisma } from "@vanstro/db";
import { Hono, type Context } from "hono";
import {
  createSession,
  authenticateAndCreateSession,
  extractBearerToken,
  getRequestIp,
  getSessionFromRequest,
  getSessionUserById,
  revokeToken,
  revokeUserSessions,
  rotateSession
} from "../auth/session.js";

async function readBody(context: Context) {
  const contentType = context.req.header("content-type") ?? "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const body = await context.req.parseBody();

    return {
      email: typeof body.email === "string" ? body.email : undefined,
      password: typeof body.password === "string" ? body.password : undefined,
      firstName: typeof body.firstName === "string" ? body.firstName : undefined,
      lastName: typeof body.lastName === "string" ? body.lastName : undefined
    };
  }

  const body = (await context.req.json().catch(() => null)) as
    | { email?: unknown; password?: unknown; firstName?: unknown; lastName?: unknown }
    | null;

  return {
    email: typeof body?.email === "string" ? body.email : undefined,
    password: typeof body?.password === "string" ? body.password : undefined,
    firstName: typeof body?.firstName === "string" ? body.firstName : undefined,
    lastName: typeof body?.lastName === "string" ? body.lastName : undefined
  };
}

async function writeLoginEvent(
  context: Context,
  input: {
    userId?: string;
    email?: string;
    success: boolean;
    reason?: string;
  }
) {
  await prisma.loginEvent.create({
    data: {
      userId: input.userId,
      email: input.email,
      success: input.success,
      reason: input.reason,
      ipAddress: getRequestIp(context),
      userAgent: context.req.header("user-agent")
    }
  });
}

export function createAuthRoutes() {
  const routes = new Hono();

  routes.post("/auth/customer/register", async (context) => {
    const { email, password, firstName, lastName } = await readBody(context);
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !password || !firstName?.trim() || !lastName?.trim()) {
      return context.json({ error: "email, password, firstName and lastName are required." }, 400);
    }

    if (password.length < 12) {
      return context.json({ error: "password must be at least 12 characters." }, 400);
    }

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (existingUser) {
      return context.json({ error: "An account already exists for this email." }, 409);
    }

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        kind: "customer",
        status: "active",
        customerProfile: {
          create: { firstName: firstName.trim(), lastName: lastName.trim() }
        },
        passwordCredential: { create: hashPassword(password) }
      }
    });
    const session = await createSession(user.id, {
      ipAddress: getRequestIp(context),
      userAgent: context.req.header("user-agent")
    });
    const sessionUser = await getSessionUserById(user.id);

    await writeLoginEvent(context, { userId: user.id, email: normalizedEmail, success: true });

    return context.json({ data: { ...session, user: sessionUser } }, 201);
  });

  routes.post("/auth/login", async (context) => {
    const { email, password } = await readBody(context);
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return context.json({ error: "email and password are required." }, 400);
    }

    const result = await authenticateAndCreateSession(normalizedEmail, password, {
      ipAddress: getRequestIp(context),
      userAgent: context.req.header("user-agent")
    });

    if (!result.authenticated) {
      await writeLoginEvent(context, {
        userId: result.userId,
        email: normalizedEmail,
        success: false,
        reason: "invalid_credentials"
      });

      return context.json({ error: "Invalid email or password." }, 401);
    }

    await writeLoginEvent(context, {
      userId: result.user.id,
      email: normalizedEmail,
      success: true
    });

    return context.json({
      data: {
        ...result.session,
        user: result.user
      }
    });
  });

  routes.get("/auth/me", async (context) => {
    const session = await getSessionFromRequest(context);

    if (!session) {
      return context.json({ error: "Authentication is required." }, 401);
    }

    return context.json({ data: { user: session.user } });
  });

  routes.post("/auth/refresh", async (context) => {
    const token = extractBearerToken(context);

    if (!token) {
      return context.json({ error: "Authentication is required." }, 401);
    }

    const nextSession = await rotateSession(token, {
      ipAddress: getRequestIp(context),
      userAgent: context.req.header("user-agent")
    });

    if (!nextSession) {
      return context.json({ error: "Authentication is required." }, 401);
    }

    return context.json({
      data: {
        ...nextSession
      }
    });
  });

  routes.post("/auth/logout", async (context) => {
    const token = extractBearerToken(context);

    if (token) {
      await revokeToken(token);
    }

    return context.json({ data: { ok: true } });
  });

  routes.post("/auth/logout-all", async (context) => {
    const session = await getSessionFromRequest(context);

    if (!session) {
      return context.json({ error: "Authentication is required." }, 401);
    }

    await prisma.$transaction((transaction) =>
      revokeUserSessions(transaction, session.user.id)
    );

    return context.json({ data: { ok: true } });
  });

  return routes;
}

import { authConsumePasswordReset, authIssuePasswordReset, authRegisterCustomerSession, encryptSecret, hashPassword, prisma } from "@vanstro/db";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Hono, type Context } from "hono";
import { upsertContactFromRegistration, linkContactToUser, recordLoginEvent } from "../crm/service.js";
import { queueCustomerEmail } from "../email/queue.js";
import { publicError } from "../public-errors.js";
import {
  authenticateAndCreateSession,
  extractSessionToken,
  getRequestIp,
  getSessionFromRequest,
  revokeAllSelfSessions,
  revokeToken,
  revokeUserSessions,
  rotateSession
} from "../auth/session.js";
import { sessionCookieName } from "../auth/session.js";
import { resolveEffectiveAuthPolicy } from "../auth/policy.js";

const PASSWORD_RESET_RESPONSE = "If an active account exists for that email, a password reset link will be sent.";

function passwordResetTokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function publicAppUrl() {
  const configured = process.env.PUBLIC_APP_URL?.trim() ?? "https://vanstro.ca";
  const url = new URL(configured);
  if (process.env.VANSTRO_RUNTIME_MODE === "deployment" && url.protocol !== "https:") {
    throw new Error("PUBLIC_APP_URL must use HTTPS in deployment mode.");
  }
  return url.origin;
}

function passwordResetEmailPayload(input: { firstName: string; resetUrl: string; expiresMinutes: number }) {
  const values = {
    firstName: input.firstName,
    resetUrl: input.resetUrl,
    expiresMinutes: input.expiresMinutes
  };
  const encryptionKey = process.env.EMAIL_SETTINGS_ENCRYPTION_KEY?.trim();
  if (process.env.VANSTRO_RUNTIME_MODE === "deployment" && !encryptionKey) {
    throw new Error("EMAIL_SETTINGS_ENCRYPTION_KEY is required for password reset email payloads in deployment mode.");
  }
  return encryptionKey
    ? { encryptedSecurityPayload: encryptSecret(JSON.stringify(values), encryptionKey) }
    : values;
}

function usesSessionCookie() {
  return true;
}

function setSessionCookie(context: Context, token: string, expiresAt: Date) {
  const secure = process.env.VANSTRO_RUNTIME_MODE === "deployment" ? "; Secure" : "";
  context.header(
    "Set-Cookie",
    `${sessionCookieName()}=${encodeURIComponent(token)}; Path=/; Expires=${expiresAt.toUTCString()}; HttpOnly${secure}; SameSite=Lax`
  );
}

function clearSessionCookie(context: Context) {
  const secure = process.env.VANSTRO_RUNTIME_MODE === "deployment" ? "; Secure" : "";
  context.header("Set-Cookie", `${sessionCookieName()}=; Path=/; Max-Age=0; HttpOnly${secure}; SameSite=Lax`);
}

function sessionPayload<T extends { accessToken: string; expiresAt: Date }>(context: Context, session: T) {
  setSessionCookie(context, session.accessToken, session.expiresAt);
  if (process.env.VANSTRO_RUNTIME_MODE !== "deployment") return session;
  const { accessToken: _accessToken, ...safeSession } = session;
  return safeSession;
}

async function readBody(context: Context) {
  const contentType = context.req.header("content-type") ?? "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const body = await context.req.parseBody();

    return {
      email: typeof body.email === "string" ? body.email : undefined,
      password: typeof body.password === "string" ? body.password : undefined,
      firstName: typeof body.firstName === "string" ? body.firstName : undefined,
      lastName: typeof body.lastName === "string" ? body.lastName : undefined,
      token: typeof body.token === "string" ? body.token : undefined,
      locale: body.locale === "fr-CA" ? "fr-CA" : "en-CA"
    };
  }

  const body = (await context.req.json().catch(() => null)) as
    | { email?: unknown; password?: unknown; firstName?: unknown; lastName?: unknown; token?: unknown; locale?: unknown }
    | null;

  return {
    email: typeof body?.email === "string" ? body.email : undefined,
    password: typeof body?.password === "string" ? body.password : undefined,
    firstName: typeof body?.firstName === "string" ? body.firstName : undefined,
    lastName: typeof body?.lastName === "string" ? body.lastName : undefined,
    token: typeof body?.token === "string" ? body.token : undefined,
    locale: body?.locale === "fr-CA" ? "fr-CA" : "en-CA"
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
      return publicError(context, 400, "AUTH_INVALID_INPUT", "email, password, firstName and lastName are required.");
    }

    const policy = await resolveEffectiveAuthPolicy();

    if (password.length < policy.passwordPolicy.minimumLength) {
      return publicError(context, 400, "AUTH_PASSWORD_TOO_SHORT", `password must be at least ${policy.passwordPolicy.minimumLength} characters.`);
    }

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (existingUser) {
      return publicError(context, 409, "AUTH_ACCOUNT_EXISTS", "An account already exists for this email.");
    }

    const user = await prisma.$transaction(async (transaction) => {
      const userId=randomUUID(),credential=hashPassword(password),token=randomBytes(32).toString("base64url"),expiresAt=new Date(Date.now()+7*86400000);
      await authRegisterCustomerSession(transaction,{userId,email:normalizedEmail,firstName:firstName.trim(),lastName:lastName.trim(),...credential,tokenHash:createHash("sha256").update(token).digest("hex"),userAgent:context.req.header("user-agent"),ipAddress:getRequestIp(context),expiresAt});
      return{userId,token,expiresAt};
    });
    await prisma.$transaction(async transaction=>{await linkContactToUser(transaction,normalizedEmail,user.userId);await upsertContactFromRegistration(transaction, {
        userId: user.userId,
        email: normalizedEmail,
        firstName: firstName.trim(),
        lastName: lastName.trim()
      });
      await queueCustomerEmail(transaction, {
        templateKey: "welcome",
        toEmail: normalizedEmail,
        payload: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: normalizedEmail
        }
      });
    });
    const session={accessToken:user.token,tokenType:"Bearer" as const,expiresAt:user.expiresAt};
    const sessionUser={id:user.userId,email:normalizedEmail,kind:"customer",status:"active",roles:[],permissions:[]};

    await writeLoginEvent(context, { userId: user.userId, email: normalizedEmail, success: true });

    return context.json({ data: { ...sessionPayload(context, session), user: sessionUser } }, 201);
  });

  routes.post("/auth/password/forgot", async (context) => {
    const { email, locale } = await readBody(context);
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@") || normalizedEmail.length > 320) {
      return publicError(context, 400, "AUTH_INVALID_INPUT", "A valid email address is required.");
    }
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { customerProfile: true, adminProfile: true, passwordCredential: { select: { id: true } } }
    });
    if (user?.status === "active" && user.passwordCredential) {
      const policy = await resolveEffectiveAuthPolicy();
      const token = randomBytes(32).toString("base64url");
      const expiresAt = new Date(Date.now() + policy.passwordPolicy.resetTokenTtlMinutes * 60_000);
      await prisma.$transaction(async (transaction) => {
        await authIssuePasswordReset(prisma,normalizedEmail,passwordResetTokenHash(token),expiresAt);
        const firstName = user.customerProfile?.firstName ?? user.adminProfile?.displayName ?? "VanStro customer";
        await queueCustomerEmail(transaction, {
          templateKey: locale === "fr-CA" ? "password_reset_fr" : "password_reset",
          toEmail: normalizedEmail,
          payload: passwordResetEmailPayload({
            firstName,
            expiresMinutes: policy.passwordPolicy.resetTokenTtlMinutes,
            resetUrl: `${publicAppUrl()}${locale === "fr-CA" ? "/fr" : ""}/account/reset-password?token=${encodeURIComponent(token)}`
          })
        });
      });
    }
    return context.json({ data: { ok: true, message: PASSWORD_RESET_RESPONSE } }, 202);
  });

  routes.post("/auth/password/reset", async (context) => {
    const { token, password } = await readBody(context);
    if (!token || token.length > 256 || !password) {
      return publicError(context, 400, "AUTH_INVALID_INPUT", "token and password are required.");
    }
    const policy = await resolveEffectiveAuthPolicy();
    if (password.length < policy.passwordPolicy.minimumLength) {
      return publicError(context, 400, "AUTH_PASSWORD_TOO_SHORT", `password must be at least ${policy.passwordPolicy.minimumLength} characters.`);
    }
    const tokenHash = passwordResetTokenHash(token);
    const reset = await authConsumePasswordReset(prisma, { tokenHash, ...hashPassword(password) });
    if (!reset) {
      return publicError(context, 400, "AUTH_RESET_INVALID", "The password reset link is invalid or expired.");
    }
    clearSessionCookie(context);
    return context.json({ data: { ok: true } });
  });

  routes.post("/auth/login", async (context) => {
    const { email, password } = await readBody(context);
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return publicError(context, 400, "AUTH_INVALID_INPUT", "email and password are required.");
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

      return publicError(context, 401, "AUTH_INVALID_CREDENTIALS", "Invalid email or password.");
    }

    await writeLoginEvent(context, {
      userId: result.user.id,
      email: normalizedEmail,
      success: true
    });
    await prisma.$transaction(async (transaction) => {
      await linkContactToUser(transaction, normalizedEmail, result.user.id);
      await recordLoginEvent(transaction, result.user.id);
    }).catch(() => undefined);

    return context.json({
      data: {
        ...sessionPayload(context, result.session),
        user: result.user
      }
    });
  });

  routes.get("/auth/me", async (context) => {
    const session = await getSessionFromRequest(context);

    if (!session) {
      return publicError(context, 401, "AUTH_REQUIRED", "Authentication is required.");
    }

    return context.json({ data: { user: session.user } });
  });

  routes.post("/auth/refresh", async (context) => {
    const token = extractSessionToken(context);

    if (!token) {
      return publicError(context, 401, "AUTH_REQUIRED", "Authentication is required.");
    }

    const nextSession = await rotateSession(token, {
      ipAddress: getRequestIp(context),
      userAgent: context.req.header("user-agent")
    });

    if (!nextSession) {
      return publicError(context, 401, "AUTH_REQUIRED", "Authentication is required.");
    }

    return context.json({
      data: {
        ...sessionPayload(context, nextSession)
      }
    });
  });

  routes.post("/auth/logout", async (context) => {
    const token = extractSessionToken(context);

    if (token) {
      await revokeToken(token);
    }
    if (usesSessionCookie()) clearSessionCookie(context);

    return context.json({ data: { ok: true } });
  });

  routes.post("/auth/logout-all", async (context) => {
    const session = await getSessionFromRequest(context);

    if (!session) {
      return publicError(context, 401, "AUTH_REQUIRED", "Authentication is required.");
    }

    await revokeAllSelfSessions(extractSessionToken(context)!);
    if (usesSessionCookie()) clearSessionCookie(context);

    return context.json({ data: { ok: true } });
  });

  return routes;
}

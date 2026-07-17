import { prisma, type Prisma, verifyPassword } from "@vanstro/db";
import { getConnInfo } from "@hono/node-server/conninfo";
import { createHash, randomBytes } from "node:crypto";
import type { Context } from "hono";
import { trustProxyHeaders } from "../config.js";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

type SessionDatabase = Pick<Prisma.TransactionClient, "refreshSession">;

export type SessionUser = {
  id: string;
  email: string;
  kind: string;
  status: string;
  roles: string[];
  permissions: string[];
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function lockUserSessionLifecycle(
  transaction: Prisma.TransactionClient,
  userId: string
) {
  await transaction.$queryRaw`SELECT "id" FROM "users" WHERE "id" = ${userId} FOR UPDATE`;
}

export function extractBearerToken(context: Context) {
  const authorization = context.req.header("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return undefined;
  }

  return authorization.slice("Bearer ".length).trim();
}

export function getRequestIp(context: Context) {
  if (trustProxyHeaders()) {
    const cloudflareAddress = context.req.header("cf-connecting-ip")?.trim();
    if (cloudflareAddress) return cloudflareAddress;

    const forwardedFor = context.req.header("x-forwarded-for");
    if (forwardedFor) return forwardedFor.split(",")[0]?.trim();

    const realIp = context.req.header("x-real-ip")?.trim();
    if (realIp) return realIp;
  }

  try {
    return getConnInfo(context).remote.address;
  } catch {
    return undefined;
  }
}

function formatUser(user: {
  id: string;
  email: string;
  kind: string;
  status: string;
  userRoles: Array<{
    role: {
      key: string;
      rolePermissions: Array<{ permission: { key: string } }>;
    };
  }>;
}): SessionUser {
  const permissions = new Set<string>();

  for (const userRole of user.userRoles) {
    for (const rolePermission of userRole.role.rolePermissions) {
      permissions.add(rolePermission.permission.key);
    }
  }

  return {
    id: user.id,
    email: user.email,
    kind: user.kind,
    status: user.status,
    roles: user.userRoles.map((userRole) => userRole.role.key),
    permissions: [...permissions].sort()
  };
}

export async function getSessionUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: { permission: true }
              }
            }
          }
        }
      }
    }
  });

  if (!user || user.status !== "active") return undefined;

  return formatUser(user);
}

async function createSessionWithDatabase(
  database: SessionDatabase,
  userId: string,
  options: { userAgent?: string; ipAddress?: string } = {}
) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await database.refreshSession.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      userAgent: options.userAgent,
      ipAddress: options.ipAddress,
      expiresAt
    }
  });

  return {
    accessToken: token,
    tokenType: "Bearer" as const,
    expiresAt
  };
}

export async function authenticateAndCreateSession(
  email: string,
  password: string,
  options: { userAgent?: string; ipAddress?: string } = {}
) {
  return prisma.$transaction(async (transaction) => {
    const lockedUsers = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "users" WHERE "email" = ${email} FOR UPDATE
    `;
    const lockedUser = lockedUsers[0];

    if (!lockedUser) return { authenticated: false as const };

    const user = await transaction.user.findUnique({
      where: { id: lockedUser.id },
      include: {
        passwordCredential: true,
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true }
                }
              }
            }
          }
        }
      }
    });

    if (!user || user.status !== "active" || !user.passwordCredential) {
      return { authenticated: false as const };
    }

    const passwordMatches = verifyPassword(password, {
      algorithm: user.passwordCredential.algorithm,
      passwordHash: user.passwordCredential.passwordHash,
      passwordSalt: user.passwordCredential.passwordSalt,
      iterations: user.passwordCredential.iterations
    });

    if (!passwordMatches) {
      return { authenticated: false as const, userId: user.id };
    }

    const session = await createSessionWithDatabase(transaction, user.id, options);

    return {
      authenticated: true as const,
      session,
      user: formatUser(user)
    };
  });
}

export async function createSession(
  userId: string,
  options: { userAgent?: string; ipAddress?: string } = {}
) {
  return createSessionWithDatabase(prisma, userId, options);
}

export async function rotateSession(
  token: string,
  options: { userAgent?: string; ipAddress?: string } = {}
) {
  const tokenHash = hashToken(token);
  const revokedAt = new Date();

  return prisma.$transaction(async (transaction) => {
    const existingSession = await transaction.refreshSession.findUnique({
      where: { tokenHash },
      select: { userId: true }
    });

    if (!existingSession) return undefined;

    await lockUserSessionLifecycle(transaction, existingSession.userId);

    const claim = await transaction.refreshSession.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: revokedAt }
      },
      data: { revokedAt }
    });

    if (claim.count !== 1) return undefined;

    const user = await transaction.user.findUnique({
      where: { id: existingSession.userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true }
                }
              }
            }
          }
        }
      }
    });

    if (!user || user.status !== "active") return undefined;

    const nextSession = await createSessionWithDatabase(transaction, user.id, options);

    return {
      ...nextSession,
      user: formatUser(user)
    };
  });
}

export async function revokeUserSessions(
  transaction: Prisma.TransactionClient,
  userId: string
) {
  await lockUserSessionLifecycle(transaction, userId);

  await transaction.refreshSession.updateMany({
    where: {
      userId,
      revokedAt: null
    },
    data: { revokedAt: new Date() }
  });
}

export async function getSessionFromRequest(context: Context) {
  const token = extractBearerToken(context);

  if (!token) return undefined;

  const session = await prisma.refreshSession.findFirst({
    where: {
      tokenHash: hashToken(token),
      revokedAt: null,
      expiresAt: { gt: new Date() }
    },
    include: {
      user: {
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: { permission: true }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  if (!session || session.user.status !== "active") return undefined;

  return {
    sessionId: session.id,
    user: formatUser(session.user)
  };
}

export async function revokeToken(token: string) {
  await prisma.refreshSession.updateMany({
    where: {
      tokenHash: hashToken(token),
      revokedAt: null
    },
    data: { revokedAt: new Date() }
  });
}

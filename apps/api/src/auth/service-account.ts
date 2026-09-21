import { prisma, type Prisma } from "@vanstro/db";
import { createHash, randomBytes } from "node:crypto";
import type { Context } from "hono";
import { extractBearerToken } from "./session.js";

export type ServiceAccountPrincipal = {
  id: string;
  key: string;
  name: string;
  roles: string[];
  permissions: string[];
  /** Machine scope environment (S08 migration79 column; 'production' default). */
  environment: string;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

type ServiceAccountTokenDatabase = Pick<Prisma.TransactionClient, "serviceAccountToken">;

export async function lockServiceAccountLifecycle(
  transaction: Prisma.TransactionClient,
  serviceAccountId: string
) {
  await transaction.$queryRaw`
    SELECT "id" FROM "service_accounts" WHERE "id" = ${serviceAccountId} FOR UPDATE
  `;
}

function formatServiceAccount(account: {
  id: string;
  key: string;
  name: string;
  environment: string;
  roles: Array<{
    role: {
      key: string;
      rolePermissions: Array<{ permission: { key: string } }>;
    };
  }>;
}): ServiceAccountPrincipal {
  const permissions = new Set<string>();

  for (const accountRole of account.roles) {
    for (const rolePermission of accountRole.role.rolePermissions) {
      permissions.add(rolePermission.permission.key);
    }
  }

  return {
    id: account.id,
    key: account.key,
    name: account.name,
    roles: account.roles.map((accountRole) => accountRole.role.key),
    permissions: [...permissions].sort(),
    environment: account.environment
  };
}

export async function createServiceAccountToken(
  serviceAccountId: string,
  options: { name?: string; expiresAt?: Date } = {},
  database: ServiceAccountTokenDatabase = prisma
) {
  const token = `vsa_${randomBytes(32).toString("base64url")}`;
  const expiresAt = options.expiresAt ?? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  if (expiresAt.getTime() > Date.now() + 365 * 24 * 60 * 60 * 1000) {
    throw new Error("Service account tokens cannot be valid for more than 365 days.");
  }
  const record = await database.serviceAccountToken.create({
    data: {
      serviceAccountId,
      tokenHash: hashToken(token),
      name: options.name,
      expiresAt
    }
  });

  return { token, record };
}

export async function getServiceAccountFromRequest(context: Context) {
  const token = extractBearerToken(context);

  if (!token) return undefined;

  const record = await prisma.serviceAccountToken.findFirst({
    where: {
      tokenHash: hashToken(token),
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
    },
    include: {
      serviceAccount: {
        include: {
          roles: {
            include: {
              role: {
                include: {
                  rolePermissions: { include: { permission: true } }
                }
              }
            }
          }
        }
      }
    }
  });

  if (!record || record.serviceAccount.status !== "active") return undefined;

  await prisma.serviceAccountToken.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() }
  });

  // S08 migration79 adds service_accounts.environment (not part of the Prisma
  // schema yet); resolve it explicitly for machine scope enforcement.
  const environmentRows = await prisma.$queryRaw<Array<{ environment: string }>>`
    SELECT "environment" FROM "service_accounts" WHERE "id" = ${record.serviceAccount.id}
  `;
  const environment = environmentRows[0]?.environment ?? "production";

  return {
    tokenId: record.id,
    serviceAccount: formatServiceAccount({ ...record.serviceAccount, environment })
  };
}

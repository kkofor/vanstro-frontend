import { prisma, type Prisma } from "@vanstro/db";
import { type Context, type Next } from "hono";
import {
  getServiceAccountFromRequest,
  type ServiceAccountPrincipal
} from "./service-account.js";
import { getRequestIp } from "./session.js";

export type MachineEnv = {
  Variables: {
    serviceAccount: ServiceAccountPrincipal;
  };
};

export function hasMachinePermission(account: ServiceAccountPrincipal, permission: string) {
  return account.permissions.includes(permission);
}

export function requireMachineAccess(basePermission: string) {
  return async (context: Context<MachineEnv>, next: Next) => {
    const principal = await getServiceAccountFromRequest(context);

    if (!principal) {
      return context.json({ error: "A valid service account token is required." }, 401);
    }

    if (!hasMachinePermission(principal.serviceAccount, basePermission)) {
      return context.json({ error: `${basePermission} is required.` }, 403);
    }

    context.set("serviceAccount", principal.serviceAccount);
    await next();
  };
}

export function requireMachinePermission(context: Context<MachineEnv>, permission: string) {
  if (!hasMachinePermission(context.get("serviceAccount"), permission)) {
    return context.json({ error: `${permission} is required.` }, 403);
  }
}

export async function writeMachineAudit(
  context: Context<MachineEnv>,
  action: string,
  resourceType: string,
  resourceId?: string,
  metadata?: Prisma.InputJsonObject
) {
  await prisma.auditLog.create({
    data: {
      serviceAccountId: context.get("serviceAccount").id,
      action,
      resourceType,
      resourceId,
      metadata,
      ipAddress: getRequestIp(context),
      userAgent: context.req.header("user-agent")
    }
  });
}

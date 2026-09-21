import { prisma, type Prisma } from "@vanstro/db";
import { type Context, type Next } from "hono";
import {
  getServiceAccountFromRequest,
  type ServiceAccountPrincipal
} from "./service-account.js";
import { loadPublishedApiServiceAccountPolicy, machineScopeDenial } from "../dashboard/s08-settings-policy.js";
import type { ApiServiceAccountSettingsValueV1 } from "../dashboard/s08-settings.js";
import { getRequestIp } from "./session.js";

export type MachineEnv = {
  Variables: {
    serviceAccount: ServiceAccountPrincipal;
    serviceAccountTokenId: string;
    machineScopePolicy: ApiServiceAccountSettingsValueV1;
  };
};

export function hasMachinePermission(account: ServiceAccountPrincipal, permission: string) {
  return account.permissions.includes(permission);
}

/** Enforce the published machineScopePolicy at the request boundary. Denials
 *  use the stable public MACHINE_SCOPE_DENIED 403 without echoing policy
 *  internals beyond a short reason. */
function scopeDenialResponse(context: Context<MachineEnv>, principal: ServiceAccountPrincipal, permission: string, policy: ApiServiceAccountSettingsValueV1) {
  const reason = machineScopeDenial(principal, permission, policy);
  if (!reason) return undefined;
  return context.json({ error: reason, code: "MACHINE_SCOPE_DENIED" }, 403);
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

    const policy = await loadPublishedApiServiceAccountPolicy();
    const denied = scopeDenialResponse(context, principal.serviceAccount, basePermission, policy);
    if (denied) return denied;

    context.set("serviceAccount", principal.serviceAccount);
    context.set("serviceAccountTokenId", principal.tokenId);
    context.set("machineScopePolicy", policy);
    await next();
  };
}

export function requireMachinePermission(context: Context<MachineEnv>, permission: string) {
  if (!hasMachinePermission(context.get("serviceAccount"), permission)) {
    return context.json({ error: `${permission} is required.` }, 403);
  }
  return scopeDenialResponse(context, context.get("serviceAccount"), permission, context.get("machineScopePolicy"));
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

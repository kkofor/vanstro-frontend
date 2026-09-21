import type { DashboardAuthorization, DashboardFoundation } from "../api/api-contract.ts";
import { assertReadOnlyMethod, DashboardFoundationRequestError, resolveDashboardFoundationRoute } from "./f0-shell.ts";

export async function dashboardAuthorizationRequest(baseUrl: string, signal?: AbortSignal): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/dashboard/authorization`, {
      method: assertReadOnlyMethod(),
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal
    });
  } catch {
    throw new DashboardFoundationRequestError("unavailable");
  }

  if (response.status === 401) throw new DashboardFoundationRequestError("anonymous", response.status);
  if (response.status === 403) throw new DashboardFoundationRequestError("forbidden", response.status);
  if (!response.ok) throw new DashboardFoundationRequestError("unavailable", response.status);

  try {
    return await response.json();
  } catch {
    throw new DashboardFoundationRequestError("invalid-response", response.status);
  }
}

export function assertMatchingDashboardActors(
  foundation: DashboardFoundation,
  authorization: DashboardAuthorization
) {
  if (foundation.actor.id !== authorization.actor.id) {
    throw new DashboardFoundationRequestError("expired");
  }
}

export function authorizationRequestIdentity(authorization: DashboardAuthorization) {
  return `${authorization.actor.id}:${authorization.contextRevision}`;
}

const SCOPE_AWARE_READ_MODULES = new Set<DashboardFoundation["modules"][number]["module"]>(["dealers"]);

export function assertFreshDashboardAuthorization(
  authorization: DashboardAuthorization,
  now = Date.now()
) {
  if (Date.parse(authorization.expiresAt) <= now) {
    throw new DashboardFoundationRequestError("expired");
  }
}

export function projectAuthorizedFoundation(
  foundation: DashboardFoundation,
  authorization: DashboardAuthorization
): DashboardFoundation {
  const authorizationByModule = new Map(authorization.modules.map((module) => [module.module, module]));
  return {
    ...foundation,
    modules: foundation.modules.map((module) => {
      // Decision order (frozen V11-0 authority): known coming-soon always
      // wins over permission allow/deny and the projection stays byte
      // identical (readAllowed=false, reason "coming_soon").
      if (module.status === "coming_soon") return module;
      const capability = authorizationByModule.get(module.module);
      const readAllowed = authorization.status !== "unavailable"
        && capability?.actions.some((action) => action.action === "read"
          && action.decision === "allow"
          && (action.scope.kind === "global" || SCOPE_AWARE_READ_MODULES.has(module.module))) === true;
      return {
        ...module,
        readAllowed,
        ...(readAllowed ? {} : { reason: "permission_required" as const })
      };
    })
  };
}

export type DashboardAuthorizationLocation =
  | { kind: "selected"; module: DashboardFoundation["modules"][number] }
  | { kind: "forbidden"; module: DashboardFoundation["modules"][number] }
  | { kind: "coming_soon"; module: DashboardFoundation["modules"][number] }
  | { kind: "unknown" };

export function resolveDashboardAuthorizationLocation(
  pathname: string,
  foundation: DashboardFoundation
): DashboardAuthorizationLocation {
  // Selector-driven, backend-consistent: canonical exact > noncanonical
  // exact > prefix. Known coming-soon never surfaces as forbidden.
  const resolution = resolveDashboardFoundationRoute(pathname, foundation.modules);
  if (resolution.kind === "unknown") return { kind: "unknown" };
  const module = foundation.modules.find((entry) => entry.module === resolution.owner);
  if (!module) return { kind: "unknown" };
  if (module.status === "coming_soon") return { kind: "coming_soon", module };
  return module.readAllowed ? { kind: "selected", module } : { kind: "forbidden", module };
}

export function dashboardAuthorizationScopeLabel(scope: DashboardAuthorization["scope"]) {
  if (scope.kind === "global") return "全局";
  if (scope.kind === "mixed") return "混合范围";
  if (scope.kind === "dealer") return `${scope.dealerIds.length} 个经销商`;
  if (scope.kind === "location") return `${scope.dealerIds.length} 个经销商 / ${scope.locationIds.length} 个地点`;
  return "未配置";
}

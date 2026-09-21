export const DASHBOARD_F1_PHASE_B_ROUTES = Object.freeze({
  runtimeConfig: "/dashboard/runtime/config",
  runtimeFlags: "/dashboard/runtime/flags",
  analyticsReleasePrefix: "/dashboard/analytics/releases/",
} as const);

export type DashboardPhaseBCollectionState =
  | "ready"
  | "empty"
  | "unavailable"
  | "degraded";

export type DashboardAnalyticsIngestionState = "disabled" | "owned_conformance";

export const DASHBOARD_ANALYTICS_INGESTION_STATE: DashboardAnalyticsIngestionState =
  "disabled";

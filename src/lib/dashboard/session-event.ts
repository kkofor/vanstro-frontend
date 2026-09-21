export const DASHBOARD_SESSION_CHANGED_EVENT = "dashboard-session-changed" as const;

export type DashboardSessionState = "authenticated" | "anonymous";
export type DashboardSessionChangedDetail = { state: DashboardSessionState };

export function dispatchDashboardSessionChanged(state: DashboardSessionState) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<DashboardSessionChangedDetail>(DASHBOARD_SESSION_CHANGED_EVENT, {
    detail: { state }
  }));
}

export function subscribeToDashboardSessionChanged(
  listener: (detail: DashboardSessionChangedDetail) => void
) {
  if (typeof window === "undefined") return () => undefined;

  const handleEvent = (event: Event) => {
    listener((event as CustomEvent<DashboardSessionChangedDetail>).detail);
  };
  window.addEventListener(DASHBOARD_SESSION_CHANGED_EVENT, handleEvent);
  return () => window.removeEventListener(DASHBOARD_SESSION_CHANGED_EVENT, handleEvent);
}

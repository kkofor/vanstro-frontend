export type DashboardRequestIdentity = {
  generation: number;
  actorKey: string;
};

export function shouldPropagateDashboardAuthorizationError(readOnly: boolean, error: unknown) {
  return readOnly && typeof error === "object" && error !== null && "status" in error &&
    (error.status === 401 || error.status === 403);
}

export function createDashboardCommitGuard(
  request: DashboardRequestIdentity,
  getCurrent: () => DashboardRequestIdentity
) {
  return (write: () => void) => {
    const current = getCurrent();
    if (current.generation !== request.generation || current.actorKey !== request.actorKey) return false;
    write();
    return true;
  };
}

import { p09WorkerObservation, prisma, type P09WorkerObservation } from "@vanstro/db";

export type OperationalAlert = {
  key:
    | "erp_failed"
    | "erp_retry_wait"
    | "email_failed"
    | "email_retry_wait"
    | "contact_leads_new"
    | "dealer_applications_submitted"
    | "product_reviews_pending"
    | "support_handoffs_new"
    | "worker_stale"
    | "erp_pending_stale"
    | "email_pending_stale";
  severity: "critical" | "warning";
  title: string;
  count: number;
  actionPath:
    | "/dashboard/erp-sync-jobs"
    | "/dashboard/email/outbox"
    | "/dashboard/contact-leads"
    | "/dashboard/dealer-applications"
    | "/dashboard/product-reviews"
    | "/dashboard/support/handoffs"
    | "/dashboard/operations"
    | "/dashboard/erp-sync-jobs";
};

export function workerHeartbeatRequiresCriticalAlert(observation: Pick<P09WorkerObservation,
  "activeCount" | "staleCount" | "latestSucceededAt" | "latestFailedAt" | "latestErrorCode"
>): boolean {
  return observation.activeCount === 0n;
}

function queueAlert(
  alerts: OperationalAlert[],
  input: OperationalAlert
) {
  if (input.count > 0) alerts.push(input);
}

export async function getOperationalAlerts(): Promise<OperationalAlert[]> {
  const [
    failedErp,
    waitingErp,
    failedEmail,
    waitingEmail,
    newLeads,
    submittedApplications,
    pendingReviews,
    newHandoffs,
    workerHeartbeat,
    staleErpJobs,
    staleEmailItems
  ] = await Promise.all([
    prisma.erpSyncJob.count({ where: { status: "failed" } }),
    prisma.erpSyncJob.count({ where: { status: "retry_wait" } }),
    prisma.emailOutbox.count({ where: { status: "failed" } }),
    prisma.emailOutbox.count({ where: { status: "retry_wait" } }),
    prisma.contactLead.count({ where: { status: "new" } }),
    prisma.dealerApplication.count({ where: { status: "submitted" } }),
    prisma.productReview.count({ where: { status: "pending" } }),
    prisma.supportHandoff.count({ where: { status: "new" } }),
    p09WorkerObservation(prisma),
    prisma.erpSyncJob.count({
      where: {
        status: { in: ["pending", "retry_wait"] },
        createdAt: { lt: new Date(Date.now() - 15 * 60 * 1000) }
      }
    }),
    prisma.emailOutbox.count({
      where: {
        status: { in: ["pending", "retry_wait"] },
        createdAt: { lt: new Date(Date.now() - 15 * 60 * 1000) }
      }
    })
  ]);
  const alerts: OperationalAlert[] = [];

  queueAlert(alerts, {
    key: "erp_failed",
    severity: "critical",
    title: "ERP sync jobs need attention",
    count: failedErp,
    actionPath: "/dashboard/erp-sync-jobs"
  });
  queueAlert(alerts, {
    key: "erp_retry_wait",
    severity: "warning",
    title: "ERP sync jobs are waiting to retry",
    count: waitingErp,
    actionPath: "/dashboard/erp-sync-jobs"
  });
  queueAlert(alerts, {
    key: "email_failed",
    severity: "critical",
    title: "Email deliveries need attention",
    count: failedEmail,
    actionPath: "/dashboard/email/outbox"
  });
  queueAlert(alerts, {
    key: "email_retry_wait",
    severity: "warning",
    title: "Email deliveries are waiting to retry",
    count: waitingEmail,
    actionPath: "/dashboard/email/outbox"
  });
  queueAlert(alerts, {
    key: "contact_leads_new",
    severity: "warning",
    title: "New contact leads are waiting for review",
    count: newLeads,
    actionPath: "/dashboard/contact-leads"
  });
  queueAlert(alerts, {
    key: "dealer_applications_submitted",
    severity: "warning",
    title: "Dealer applications are waiting for review",
    count: submittedApplications,
    actionPath: "/dashboard/dealer-applications"
  });
  queueAlert(alerts, {
    key: "product_reviews_pending",
    severity: "warning",
    title: "Product reviews are waiting for moderation",
    count: pendingReviews,
    actionPath: "/dashboard/product-reviews"
  });
  queueAlert(alerts, {
    key: "support_handoffs_new",
    severity: "warning",
    title: "Support handoffs are waiting for follow-up",
    count: newHandoffs,
    actionPath: "/dashboard/support/handoffs"
  });
  const workerStale = workerHeartbeatRequiresCriticalAlert(workerHeartbeat);
  queueAlert(alerts, {
    key: "worker_stale",
    severity: "critical",
    title: "Worker heartbeat is stale",
    count: workerStale ? 1 : 0,
    actionPath: "/dashboard/operations"
  });
  queueAlert(alerts, {
    key: "erp_pending_stale",
    severity: "warning",
    title: "ERP jobs have been pending for more than 15 minutes",
    count: staleErpJobs,
    actionPath: "/dashboard/erp-sync-jobs"
  });
  queueAlert(alerts, {
    key: "email_pending_stale",
    severity: "critical",
    title: "Email items have been pending for more than 15 minutes",
    count: staleEmailItems,
    actionPath: "/dashboard/email/outbox"
  });

  return alerts;
}

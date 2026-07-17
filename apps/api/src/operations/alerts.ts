import { prisma } from "@vanstro/db";

export type OperationalAlert = {
  key: "erp_failed" | "erp_retry_wait" | "email_failed" | "email_retry_wait";
  severity: "critical" | "warning";
  title: string;
  count: number;
  actionPath: "/dashboard/erp-sync-jobs" | "/dashboard/email/outbox";
};

export async function getOperationalAlerts(): Promise<OperationalAlert[]> {
  const [failedErp, waitingErp, failedEmail, waitingEmail] = await Promise.all([
    prisma.erpSyncJob.count({ where: { status: "failed" } }),
    prisma.erpSyncJob.count({ where: { status: "retry_wait" } }),
    prisma.emailOutbox.count({ where: { status: "failed" } }),
    prisma.emailOutbox.count({ where: { status: "retry_wait" } })
  ]);
  const alerts: OperationalAlert[] = [];

  if (failedErp) {
    alerts.push({
      key: "erp_failed",
      severity: "critical",
      title: "ERP sync jobs need attention",
      count: failedErp,
      actionPath: "/dashboard/erp-sync-jobs"
    });
  }
  if (waitingErp) {
    alerts.push({
      key: "erp_retry_wait",
      severity: "warning",
      title: "ERP sync jobs are waiting to retry",
      count: waitingErp,
      actionPath: "/dashboard/erp-sync-jobs"
    });
  }
  if (failedEmail) {
    alerts.push({
      key: "email_failed",
      severity: "critical",
      title: "Email deliveries need attention",
      count: failedEmail,
      actionPath: "/dashboard/email/outbox"
    });
  }
  if (waitingEmail) {
    alerts.push({
      key: "email_retry_wait",
      severity: "warning",
      title: "Email deliveries are waiting to retry",
      count: waitingEmail,
      actionPath: "/dashboard/email/outbox"
    });
  }

  return alerts;
}

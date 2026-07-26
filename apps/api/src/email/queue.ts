import type { Prisma } from "@vanstro/db";

export type QueueEmailInput = {
  templateKey: string;
  toEmail: string;
  subject?: string;
  payload: Prisma.InputJsonObject;
};

function internalAlertEmail() {
  return process.env.INTERNAL_ALERT_EMAIL ?? "info@vanstro.ca";
}

export async function queueEmail(
  transaction: Prisma.TransactionClient,
  input: QueueEmailInput
) {
  await transaction.emailOutbox.create({
    data: {
      templateKey: input.templateKey,
      toEmail: input.toEmail,
      subject: input.subject,
      payload: input.payload
    }
  });
}

export async function queueInternalAlert(
  transaction: Prisma.TransactionClient,
  input: Omit<QueueEmailInput, "toEmail">
) {
  await queueEmail(transaction, {
    ...input,
    toEmail: internalAlertEmail()
  });
}

export async function queueCustomerEmail(
  transaction: Prisma.TransactionClient,
  input: Omit<QueueEmailInput, "toEmail"> & { toEmail: string }
) {
  const suppressed = await transaction.emailSuppressionList.findUnique({
    where: { email: input.toEmail.toLowerCase() }
  });
  if (suppressed) return;

  await queueEmail(transaction, {
    ...input,
    toEmail: input.toEmail.toLowerCase()
  });
}

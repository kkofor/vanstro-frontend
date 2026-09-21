ALTER TYPE "PaymentSessionStatus" ADD VALUE IF NOT EXISTS 'refund_processing' AFTER 'refund_pending';

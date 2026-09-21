ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'pending_payment';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'payment_expired';

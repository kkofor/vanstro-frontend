-- AlterTable
ALTER TABLE "payment_sessions" ADD COLUMN "shippingAddressLine1" TEXT,
ADD COLUMN "shippingAddressLine2" TEXT,
ADD COLUMN "shippingCity" TEXT,
ADD COLUMN "shippingProvince" TEXT,
ADD COLUMN "shippingPostalCode" TEXT,
ADD COLUMN "shippingCountry" TEXT DEFAULT 'CA';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "shippingAddressLine1" TEXT,
ADD COLUMN "shippingAddressLine2" TEXT,
ADD COLUMN "shippingCity" TEXT,
ADD COLUMN "shippingProvince" TEXT,
ADD COLUMN "shippingPostalCode" TEXT,
ADD COLUMN "shippingCountry" TEXT DEFAULT 'CA';

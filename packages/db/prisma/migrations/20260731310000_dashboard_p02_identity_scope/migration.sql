CREATE TYPE "DealerMembershipStatus" AS ENUM ('invited', 'active', 'suspended', 'revoked');
CREATE TYPE "DealerLocationStatus" AS ENUM ('active', 'inactive');

ALTER TABLE "dealer_locations"
ADD COLUMN "status" "DealerLocationStatus" NOT NULL DEFAULT 'active';

CREATE UNIQUE INDEX "dealer_locations_id_dealerId_key"
ON "dealer_locations"("id", "dealerId");

CREATE TABLE "dealer_memberships" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "dealerId" TEXT NOT NULL,
  "status" "DealerMembershipStatus" NOT NULL DEFAULT 'invited',
  "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdByUserId" TEXT,
  "revision" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "dealer_memberships_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "dealer_memberships_validity_check" CHECK ("expiresAt" IS NULL OR "expiresAt" > "validFrom"),
  CONSTRAINT "dealer_memberships_revocation_check" CHECK (
    ("status" = 'revoked' AND "revokedAt" IS NOT NULL)
    OR ("status" <> 'revoked' AND "revokedAt" IS NULL)
  ),
  CONSTRAINT "dealer_memberships_revision_check" CHECK ("revision" >= 0)
);

CREATE UNIQUE INDEX "dealer_memberships_userId_dealerId_key"
ON "dealer_memberships"("userId", "dealerId");
CREATE UNIQUE INDEX "dealer_memberships_id_dealerId_key"
ON "dealer_memberships"("id", "dealerId");
CREATE INDEX "dealer_memberships_userId_status_idx"
ON "dealer_memberships"("userId", "status");
CREATE INDEX "dealer_memberships_dealerId_status_idx"
ON "dealer_memberships"("dealerId", "status");

CREATE TABLE "dealer_membership_roles" (
  "membershipId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dealer_membership_roles_pkey" PRIMARY KEY ("membershipId", "roleId")
);

CREATE INDEX "dealer_membership_roles_roleId_idx"
ON "dealer_membership_roles"("roleId");

CREATE TABLE "dealer_membership_locations" (
  "membershipId" TEXT NOT NULL,
  "dealerId" TEXT NOT NULL,
  "dealerLocationId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dealer_membership_locations_pkey" PRIMARY KEY ("membershipId", "dealerLocationId")
);

CREATE INDEX "dealer_membership_locations_dealerLocationId_dealerId_idx"
ON "dealer_membership_locations"("dealerLocationId", "dealerId");

ALTER TABLE "dealer_memberships"
ADD CONSTRAINT "dealer_memberships_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dealer_memberships"
ADD CONSTRAINT "dealer_memberships_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "dealer_memberships"
ADD CONSTRAINT "dealer_memberships_dealerId_fkey"
FOREIGN KEY ("dealerId") REFERENCES "dealers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "dealer_membership_roles"
ADD CONSTRAINT "dealer_membership_roles_membershipId_fkey"
FOREIGN KEY ("membershipId") REFERENCES "dealer_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dealer_membership_roles"
ADD CONSTRAINT "dealer_membership_roles_roleId_fkey"
FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "dealer_membership_locations"
ADD CONSTRAINT "dealer_membership_locations_membershipId_dealerId_fkey"
FOREIGN KEY ("membershipId", "dealerId") REFERENCES "dealer_memberships"("id", "dealerId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dealer_membership_locations"
ADD CONSTRAINT "dealer_membership_locations_dealerLocationId_dealerId_fkey"
FOREIGN KEY ("dealerLocationId", "dealerId") REFERENCES "dealer_locations"("id", "dealerId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Migration: add_coupon_usedcount_redemption_status
-- Adds usedCount to Coupon for O(1) quota check (avoids full table scan)
-- Adds CouponRedemptionStatus enum and status field to CouponRedemption
-- Adds index on (couponId, status) for efficient active-redemption queries

-- 1. Create enum type
CREATE TYPE "CouponRedemptionStatus" AS ENUM ('ACTIVE', 'RELEASED');

-- 2. Add usedCount to Coupon (backfill from existing redemptions)
ALTER TABLE "Coupon" ADD COLUMN "usedCount" INTEGER NOT NULL DEFAULT 0;

-- Backfill usedCount from existing ACTIVE redemptions
UPDATE "Coupon" c
SET "usedCount" = (
  SELECT COUNT(*) FROM "CouponRedemption" cr WHERE cr."couponId" = c.id
);

-- 3. Add status to CouponRedemption
ALTER TABLE "CouponRedemption" ADD COLUMN "status" "CouponRedemptionStatus" NOT NULL DEFAULT 'ACTIVE';

-- 4. Add composite index for efficient active-redemption lookups
CREATE INDEX "CouponRedemption_couponId_status_idx" ON "CouponRedemption"("couponId", "status");

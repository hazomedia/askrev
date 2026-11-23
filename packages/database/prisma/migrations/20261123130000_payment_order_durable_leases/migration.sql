-- AlterEnum
ALTER TYPE "PaymentOrderStatus" ADD VALUE IF NOT EXISTS 'INVESTIGATION_REQUIRED';

-- AlterTable
ALTER TABLE "PaymentOrder" ADD COLUMN IF NOT EXISTS "lockedBy" TEXT,
ADD COLUMN IF NOT EXISTS "lockedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "leaseExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PaymentOrder_status_leaseExpiresAt_idx" ON "PaymentOrder"("status", "leaseExpiresAt");

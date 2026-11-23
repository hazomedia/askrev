-- AlterTable
ALTER TABLE "PaymentOrder" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "nextRetryAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "PaymentOrder_status_nextRetryAt_idx" ON "PaymentOrder"("status", "nextRetryAt");

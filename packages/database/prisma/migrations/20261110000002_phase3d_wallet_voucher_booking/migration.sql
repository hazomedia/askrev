-- AlterTable
ALTER TABLE "EvBooking" ADD COLUMN "voucherId" TEXT,
ADD COLUMN "cancellationReason" TEXT,
ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "journalEntryId" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "VoucherTransaction" ADD COLUMN "journalEntryId" TEXT,
ADD COLUMN "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "VoucherTransaction_idempotencyKey_key" ON "VoucherTransaction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "VoucherTransaction_referenceId_idx" ON "VoucherTransaction"("referenceId");

-- CreateIndex
CREATE INDEX "EvBooking_voucherId_idx" ON "EvBooking"("voucherId");

-- AddForeignKey
ALTER TABLE "EvBooking" ADD CONSTRAINT "EvBooking_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "ShoppingVoucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;


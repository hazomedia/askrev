-- AlterTable
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "availability" TEXT DEFAULT 'BOOKING_AVAILABLE';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Product_availability_idx" ON "Product"("availability");

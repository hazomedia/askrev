-- AlterTable
ALTER TABLE "BinaryPlacement" ADD COLUMN IF NOT EXISTS "cumulativeFlushedPairs" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "BinaryPlacement" ADD COLUMN IF NOT EXISTS "cumulativeFlushedPaise" BIGINT NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "CommissionHold" ADD COLUMN IF NOT EXISTS "reason" TEXT DEFAULT 'BASIC_HOLD_RESERVE';

-- AlterTable
ALTER TABLE "ShoppingVoucher" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'SHOPPING_VOUCHER';
ALTER TABLE "ShoppingVoucher" ADD COLUMN IF NOT EXISTS "emailSent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ShoppingVoucher" ADD COLUMN IF NOT EXISTS "emailSentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LegacyMatrixPlacement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "positionIndex" INTEGER NOT NULL,
    "matrixSequence" INTEGER NOT NULL,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegacyMatrixPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LegacyMatrixAuditLog" (
    "id" TEXT NOT NULL,
    "placementId" TEXT,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegacyMatrixAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "BinaryMatchFlush" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "matchDate" TEXT NOT NULL,
    "flushedPairs" INTEGER NOT NULL,
    "notionalMissedPaise" BIGINT NOT NULL,
    "previousCarryLeft" INTEGER NOT NULL,
    "previousCarryRight" INTEGER NOT NULL,
    "newCarryLeft" INTEGER NOT NULL,
    "newCarryRight" INTEGER NOT NULL,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BinaryMatchFlush_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "LegacyMatrixPlacement_userId_key" ON "LegacyMatrixPlacement"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "LegacyMatrixPlacement_matrixSequence_key" ON "LegacyMatrixPlacement"("matrixSequence");
CREATE UNIQUE INDEX IF NOT EXISTS "LegacyMatrixPlacement_parentId_positionIndex_key" ON "LegacyMatrixPlacement"("parentId", "positionIndex");
CREATE INDEX IF NOT EXISTS "LegacyMatrixPlacement_parentId_idx" ON "LegacyMatrixPlacement"("parentId");
CREATE INDEX IF NOT EXISTS "LegacyMatrixPlacement_depth_idx" ON "LegacyMatrixPlacement"("depth");
CREATE INDEX IF NOT EXISTS "LegacyMatrixPlacement_matrixSequence_idx" ON "LegacyMatrixPlacement"("matrixSequence");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LegacyMatrixAuditLog_userId_idx" ON "LegacyMatrixAuditLog"("userId");
CREATE INDEX IF NOT EXISTS "LegacyMatrixAuditLog_action_idx" ON "LegacyMatrixAuditLog"("action");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "BinaryMatchFlush_idempotencyKey_key" ON "BinaryMatchFlush"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "BinaryMatchFlush_userId_idx" ON "BinaryMatchFlush"("userId");
CREATE INDEX IF NOT EXISTS "BinaryMatchFlush_matchDate_idx" ON "BinaryMatchFlush"("matchDate");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'LegacyMatrixPlacement_userId_fkey'
    ) THEN
        ALTER TABLE "LegacyMatrixPlacement" ADD CONSTRAINT "LegacyMatrixPlacement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'LegacyMatrixPlacement_parentId_fkey'
    ) THEN
        ALTER TABLE "LegacyMatrixPlacement" ADD CONSTRAINT "LegacyMatrixPlacement_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "LegacyMatrixPlacement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'BinaryMatchFlush_userId_fkey'
    ) THEN
        ALTER TABLE "BinaryMatchFlush" ADD CONSTRAINT "BinaryMatchFlush_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

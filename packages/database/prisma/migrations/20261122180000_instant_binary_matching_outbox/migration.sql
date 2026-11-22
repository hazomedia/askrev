-- CreateTable
CREATE TABLE "BinaryMatchingOutbox" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "triggerReason" TEXT NOT NULL,
    "triggerUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "lastError" TEXT,
    "idempotencyKey" TEXT,
    "lockedBy" TEXT,
    "lockedAt" TIMESTAMP(3),
    "leaseExpiresAt" TIMESTAMP(3),
    "nextRetryAt" TIMESTAMP(3),
    "deadLetteredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BinaryMatchingOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BinaryMatchingOutbox_idempotencyKey_key" ON "BinaryMatchingOutbox"("idempotencyKey");

-- CreateIndex
CREATE INDEX "BinaryMatchingOutbox_status_nextRetryAt_createdAt_idx" ON "BinaryMatchingOutbox"("status", "nextRetryAt", "createdAt");

-- CreateIndex
CREATE INDEX "BinaryMatchingOutbox_status_leaseExpiresAt_idx" ON "BinaryMatchingOutbox"("status", "leaseExpiresAt");

-- CreateIndex
CREATE INDEX "BinaryMatchingOutbox_userId_idx" ON "BinaryMatchingOutbox"("userId");

-- AddForeignKey
ALTER TABLE "BinaryMatchingOutbox" ADD CONSTRAINT "BinaryMatchingOutbox_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

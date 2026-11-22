-- CreateTable
CREATE TABLE "BinaryMatchingOutbox" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "triggerReason" TEXT NOT NULL,
    "triggerUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "BinaryMatchingOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BinaryMatchingOutbox_idempotencyKey_key" ON "BinaryMatchingOutbox"("idempotencyKey");

-- CreateIndex
CREATE INDEX "BinaryMatchingOutbox_status_createdAt_idx" ON "BinaryMatchingOutbox"("status", "createdAt");

-- CreateIndex
CREATE INDEX "BinaryMatchingOutbox_userId_idx" ON "BinaryMatchingOutbox"("userId");

-- AddForeignKey
ALTER TABLE "BinaryMatchingOutbox" ADD CONSTRAINT "BinaryMatchingOutbox_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

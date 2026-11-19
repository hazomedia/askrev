-- AlterTable
ALTER TABLE "BinaryPlacement" ADD COLUMN     "dailyMatchesCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastMatchDate" TEXT,
ADD COLUMN     "matchedVolumeLeftPaise" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "matchedVolumeRightPaise" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "totalMatchesConsumed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalRewardEarnedPaise" BIGINT NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "EvBooking" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "twoFactorRecoveryCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "twoFactorSecret" TEXT;

-- CreateTable
CREATE TABLE "BinaryMatchEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "matchDate" TEXT NOT NULL,
    "matchesEvaluated" INTEGER NOT NULL,
    "matchesSettled" INTEGER NOT NULL,
    "cappedOutMatches" INTEGER NOT NULL,
    "leftUnitsUsed" INTEGER NOT NULL,
    "rightUnitsUsed" INTEGER NOT NULL,
    "previousCarryLeft" INTEGER NOT NULL,
    "previousCarryRight" INTEGER NOT NULL,
    "newCarryLeft" INTEGER NOT NULL,
    "newCarryRight" INTEGER NOT NULL,
    "rewardPaise" BIGINT NOT NULL,
    "isSimulated" BOOLEAN NOT NULL DEFAULT true,
    "journalEntryId" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BinaryMatchEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BinaryMatchEvent_idempotencyKey_key" ON "BinaryMatchEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "BinaryMatchEvent_userId_idx" ON "BinaryMatchEvent"("userId");

-- CreateIndex
CREATE INDEX "BinaryMatchEvent_matchDate_idx" ON "BinaryMatchEvent"("matchDate");

-- CreateIndex
CREATE INDEX "BinaryPlacement_parentId_idx" ON "BinaryPlacement"("parentId");

-- CreateIndex
CREATE INDEX "BinaryPlacement_leg_idx" ON "BinaryPlacement"("leg");

-- AddForeignKey
ALTER TABLE "BinaryMatchEvent" ADD CONSTRAINT "BinaryMatchEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migration: 20261121120000_member_auth_calculation_engine
-- Additive migration for Member Password Reset, Email Verification, Automated Binary Simulation, Configurable TDS, and Retail Qualification

-- 1. Alter User with email verification fields
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isEmailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);

-- 2. Create PasswordResetToken
CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_idx" ON "PasswordResetToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'PasswordResetToken_userId_fkey'
    ) THEN
        ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- 3. Create EmailVerificationToken
CREATE TABLE IF NOT EXISTS "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "EmailVerificationToken_tokenHash_idx" ON "EmailVerificationToken"("tokenHash");
CREATE INDEX IF NOT EXISTS "EmailVerificationToken_userId_idx" ON "EmailVerificationToken"("userId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'EmailVerificationToken_userId_fkey'
    ) THEN
        ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- 4. Create BinarySimulationRun
CREATE TABLE IF NOT EXISTS "BinarySimulationRun" (
    "id" TEXT NOT NULL,
    "runDate" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "nodesEvaluated" INTEGER NOT NULL DEFAULT 0,
    "nodesSettled" INTEGER NOT NULL DEFAULT 0,
    "pairsSettled" INTEGER NOT NULL DEFAULT 0,
    "totalRewardPaise" BIGINT NOT NULL DEFAULT 0,
    "executionMode" TEXT NOT NULL DEFAULT 'SIMULATION_ONLY',
    "isDryRun" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "triggeredBy" TEXT NOT NULL DEFAULT 'CRON_AUTOMATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BinarySimulationRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BinarySimulationRun_runDate_isDryRun_key" ON "BinarySimulationRun"("runDate", "isDryRun");
CREATE INDEX IF NOT EXISTS "BinarySimulationRun_runDate_idx" ON "BinarySimulationRun"("runDate");
CREATE INDEX IF NOT EXISTS "BinarySimulationRun_status_idx" ON "BinarySimulationRun"("status");

-- 5. Create TaxSimulationRule
CREATE TABLE IF NOT EXISTS "TaxSimulationRule" (
    "id" TEXT NOT NULL,
    "ruleIdentifier" TEXT NOT NULL,
    "ruleName" TEXT NOT NULL,
    "incomeCategory" TEXT NOT NULL,
    "taxRatePercent" DOUBLE PRECISION NOT NULL,
    "thresholdPaise" BIGINT NOT NULL DEFAULT 0,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "deductionEvent" TEXT NOT NULL DEFAULT 'ON_WALLET_CREDIT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "disclaimer" TEXT NOT NULL DEFAULT 'SIMULATED ESTIMATE ONLY: Not actual tax withheld or legal tax remittance.',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxSimulationRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TaxSimulationRule_ruleIdentifier_key" ON "TaxSimulationRule"("ruleIdentifier");
CREATE INDEX IF NOT EXISTS "TaxSimulationRule_ruleIdentifier_idx" ON "TaxSimulationRule"("ruleIdentifier");
CREATE INDEX IF NOT EXISTS "TaxSimulationRule_isActive_idx" ON "TaxSimulationRule"("isActive");

-- 6. Create TaxSimulationRecord
CREATE TABLE IF NOT EXISTS "TaxSimulationRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "referenceEventType" TEXT NOT NULL,
    "referenceEntityId" TEXT,
    "taxableGrossPaise" BIGINT NOT NULL,
    "simulatedDeductionPaise" BIGINT NOT NULL,
    "simulatedNetPaise" BIGINT NOT NULL,
    "appliedRatePercent" DOUBLE PRECISION NOT NULL,
    "isSimulated" BOOLEAN NOT NULL DEFAULT true,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxSimulationRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TaxSimulationRecord_idempotencyKey_key" ON "TaxSimulationRecord"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "TaxSimulationRecord_userId_idx" ON "TaxSimulationRecord"("userId");
CREATE INDEX IF NOT EXISTS "TaxSimulationRecord_ruleId_idx" ON "TaxSimulationRecord"("ruleId");
CREATE INDEX IF NOT EXISTS "TaxSimulationRecord_referenceEntityId_idx" ON "TaxSimulationRecord"("referenceEntityId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'TaxSimulationRecord_userId_fkey'
    ) THEN
        ALTER TABLE "TaxSimulationRecord" ADD CONSTRAINT "TaxSimulationRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'TaxSimulationRecord_ruleId_fkey'
    ) THEN
        ALTER TABLE "TaxSimulationRecord" ADD CONSTRAINT "TaxSimulationRecord_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "TaxSimulationRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- 7. Create RetailQualificationConfig
CREATE TABLE IF NOT EXISTS "RetailQualificationConfig" (
    "id" TEXT NOT NULL,
    "configKey" TEXT NOT NULL DEFAULT 'DEFAULT_RETAIL_QUALIFICATION',
    "qualificationThresholdPaise" BIGINT NOT NULL DEFAULT 6000000,
    "eligibleCategories" TEXT[] DEFAULT ARRAY['SCOOTER', 'BIKE', 'CYCLE', 'JEEP', 'UTILITY']::TEXT[],
    "includeVoucherRedemptions" BOOLEAN NOT NULL DEFAULT false,
    "evaluationPeriodDays" INTEGER,
    "allowRefundDeductions" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'PENDING_BUSINESS_APPROVAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetailQualificationConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RetailQualificationConfig_configKey_key" ON "RetailQualificationConfig"("configKey");

-- 8. Create RetailOrderRecord
CREATE TABLE IF NOT EXISTS "RetailOrderRecord" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderStatus" TEXT NOT NULL,
    "grossAmountPaise" BIGINT NOT NULL,
    "netCashPaidPaise" BIGINT NOT NULL,
    "voucherAppliedPaise" BIGINT NOT NULL DEFAULT 0,
    "productCategory" TEXT NOT NULL,
    "isEligibleForQualification" BOOLEAN NOT NULL DEFAULT true,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refundedAt" TIMESTAMP(3),
    "refundAmountPaise" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetailOrderRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RetailOrderRecord_orderNumber_key" ON "RetailOrderRecord"("orderNumber");
CREATE INDEX IF NOT EXISTS "RetailOrderRecord_userId_idx" ON "RetailOrderRecord"("userId");
CREATE INDEX IF NOT EXISTS "RetailOrderRecord_orderNumber_idx" ON "RetailOrderRecord"("orderNumber");
CREATE INDEX IF NOT EXISTS "RetailOrderRecord_orderStatus_idx" ON "RetailOrderRecord"("orderStatus");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'RetailOrderRecord_userId_fkey'
    ) THEN
        ALTER TABLE "RetailOrderRecord" ADD CONSTRAINT "RetailOrderRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- 9. Create RetailQualificationEvent
CREATE TABLE IF NOT EXISTS "RetailQualificationEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalQualifyingSpendPaise" BIGINT NOT NULL,
    "thresholdAppliedPaise" BIGINT NOT NULL,
    "qualifyingOrderIds" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'SIMULATION_PREVIEW',
    "isSimulated" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetailQualificationEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RetailQualificationEvent_userId_idx" ON "RetailQualificationEvent"("userId");
CREATE INDEX IF NOT EXISTS "RetailQualificationEvent_status_idx" ON "RetailQualificationEvent"("status");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'RetailQualificationEvent_userId_fkey'
    ) THEN
        ALTER TABLE "RetailQualificationEvent" ADD CONSTRAINT "RetailQualificationEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

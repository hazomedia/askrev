-- AlterTable
ALTER TABLE "PaymentConfig" ADD COLUMN IF NOT EXISTS "upiEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "PaymentConfig" ADD COLUMN IF NOT EXISTS "manualReviewRequired" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE IF NOT EXISTS "PaymentGatewayConfig" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isSandbox" BOOLEAN NOT NULL DEFAULT true,
    "merchantId" TEXT,
    "encryptedSecretKey" TEXT,
    "encryptedWebhookKey" TEXT,
    "webhookUrl" TEXT,
    "webhookVerifiedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'CONFIGURATION_ONLY',
    "lastTestedAt" TIMESTAMP(3),
    "lastTestStatus" TEXT,
    "lastTestMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentGatewayConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PaymentGatewayLog" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "orderId" TEXT,
    "paymentId" TEXT,
    "referenceId" TEXT,
    "amountPaise" BIGINT,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "rawPayload" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentGatewayLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentGatewayConfig_provider_key" ON "PaymentGatewayConfig"("provider");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PaymentGatewayConfig_provider_idx" ON "PaymentGatewayConfig"("provider");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PaymentGatewayConfig_isEnabled_idx" ON "PaymentGatewayConfig"("isEnabled");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PaymentGatewayLog_provider_idx" ON "PaymentGatewayLog"("provider");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PaymentGatewayLog_orderId_idx" ON "PaymentGatewayLog"("orderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PaymentGatewayLog_paymentId_idx" ON "PaymentGatewayLog"("paymentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PaymentGatewayLog_status_idx" ON "PaymentGatewayLog"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PaymentGatewayLog_createdAt_idx" ON "PaymentGatewayLog"("createdAt");

-- CreateTable
CREATE TABLE "PaymentConfig" (
    "id" TEXT NOT NULL,
    "configKey" TEXT NOT NULL DEFAULT 'DEFAULT_PAYMENT_CONFIG',
    "merchantUpiVpa" TEXT,
    "merchantName" TEXT DEFAULT 'ASKR EV Mobility',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentConfig_configKey_key" ON "PaymentConfig"("configKey");

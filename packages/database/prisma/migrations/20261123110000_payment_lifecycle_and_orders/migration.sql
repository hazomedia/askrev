-- CreateEnum
CREATE TYPE "PaymentOrderStatus" AS ENUM ('CREATED', 'PROCESSING', 'VERIFIED', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateTable
CREATE TABLE "PaymentOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "requestType" "MembershipRequestType" NOT NULL,
    "merchantReference" TEXT NOT NULL,
    "providerOrderId" TEXT,
    "providerPaymentId" TEXT,
    "amountPaise" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentOrderStatus" NOT NULL DEFAULT 'CREATED',
    "clientPayload" JSONB,
    "rawResponse" JSONB,
    "reconciledAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "membershipRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedWebhookEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "orderId" TEXT,
    "paymentId" TEXT,
    "status" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOrder_merchantReference_key" ON "PaymentOrder"("merchantReference");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOrder_providerOrderId_key" ON "PaymentOrder"("providerOrderId");

-- CreateIndex
CREATE INDEX "PaymentOrder_userId_idx" ON "PaymentOrder"("userId");

-- CreateIndex
CREATE INDEX "PaymentOrder_provider_idx" ON "PaymentOrder"("provider");

-- CreateIndex
CREATE INDEX "PaymentOrder_status_idx" ON "PaymentOrder"("status");

-- CreateIndex
CREATE INDEX "PaymentOrder_providerOrderId_idx" ON "PaymentOrder"("providerOrderId");

-- CreateIndex
CREATE INDEX "PaymentOrder_merchantReference_idx" ON "PaymentOrder"("merchantReference");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedWebhookEvent_eventId_key" ON "ProcessedWebhookEvent"("eventId");

-- CreateIndex
CREATE INDEX "ProcessedWebhookEvent_provider_eventId_idx" ON "ProcessedWebhookEvent"("provider", "eventId");

-- CreateIndex
CREATE INDEX "ProcessedWebhookEvent_orderId_idx" ON "ProcessedWebhookEvent"("orderId");

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

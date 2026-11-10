-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN_OPERATIONS', 'FINANCE_MANAGER', 'MEMBER', 'FREE_USER');

-- CreateEnum
CREATE TYPE "MembershipPackage" AS ENUM ('FREE', 'BASIC', 'FULL');

-- CreateEnum
CREATE TYPE "QualificationMethod" AS ENUM ('DIRECT_FULL', 'UPGRADE_PAYMENT', 'UPGRADE_SHOPPING');

-- CreateEnum
CREATE TYPE "BinaryLeg" AS ENUM ('LEFT', 'RIGHT');

-- CreateEnum
CREATE TYPE "MembershipRequestType" AS ENUM ('BASIC_ACTIVATION', 'FULL_ACTIVATION', 'BASIC_TO_FULL_UPGRADE');

-- CreateEnum
CREATE TYPE "MembershipRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'FREE_USER',
    "currentPackage" "MembershipPackage" NOT NULL DEFAULT 'FREE',
    "isFullQualified" BOOLEAN NOT NULL DEFAULT false,
    "qualificationMethod" "QualificationMethod",
    "qualificationDate" TIMESTAMP(3),
    "sponsorId" TEXT,
    "refreshTokenHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BinaryPlacement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "leg" "BinaryLeg",
    "leftCount" INTEGER NOT NULL DEFAULT 0,
    "rightCount" INTEGER NOT NULL DEFAULT 0,
    "leftVolumePaise" BIGINT NOT NULL DEFAULT 0,
    "rightVolumePaise" BIGINT NOT NULL DEFAULT 0,
    "carryLeftPaise" BIGINT NOT NULL DEFAULT 0,
    "carryRightPaise" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BinaryPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "availableEarningsPaise" BIGINT NOT NULL DEFAULT 0,
    "heldCommissionsPaise" BIGINT NOT NULL DEFAULT 0,
    "pendingRecoveryPaise" BIGINT NOT NULL DEFAULT 0,
    "shoppingVoucherBalancePaise" BIGINT NOT NULL DEFAULT 0,
    "totalEarnedPaise" BIGINT NOT NULL DEFAULT 0,
    "totalWithdrawnPaise" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "narration" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalLine" (
    "id" TEXT NOT NULL,
    "journalEntryId" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "userId" TEXT,
    "debitPaise" BIGINT NOT NULL DEFAULT 0,
    "creditPaise" BIGINT NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionHold" (
    "id" TEXT NOT NULL,
    "sponsorId" TEXT NOT NULL,
    "referredMemberId" TEXT NOT NULL,
    "heldAmountPaise" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'HELD',
    "releasedAt" TIMESTAMP(3),
    "releaseTransactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionHold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingRecovery" (
    "id" TEXT NOT NULL,
    "sponsorId" TEXT NOT NULL,
    "referredMemberId" TEXT NOT NULL,
    "recoveryAmountPaise" BIGINT NOT NULL,
    "recoveredPaise" BIGINT NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingRecovery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShoppingVoucher" (
    "id" TEXT NOT NULL,
    "voucherCode" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "initialValuePaise" BIGINT NOT NULL,
    "remainingBalancePaise" BIGINT NOT NULL,
    "issuedReason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShoppingVoucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoucherTransaction" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "transactionType" TEXT NOT NULL,
    "referenceId" TEXT,
    "balanceAfterPaise" BIGINT NOT NULL,
    "narration" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoucherTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualificationEvent" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "sponsorId" TEXT,
    "qualificationMethod" "QualificationMethod" NOT NULL,
    "qualificationOrderForSponsor" INTEGER,
    "feePaidPaise" BIGINT NOT NULL DEFAULT 0,
    "voucherIssuedPaise" BIGINT NOT NULL DEFAULT 0,
    "walletCreditedPaise" BIGINT NOT NULL DEFAULT 0,
    "holdReleasedPaise" BIGINT NOT NULL DEFAULT 0,
    "commissionRecoveredPaise" BIGINT NOT NULL DEFAULT 0,
    "unfundedRecoveryPaise" BIGINT NOT NULL DEFAULT 0,
    "journalEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QualificationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvBike" (
    "id" TEXT NOT NULL,
    "modelCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "batteryCapacityKwh" DOUBLE PRECISION NOT NULL,
    "rangeKm" INTEGER NOT NULL,
    "topSpeedKmh" INTEGER NOT NULL,
    "chargingTimeHours" DOUBLE PRECISION NOT NULL,
    "exShowroomPricePaise" BIGINT NOT NULL,
    "bookingAmountPaise" BIGINT NOT NULL,
    "voucherRedeemLimitPaise" BIGINT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvBike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvBooking" (
    "id" TEXT NOT NULL,
    "bookingNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bikeId" TEXT NOT NULL,
    "bookingAmountPaise" BIGINT NOT NULL,
    "voucherAppliedPaise" BIGINT NOT NULL DEFAULT 0,
    "netCashPaidPaise" BIGINT NOT NULL,
    "bookingStatus" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "paymentReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WithdrawalRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "bankDetails" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WithdrawalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestType" "MembershipRequestType" NOT NULL,
    "feePaise" BIGINT NOT NULL,
    "paymentMode" TEXT NOT NULL DEFAULT 'SIMULATED_TEST',
    "paymentReference" TEXT,
    "status" "MembershipRequestStatus" NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "idempotencyKey" TEXT,
    "isSimulated" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_memberId_key" ON "User"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_memberId_idx" ON "User"("memberId");

-- CreateIndex
CREATE INDEX "User_sponsorId_idx" ON "User"("sponsorId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "BinaryPlacement_userId_key" ON "BinaryPlacement"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletAccount_userId_key" ON "WalletAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntry_referenceId_key" ON "JournalEntry"("referenceId");

-- CreateIndex
CREATE INDEX "JournalEntry_referenceId_idx" ON "JournalEntry"("referenceId");

-- CreateIndex
CREATE INDEX "JournalEntry_eventType_idx" ON "JournalEntry"("eventType");

-- CreateIndex
CREATE INDEX "JournalLine_journalEntryId_idx" ON "JournalLine"("journalEntryId");

-- CreateIndex
CREATE INDEX "JournalLine_account_idx" ON "JournalLine"("account");

-- CreateIndex
CREATE INDEX "JournalLine_userId_idx" ON "JournalLine"("userId");

-- CreateIndex
CREATE INDEX "CommissionHold_sponsorId_idx" ON "CommissionHold"("sponsorId");

-- CreateIndex
CREATE INDEX "CommissionHold_referredMemberId_idx" ON "CommissionHold"("referredMemberId");

-- CreateIndex
CREATE INDEX "PendingRecovery_sponsorId_idx" ON "PendingRecovery"("sponsorId");

-- CreateIndex
CREATE INDEX "PendingRecovery_referredMemberId_idx" ON "PendingRecovery"("referredMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "ShoppingVoucher_voucherCode_key" ON "ShoppingVoucher"("voucherCode");

-- CreateIndex
CREATE INDEX "ShoppingVoucher_voucherCode_idx" ON "ShoppingVoucher"("voucherCode");

-- CreateIndex
CREATE INDEX "ShoppingVoucher_userId_idx" ON "ShoppingVoucher"("userId");

-- CreateIndex
CREATE INDEX "VoucherTransaction_voucherId_idx" ON "VoucherTransaction"("voucherId");

-- CreateIndex
CREATE INDEX "VoucherTransaction_transactionType_idx" ON "VoucherTransaction"("transactionType");

-- CreateIndex
CREATE INDEX "QualificationEvent_memberId_idx" ON "QualificationEvent"("memberId");

-- CreateIndex
CREATE INDEX "QualificationEvent_sponsorId_idx" ON "QualificationEvent"("sponsorId");

-- CreateIndex
CREATE UNIQUE INDEX "EvBike_modelCode_key" ON "EvBike"("modelCode");

-- CreateIndex
CREATE UNIQUE INDEX "EvBooking_bookingNumber_key" ON "EvBooking"("bookingNumber");

-- CreateIndex
CREATE INDEX "EvBooking_userId_idx" ON "EvBooking"("userId");

-- CreateIndex
CREATE INDEX "EvBooking_bookingNumber_idx" ON "EvBooking"("bookingNumber");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_userId_idx" ON "WithdrawalRequest"("userId");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_status_idx" ON "WithdrawalRequest"("status");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_idx" ON "AuditLog"("entityType");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipRequest_idempotencyKey_key" ON "MembershipRequest"("idempotencyKey");

-- CreateIndex
CREATE INDEX "MembershipRequest_userId_idx" ON "MembershipRequest"("userId");

-- CreateIndex
CREATE INDEX "MembershipRequest_status_idx" ON "MembershipRequest"("status");

-- CreateIndex
CREATE INDEX "MembershipRequest_requestType_idx" ON "MembershipRequest"("requestType");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BinaryPlacement" ADD CONSTRAINT "BinaryPlacement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletAccount" ADD CONSTRAINT "WalletAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingVoucher" ADD CONSTRAINT "ShoppingVoucher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherTransaction" ADD CONSTRAINT "VoucherTransaction_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "ShoppingVoucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvBooking" ADD CONSTRAINT "EvBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvBooking" ADD CONSTRAINT "EvBooking_bikeId_fkey" FOREIGN KEY ("bikeId") REFERENCES "EvBike"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipRequest" ADD CONSTRAINT "MembershipRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


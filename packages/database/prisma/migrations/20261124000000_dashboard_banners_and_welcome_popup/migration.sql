-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "PopupFrequency" AS ENUM ('ONCE_PER_CAMPAIGN', 'ONCE_DAILY', 'EVERY_VISIT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "BannerStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'DISABLED', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "DashboardTopBanner" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "badgeText" TEXT,
    "desktopImageUrl" TEXT NOT NULL,
    "mobileImageUrl" TEXT,
    "linkUrl" TEXT,
    "altText" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardTopBanner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PopupCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "subheading" TEXT,
    "message" TEXT NOT NULL,
    "buttonText" TEXT NOT NULL DEFAULT 'EXPLORE DASHBOARD',
    "buttonLink" TEXT NOT NULL DEFAULT '/dashboard',
    "footerText" TEXT DEFAULT 'SMART MOBILITY • CONNECTED FUTURE',
    "imageUrl" TEXT,
    "frequency" "PopupFrequency" NOT NULL DEFAULT 'ONCE_PER_CAMPAIGN',
    "status" "BannerStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PopupCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PopupDismissal" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenDate" TEXT,

    CONSTRAINT "PopupDismissal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PopupCampaign_status_idx" ON "PopupCampaign"("status");
CREATE INDEX IF NOT EXISTS "PopupCampaign_startDate_idx" ON "PopupCampaign"("startDate");
CREATE INDEX IF NOT EXISTS "PopupCampaign_endDate_idx" ON "PopupCampaign"("endDate");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PopupDismissal_campaignId_userId_key" ON "PopupDismissal"("campaignId", "userId");
CREATE INDEX IF NOT EXISTS "PopupDismissal_userId_idx" ON "PopupDismissal"("userId");
CREATE INDEX IF NOT EXISTS "PopupDismissal_campaignId_idx" ON "PopupDismissal"("campaignId");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "PopupDismissal" ADD CONSTRAINT "PopupDismissal_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "PopupCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "PopupDismissal" ADD CONSTRAINT "PopupDismissal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

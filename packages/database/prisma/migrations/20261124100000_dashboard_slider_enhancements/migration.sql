-- AlterTable: Add multi-slide carousel capabilities to DashboardTopBanner
ALTER TABLE "DashboardTopBanner" ADD COLUMN IF NOT EXISTS "subtitle" TEXT;
ALTER TABLE "DashboardTopBanner" ADD COLUMN IF NOT EXISTS "buttonText" TEXT;
ALTER TABLE "DashboardTopBanner" ADD COLUMN IF NOT EXISTS "displayOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "DashboardTopBanner" ADD COLUMN IF NOT EXISTS "status" "BannerStatus" NOT NULL DEFAULT 'PUBLISHED';
ALTER TABLE "DashboardTopBanner" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);
ALTER TABLE "DashboardTopBanner" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3);
ALTER TABLE "DashboardTopBanner" ADD COLUMN IF NOT EXISTS "autoplayInterval" INTEGER NOT NULL DEFAULT 5000;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DashboardTopBanner_status_idx" ON "DashboardTopBanner"("status");
CREATE INDEX IF NOT EXISTS "DashboardTopBanner_displayOrder_idx" ON "DashboardTopBanner"("displayOrder");

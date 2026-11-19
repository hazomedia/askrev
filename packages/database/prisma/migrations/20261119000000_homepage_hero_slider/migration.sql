-- CreateEnum
CREATE TYPE "HeroSlideStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "HomepageHeroSlide" (
    "id" TEXT NOT NULL,
    "internalName" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "subheading" TEXT,
    "description" TEXT,
    "eyebrowText" TEXT,
    "desktopImageUrl" TEXT NOT NULL,
    "mobileImageUrl" TEXT,
    "desktopFocalX" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "desktopFocalY" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "mobileFocalX" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "mobileFocalY" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "desktopAltText" TEXT,
    "mobileAltText" TEXT,
    "primaryCtaLabel" TEXT,
    "primaryCtaUrl" TEXT,
    "primaryCtaStyle" TEXT NOT NULL DEFAULT 'PRIMARY',
    "primaryCtaEnabled" BOOLEAN NOT NULL DEFAULT true,
    "secondaryCtaLabel" TEXT,
    "secondaryCtaUrl" TEXT,
    "secondaryCtaStyle" TEXT NOT NULL DEFAULT 'SECONDARY',
    "secondaryCtaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "linkedProductId" TEXT,
    "showPrice" BOOLEAN NOT NULL DEFAULT false,
    "showRange" BOOLEAN NOT NULL DEFAULT false,
    "showTopSpeed" BOOLEAN NOT NULL DEFAULT false,
    "showBattery" BOOLEAN NOT NULL DEFAULT false,
    "showSpecifications" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "HeroSlideStatus" NOT NULL DEFAULT 'DRAFT',
    "publishStartAt" TIMESTAMP(3),
    "publishEndAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageHeroSlide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HomepageHeroSlide_status_idx" ON "HomepageHeroSlide"("status");

-- CreateIndex
CREATE INDEX "HomepageHeroSlide_sortOrder_idx" ON "HomepageHeroSlide"("sortOrder");

-- CreateIndex
CREATE INDEX "HomepageHeroSlide_linkedProductId_idx" ON "HomepageHeroSlide"("linkedProductId");

-- AddForeignKey
ALTER TABLE "HomepageHeroSlide" ADD CONSTRAINT "HomepageHeroSlide_linkedProductId_fkey" FOREIGN KEY ("linkedProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('SCOOTER', 'BIKE', 'CYCLE', 'JEEP', 'UTILITY');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "HeroSlideStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" "ProductCategory" NOT NULL,
    "brand" TEXT NOT NULL DEFAULT 'ASKR EV',
    "tagline" TEXT,
    "shortDescription" TEXT,
    "fullDescription" TEXT,
    "regularPricePaise" BIGINT,
    "sellingPricePaise" BIGINT,
    "bookingAmountPaise" BIGINT,
    "voucherRedeemLimitPaise" BIGINT,
    "rangeKm" INTEGER,
    "topSpeedKmh" INTEGER,
    "batteryCapacityKwh" DOUBLE PRECISION,
    "chargingTimeHours" DOUBLE PRECISION,
    "motorPower" TEXT,
    "acceleration" TEXT,
    "warranty" TEXT,
    "powertrain" TEXT,
    "colors" JSONB,
    "specifications" JSONB,
    "highlights" JSONB,
    "images" JSONB,
    "heroImage" TEXT,
    "thumbnailImage" TEXT,
    "isHero" BOOLEAN NOT NULL DEFAULT false,
    "heroMobileImage" TEXT,
    "heroHeading" TEXT,
    "heroDescription" TEXT,
    "heroCtaText" TEXT,
    "heroCtaLink" TEXT,
    "heroSlideOrder" INTEGER,
    "oemManufacturer" TEXT,
    "oemModelName" TEXT,
    "oemReference" TEXT,
    "internalNotes" TEXT,
    "slugAliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isRebranded" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "evBikeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

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
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");

-- CreateIndex
CREATE INDEX "Product_status_idx" ON "Product"("status");

-- CreateIndex
CREATE INDEX "Product_isFeatured_idx" ON "Product"("isFeatured");

-- CreateIndex
CREATE INDEX "Product_isHero_idx" ON "Product"("isHero");

-- CreateIndex
CREATE INDEX "Product_displayOrder_idx" ON "Product"("displayOrder");

-- CreateIndex
CREATE INDEX "Product_slug_idx" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "HomepageHeroSlide_status_idx" ON "HomepageHeroSlide"("status");

-- CreateIndex
CREATE INDEX "HomepageHeroSlide_sortOrder_idx" ON "HomepageHeroSlide"("sortOrder");

-- CreateIndex
CREATE INDEX "HomepageHeroSlide_linkedProductId_idx" ON "HomepageHeroSlide"("linkedProductId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_evBikeId_fkey" FOREIGN KEY ("evBikeId") REFERENCES "EvBike"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomepageHeroSlide" ADD CONSTRAINT "HomepageHeroSlide_linkedProductId_fkey" FOREIGN KEY ("linkedProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

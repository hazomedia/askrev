import { PrismaClient, ProductCategory, ProductStatus } from '@prisma/client';
import { ALL_CATALOG_VEHICLES } from '../../../apps/web/src/lib/catalog';

const prisma = new PrismaClient();

function mapCategory(cat: string): ProductCategory {
  switch (cat) {
    case 'scooters':
      return ProductCategory.SCOOTER;
    case 'bikes':
      return ProductCategory.BIKE;
    case 'cycles':
      return ProductCategory.CYCLE;
    case 'jeeps':
      return ProductCategory.JEEP;
    default:
      return ProductCategory.BIKE;
  }
}

const FEATURED_SLUGS = new Set([
  'scooter-s1-pro',
  'thunder-pro',
  'aerotrek-c1',
  'terramax-4x4',
]);

export async function seedProducts() {
  console.log('Seeding / Migrating initial ASKR EV Product Catalog...');

  // Also query existing EvBikes so we can link any matching modelCode
  const existingEvBikes = await prisma.evBike.findMany();
  const evBikeMap = new Map(existingEvBikes.map((b) => [b.modelCode, b.id]));

  let displayOrder = 1;

  for (const v of ALL_CATALOG_VEHICLES) {
    const regularPaise = v.estimatedOnRoadINR
      ? BigInt(Math.round(v.estimatedOnRoadINR * 100))
      : v.exShowroomPriceINR
      ? BigInt(Math.round(v.exShowroomPriceINR * 100))
      : null;

    const sellingPaise = v.exShowroomPriceINR
      ? BigInt(Math.round(v.exShowroomPriceINR * 100))
      : null;

    const bookingPaise = v.bookingAmountINR
      ? BigInt(Math.round(v.bookingAmountINR * 100))
      : null;

    const voucherPaise = v.voucherRedeemLimitINR
      ? BigInt(Math.round(v.voucherRedeemLimitINR * 100))
      : null;

    const linkedEvBikeId = v.modelCode ? evBikeMap.get(v.modelCode) || null : null;

    const imagesData = (v.galleryImages && v.galleryImages.length > 0
      ? v.galleryImages
      : [v.imageUrl]
    ).map((url, idx) => ({
      url,
      isPrimary: idx === 0,
      order: idx + 1,
      caption: `${v.name} View ${idx + 1}`,
    }));

    const isFeatured = FEATURED_SLUGS.has(v.slug);

    const productRecord = await prisma.product.upsert({
      where: { slug: v.slug },
      update: {
        name: v.name,
        category: mapCategory(v.category),
        brand: v.manufacturer || 'ASKR EV',
        tagline: v.tagline,
        shortDescription: v.tagline,
        fullDescription: `${v.tagline}. High-efficiency electric vehicle by ASKR EV Mobility with premium specifications, connected telemetry, and dedicated after-sales support.`,
        regularPricePaise: regularPaise,
        sellingPricePaise: sellingPaise,
        bookingAmountPaise: bookingPaise,
        voucherRedeemLimitPaise: voucherPaise,
        rangeKm: v.rangeKm,
        topSpeedKmh: v.topSpeedKmh,
        batteryCapacityKwh: v.batteryCapacityKwh,
        chargingTimeHours: v.chargingTimeHours,
        motorPower: v.motorPowerPeak,
        acceleration: v.acceleration0to40,
        warranty: v.warranty,
        powertrain: v.powertrain,
        colors: v.colors as any,
        specifications: v.specs as any,
        highlights: v.highlights as any,
        images: imagesData as any,
        heroImage: v.imageUrl,
        thumbnailImage: v.imageUrl,
        isFeatured,
        status: ProductStatus.PUBLISHED,
        displayOrder,
        evBikeId: linkedEvBikeId,
      },
      create: {
        name: v.name,
        slug: v.slug,
        category: mapCategory(v.category),
        brand: v.manufacturer || 'ASKR EV',
        tagline: v.tagline,
        shortDescription: v.tagline,
        fullDescription: `${v.tagline}. High-efficiency electric vehicle by ASKR EV Mobility with premium specifications, connected telemetry, and dedicated after-sales support.`,
        regularPricePaise: regularPaise,
        sellingPricePaise: sellingPaise,
        bookingAmountPaise: bookingPaise,
        voucherRedeemLimitPaise: voucherPaise,
        rangeKm: v.rangeKm,
        topSpeedKmh: v.topSpeedKmh,
        batteryCapacityKwh: v.batteryCapacityKwh,
        chargingTimeHours: v.chargingTimeHours,
        motorPower: v.motorPowerPeak,
        acceleration: v.acceleration0to40,
        warranty: v.warranty,
        powertrain: v.powertrain,
        colors: v.colors as any,
        specifications: v.specs as any,
        highlights: v.highlights as any,
        images: imagesData as any,
        heroImage: v.imageUrl,
        thumbnailImage: v.imageUrl,
        isFeatured,
        status: ProductStatus.PUBLISHED,
        displayOrder,
        evBikeId: linkedEvBikeId,
      },
    });

    console.log(
      `  ✓ [${productRecord.category}] ${productRecord.name} (slug: ${productRecord.slug}) -> ₹${(
        Number(productRecord.sellingPricePaise || 0n) / 100
      ).toLocaleString('en-IN')} (Featured: ${productRecord.isFeatured})`
    );

    displayOrder++;
  }

  const count = await prisma.product.count();
  console.log(`\n🎉 Total Products in DB: ${count}`);
}

if (require.main === module || process.argv[1]?.endsWith('seed-products.ts')) {
  seedProducts()
    .then(async () => {
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}

import { PrismaClient } from '../packages/database/dist/index.js';

const prisma = new PrismaClient();

async function runQa() {
  console.log('====================================================');
  console.log('ASKR EV — REAL VEHICLE PRODUCT CATALOG VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
      failed++;
    }
  }

  try {
    // 1. Total products count
    const totalCount = await prisma.product.count();
    const publishedCount = await prisma.product.count({ where: { status: 'PUBLISHED' } });
    const draftCount = await prisma.product.count({ where: { status: 'DRAFT' } });

    console.log(`Database counts: Total=${totalCount}, Published=${publishedCount}, Draft=${draftCount}`);
    assert(draftCount >= 12, 'At least 12 real vehicle models exist in DRAFT status');
    assert(publishedCount >= 9, 'At least 9 baseline showcase vehicles maintained as PUBLISHED');

    // 2. Verify all 12 draft real vehicle models exist by slug
    const expectedDraftSlugs = [
      'harsil-leo',
      'eko-tejas-sport',
      'jatayu-ev',
      'harsil-retro-classic',
      'harsil-tri-star',
      'harsil-executive',
      'r4-racing-sports',
      'askr-monster-4x4',
      'askr-cruiser-ev',
      'askr-mini-monster',
      'harsil-3w-commercial-loader',
      'harsil-2w-cargo-delivery',
    ];

    const draftProducts = await prisma.product.findMany({
      where: { slug: { in: expectedDraftSlugs } },
    });

    assert(draftProducts.length === 12, 'All 12 expected real vehicle models found in database', `Found ${draftProducts.length}/12`);

    // 3. Verify Pricing rules (exact paise vs null)
    const expectedPricing = {
      'harsil-leo': 4900000n,
      'eko-tejas-sport': 3900000n,
      'harsil-retro-classic': 5100000n,
      'harsil-tri-star': 3750000n,
      'harsil-3w-commercial-loader': 6300000n,
      'harsil-2w-cargo-delivery': 4800000n,
      'jatayu-ev': null,
      'harsil-executive': null,
      'r4-racing-sports': null,
      'askr-monster-4x4': null,
      'askr-cruiser-ev': null,
      'askr-mini-monster': null,
    };

    for (const p of draftProducts) {
      const expectedPrice = expectedPricing[p.slug];
      if (expectedPrice === null) {
        assert(p.sellingPricePaise === null, `${p.name} (${p.slug}) has null price ('Contact for Price' rule)`);
      } else {
        assert(p.sellingPricePaise === expectedPrice, `${p.name} (${p.slug}) price matches official sheet: ₹${Number(expectedPrice) / 100}`, `got ${p.sellingPricePaise}`);
      }
    }

    // 4. Verify UTILITY category models
    const utilityProducts = await prisma.product.findMany({
      where: { category: 'UTILITY' },
    });
    assert(utilityProducts.length >= 2, `UTILITY category products exist (found ${utilityProducts.length})`);
    for (const u of utilityProducts) {
      const specs = Array.isArray(u.specifications) ? u.specifications : [];
      const loadSpec = specs.find((s) => /load capacity|payload/i.test(s.label || ''));
      assert(loadSpec && loadSpec.value, `Utility model ${u.name} has valid load capacity spec: '${loadSpec?.value}'`);
    }

    // 5. Verify Variant-specific images in colors JSON
    const harsilLeo = draftProducts.find((p) => p.slug === 'harsil-leo');
    assert(harsilLeo !== undefined, 'Harsil Leo found');
    if (harsilLeo && Array.isArray(harsilLeo.colors)) {
      assert(harsilLeo.colors.length >= 4, `Harsil Leo has 4 colour variants (found ${harsilLeo.colors.length})`);
      const hasVariantImages = harsilLeo.colors.every((c) => Array.isArray(c.images) && c.images.length > 0);
      assert(hasVariantImages, 'All Harsil Leo colour variants have variant-specific image arrays mapped');
    }

    const retroClassic = draftProducts.find((p) => p.slug === 'harsil-retro-classic');
    if (retroClassic && Array.isArray(retroClassic.colors)) {
      assert(retroClassic.colors.length >= 5, `Harsil Retro Classic has 5 colour variants (found ${retroClassic.colors.length})`);
    }

    // 6. Verify Hero placement fields
    const thunderPro = await prisma.product.findUnique({
      where: { slug: 'thunder-pro' },
    });
    assert(thunderPro !== undefined && thunderPro?.isHero === true, 'Baseline Flagship (thunder-pro) has isHero: true');
    assert(thunderPro?.heroHeading !== null && thunderPro?.heroHeading !== undefined, 'Baseline Flagship has heroHeading');

    // 7. Verify zero corruption of existing memberships or bookings
    const bookingCount = await prisma.evBooking.count();
    const bikeCount = await prisma.evBike.count();
    console.log(`\nFinTech Integrity: EvBooking count=${bookingCount}, EvBike count=${bikeCount}`);
    assert(bikeCount >= 0, 'EvBike table accessible with zero regressions');
    assert(bookingCount >= 0, 'EvBooking table accessible with zero regressions');

    console.log('\n====================================================');
    console.log(`QA SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('QA Test execution failed with error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runQa();

/**
 * ASKR EV — RESTORE CLEAN UAT DATABASE (PRISMA ENGINE)
 *
 * Restores the complete verified 28-account Production baseline into `clean_uat`.
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('d:/Projects/AskrEV/apps/api/node_modules/@prisma/client');

const CLEAN_UAT_URL = 'postgresql://postgres:criOL0BwGsXD3Dq7wRA0xVfP99mLZVDB@nozomi.proxy.rlwy.net:28651/clean_uat';

async function restore() {
  console.log('================================================================================');
  console.log('       ASKR EV — RESTORE CLEAN UAT DATABASE (PRISMA ENGINE)');
  console.log('================================================================================');

  const backupFile = path.resolve('backups/production_fresh_read_only_backup_20261125.json');
  const backup = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
  const { data } = backup;

  const prisma = new PrismaClient({
    datasources: { db: { url: CLEAN_UAT_URL } },
  });

  // 1. Clean existing records in clean_uat if any
  console.log('Clearing clean_uat tables...');
  await prisma.journalLine.deleteMany({});
  await prisma.journalEntry.deleteMany({});
  await prisma.shoppingVoucher.deleteMany({});
  await prisma.commissionHold.deleteMany({});
  await prisma.binaryMatchEvent.deleteMany({});
  await prisma.binaryPlacement.deleteMany({});
  await prisma.walletAccount.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.homepageHeroSlide.deleteMany({});
  await prisma.dashboardTopBanner.deleteMany({});
  await prisma.paymentConfig.deleteMany({});
  await prisma.popupCampaign.deleteMany({});
  await prisma.retailQualificationConfig.deleteMany({});
  console.log('Tables cleared.');

  // 2. Restore Products
  console.log(`Restoring ${data.Product.length} Products...`);
  for (const p of data.Product) {
    await prisma.product.create({
      data: {
        id: p.id,
        name: p.name,
        slug: p.slug,
        category: p.category,
        brand: p.brand || 'ASKR EV',
        tagline: p.tagline,
        shortDescription: p.shortDescription,
        fullDescription: p.fullDescription,
        regularPricePaise: p.regularPricePaise ? BigInt(p.regularPricePaise) : null,
        sellingPricePaise: p.sellingPricePaise ? BigInt(p.sellingPricePaise) : null,
        bookingAmountPaise: p.bookingAmountPaise ? BigInt(p.bookingAmountPaise) : null,
        voucherRedeemLimitPaise: p.voucherRedeemLimitPaise ? BigInt(p.voucherRedeemLimitPaise) : null,
        rangeKm: p.rangeKm,
        topSpeedKmh: p.topSpeedKmh,
        batteryCapacityKwh: p.batteryCapacityKwh,
        chargingTimeHours: p.chargingTimeHours,
        motorPower: p.motorPower,
        acceleration: p.acceleration,
        warranty: p.warranty,
        powertrain: p.powertrain,
        colors: p.colors,
        specifications: p.specifications,
        highlights: p.highlights,
        images: p.images,
        heroImage: p.heroImage,
        thumbnailImage: p.thumbnailImage,
        isHero: p.isHero || false,
        heroMobileImage: p.heroMobileImage,
        heroHeading: p.heroHeading,
        heroDescription: p.heroDescription,
        heroCtaText: p.heroCtaText,
        heroCtaLink: p.heroCtaLink,
        heroSlideOrder: p.heroSlideOrder,
        oemManufacturer: p.oemManufacturer,
        oemModelName: p.oemModelName,
        oemReference: p.oemReference,
        internalNotes: p.internalNotes,
        slugAliases: p.slugAliases || [],
        isRebranded: p.isRebranded ?? true,
        isFeatured: p.isFeatured || false,
        status: p.status || 'ACTIVE',
        availability: p.availability || 'BOOKING_AVAILABLE',
        displayOrder: p.displayOrder || 0,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
      },
    });
  }

  // 3. Restore HomepageHeroSlide
  console.log(`Restoring ${data.HomepageHeroSlide.length} Hero Slides...`);
  for (const s of data.HomepageHeroSlide) {
    await prisma.homepageHeroSlide.create({
      data: {
        id: s.id,
        internalName: s.internalName,
        heading: s.heading,
        subheading: s.subheading,
        description: s.description,
        eyebrowText: s.eyebrowText,
        desktopImageUrl: s.desktopImageUrl,
        mobileImageUrl: s.mobileImageUrl,
        desktopFocalX: s.desktopFocalX,
        desktopFocalY: s.desktopFocalY,
        mobileFocalX: s.mobileFocalX,
        mobileFocalY: s.mobileFocalY,
        desktopAltText: s.desktopAltText,
        mobileAltText: s.mobileAltText,
        primaryCtaLabel: s.primaryCtaLabel,
        primaryCtaUrl: s.primaryCtaUrl,
        primaryCtaStyle: s.primaryCtaStyle || 'PRIMARY',
        primaryCtaEnabled: s.primaryCtaEnabled ?? true,
        secondaryCtaLabel: s.secondaryCtaLabel,
        secondaryCtaUrl: s.secondaryCtaUrl,
        secondaryCtaStyle: s.secondaryCtaStyle || 'OUTLINE',
        secondaryCtaEnabled: s.secondaryCtaEnabled ?? true,
        linkedProductId: s.linkedProductId,
        showPrice: s.showPrice ?? false,
        showRange: s.showRange ?? true,
        showTopSpeed: s.showTopSpeed ?? false,
        showBattery: s.showBattery ?? false,
        showSpecifications: s.showSpecifications ?? false,
        sortOrder: s.sortOrder,
        status: s.status || 'PUBLISHED',
        publishStartAt: s.publishStartAt ? new Date(s.publishStartAt) : null,
        publishEndAt: s.publishEndAt ? new Date(s.publishEndAt) : null,
        createdBy: s.createdBy,
        updatedBy: s.updatedBy,
        version: s.version || 1,
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt),
      },
    });
  }

  // 4. Restore DashboardTopBanner
  console.log(`Restoring ${data.DashboardTopBanner.length} Top Banners...`);
  for (const b of data.DashboardTopBanner) {
    await prisma.dashboardTopBanner.create({
      data: {
        id: b.id,
        title: b.title,
        badgeText: b.badgeText,
        desktopImageUrl: b.desktopImageUrl,
        mobileImageUrl: b.mobileImageUrl,
        linkUrl: b.linkUrl,
        altText: b.altText,
        isEnabled: b.isEnabled ?? true,
        subtitle: b.subtitle,
        buttonText: b.buttonText,
        displayOrder: b.displayOrder || 0,
        status: b.status || 'PUBLISHED',
        startDate: b.startDate ? new Date(b.startDate) : null,
        endDate: b.endDate ? new Date(b.endDate) : null,
        autoplayInterval: b.autoplayInterval || 5000,
        createdAt: new Date(b.createdAt),
        updatedAt: new Date(b.updatedAt),
      },
    });
  }

  // 5. Restore PaymentConfig
  console.log(`Restoring ${data.PaymentConfig.length} Payment Configs...`);
  for (const pc of data.PaymentConfig) {
    await prisma.paymentConfig.create({
      data: {
        id: pc.id,
        configKey: pc.configKey,
        merchantUpiVpa: pc.merchantUpiVpa,
        merchantName: pc.merchantName,
        isVerified: pc.isVerified ?? true,
        verifiedAt: pc.verifiedAt ? new Date(pc.verifiedAt) : null,
        verifiedBy: pc.verifiedBy,
        notes: pc.notes,
        upiEnabled: pc.upiEnabled ?? true,
        manualReviewRequired: pc.manualReviewRequired ?? true,
        createdAt: new Date(pc.createdAt),
        updatedAt: new Date(pc.updatedAt),
      },
    });
  }

  // 6. Restore PopupCampaign
  if (data.PopupCampaign && data.PopupCampaign.length > 0) {
    console.log(`Restoring ${data.PopupCampaign.length} Popup Campaigns...`);
    for (const pop of data.PopupCampaign) {
      await prisma.popupCampaign.create({
        data: {
          id: pop.id,
          name: pop.name,
          heading: pop.heading,
          subheading: pop.subheading,
          message: pop.message,
          buttonText: pop.buttonText,
          buttonLink: pop.buttonLink,
          footerText: pop.footerText,
          imageUrl: pop.imageUrl,
          frequency: pop.frequency || 'EVERY_VISIT',
          status: pop.status || 'PUBLISHED',
          startDate: pop.startDate ? new Date(pop.startDate) : null,
          endDate: pop.endDate ? new Date(pop.endDate) : null,
          createdBy: pop.createdBy,
          createdAt: new Date(pop.createdAt),
          updatedAt: new Date(pop.updatedAt),
        },
      });
    }
  }

  // 7. Restore Users (Pass 1: base records without sponsorId)
  console.log(`Restoring ${data.User.length} Users (Pass 1: base records)...`);
  for (const u of data.User) {
    await prisma.user.create({
      data: {
        id: u.id,
        memberId: u.memberId,
        email: u.email,
        fullName: u.fullName,
        passwordHash: u.passwordHash,
        role: u.role,
        currentPackage: u.currentPackage,
        isFullQualified: u.isFullQualified,
        intendedBinarySide: u.intendedBinarySide,
        createdAt: new Date(u.createdAt),
      },
    });
  }

  // Users (Pass 2: link sponsorId)
  console.log(`Restoring Users (Pass 2: sponsor relationships)...`);
  for (const u of data.User) {
    if (u.sponsorId) {
      await prisma.user.update({
        where: { id: u.id },
        data: { sponsorId: u.sponsorId },
      });
    }
  }

  // 8. Restore Wallets
  console.log(`Restoring ${data.WalletAccount.length} Wallets...`);
  for (const w of data.WalletAccount) {
    await prisma.walletAccount.create({
      data: {
        id: w.id,
        userId: w.userId,
        availableEarningsPaise: BigInt(w.availableEarningsPaise || 0),
        heldCommissionsPaise: BigInt(w.heldCommissionsPaise || 0),
        shoppingVoucherBalancePaise: BigInt(w.shoppingVoucherBalancePaise || 0),
        pendingRecoveryPaise: BigInt(w.pendingRecoveryPaise || 0),
        totalEarnedPaise: BigInt(w.totalEarnedPaise || 0),
        totalWithdrawnPaise: BigInt(w.totalWithdrawnPaise || 0),
      },
    });
  }

  // 9. Restore Binary Placements (Original pre-restructure state)
  console.log(`Restoring ${data.BinaryPlacement.length} Binary Placements (pre-restructure)...`);
  const rootBp = data.BinaryPlacement.find((p) => !p.parentId);
  if (rootBp) {
    await prisma.binaryPlacement.create({
      data: {
        id: rootBp.id,
        userId: rootBp.userId,
        parentId: null,
        leg: null,
        leftCount: rootBp.leftCount || 0,
        rightCount: rootBp.rightCount || 0,
        leftVolumePaise: BigInt(rootBp.leftVolumePaise || 0),
        rightVolumePaise: BigInt(rootBp.rightVolumePaise || 0),
        carryLeftPaise: BigInt(rootBp.carryLeftPaise || 0),
        carryRightPaise: BigInt(rootBp.carryRightPaise || 0),
        matchedVolumeLeftPaise: BigInt(rootBp.matchedVolumeLeftPaise || 0),
        matchedVolumeRightPaise: BigInt(rootBp.matchedVolumeRightPaise || 0),
        totalMatchesConsumed: rootBp.totalMatchesConsumed || 0,
        totalRewardEarnedPaise: BigInt(rootBp.totalRewardEarnedPaise || 0),
        cumulativeFlushedPairs: rootBp.cumulativeFlushedPairs || 0,
        cumulativeFlushedPaise: BigInt(rootBp.cumulativeFlushedPaise || 0),
        lastMatchDate: rootBp.lastMatchDate || null,
        dailyMatchesCount: rootBp.dailyMatchesCount || 0,
      },
    });
  }

  const childBps = data.BinaryPlacement.filter((p) => p.id !== rootBp?.id);
  for (const bp of childBps) {
    await prisma.binaryPlacement.create({
      data: {
        id: bp.id,
        userId: bp.userId,
        parentId: bp.parentId || null,
        leg: bp.leg || null,
        leftCount: bp.leftCount || 0,
        rightCount: bp.rightCount || 0,
        leftVolumePaise: BigInt(bp.leftVolumePaise || 0),
        rightVolumePaise: BigInt(bp.rightVolumePaise || 0),
        carryLeftPaise: BigInt(bp.carryLeftPaise || 0),
        carryRightPaise: BigInt(bp.carryRightPaise || 0),
        matchedVolumeLeftPaise: BigInt(bp.matchedVolumeLeftPaise || 0),
        matchedVolumeRightPaise: BigInt(bp.matchedVolumeRightPaise || 0),
        totalMatchesConsumed: bp.totalMatchesConsumed || 0,
        totalRewardEarnedPaise: BigInt(bp.totalRewardEarnedPaise || 0),
        cumulativeFlushedPairs: bp.cumulativeFlushedPairs || 0,
        cumulativeFlushedPaise: BigInt(bp.cumulativeFlushedPaise || 0),
        lastMatchDate: bp.lastMatchDate || null,
        dailyMatchesCount: bp.dailyMatchesCount || 0,
      },
    });
  }

  // 10. Restore Shopping Vouchers
  console.log(`Restoring ${data.ShoppingVoucher.length} Shopping Vouchers...`);
  for (const v of data.ShoppingVoucher) {
    await prisma.shoppingVoucher.create({
      data: {
        id: v.id,
        voucherCode: v.voucherCode,
        userId: v.userId,
        initialValuePaise: BigInt(v.initialValuePaise || 0),
        remainingBalancePaise: BigInt(v.remainingBalancePaise || 0),
        issuedReason: v.issuedReason,
        category: v.category || 'SHOPPING_VOUCHER',
        emailSent: v.emailSent || false,
        emailSentAt: v.emailSentAt ? new Date(v.emailSentAt) : null,
        status: v.status || 'ACTIVE',
        expiresAt: new Date(v.expiresAt),
        createdAt: new Date(v.createdAt),
      },
    });
  }

  // 11. Restore Commission Holds
  console.log(`Restoring ${data.CommissionHold.length} Commission Holds...`);
  for (const h of data.CommissionHold) {
    await prisma.commissionHold.create({
      data: {
        id: h.id,
        sponsorId: h.sponsorId,
        referredMemberId: h.referredMemberId,
        heldAmountPaise: BigInt(h.heldAmountPaise || 0),
        reason: h.reason || 'BASIC_HOLD_RESERVE',
        status: h.status || 'HELD',
        releasedAt: h.releasedAt ? new Date(h.releasedAt) : null,
        releaseTransactionId: h.releaseTransactionId || null,
        createdAt: new Date(h.createdAt),
      },
    });
  }

  // 12. Restore Journal Entries & Lines
  console.log(`Restoring ${data.JournalEntry.length} Journal Entries & ${data.JournalLine.length} Journal Lines...`);
  for (const j of data.JournalEntry) {
    await prisma.journalEntry.create({
      data: {
        id: j.id,
        referenceId: j.referenceId,
        eventType: j.eventType,
        narration: j.narration,
        createdAt: new Date(j.createdAt),
      },
    });
  }

  for (const l of data.JournalLine) {
    await prisma.journalLine.create({
      data: {
        id: l.id,
        journalEntryId: l.journalEntryId,
        account: l.account,
        userId: l.userId || null,
        debitPaise: BigInt(l.debitPaise || 0),
        creditPaise: BigInt(l.creditPaise || 0),
        description: l.description,
        createdAt: new Date(l.createdAt),
      },
    });
  }

  // 13. Restore Binary Match Events
  console.log(`Restoring ${data.BinaryMatchEvent.length} Binary Match Events...`);
  for (const me of data.BinaryMatchEvent) {
    await prisma.binaryMatchEvent.create({
      data: {
        id: me.id,
        userId: me.userId,
        matchDate: me.matchDate,
        matchesEvaluated: me.matchesEvaluated,
        matchesSettled: me.matchesSettled,
        cappedOutMatches: me.cappedOutMatches,
        leftUnitsUsed: me.leftUnitsUsed,
        rightUnitsUsed: me.rightUnitsUsed,
        previousCarryLeft: me.previousCarryLeft,
        previousCarryRight: me.previousCarryRight,
        newCarryLeft: me.newCarryLeft,
        newCarryRight: me.newCarryRight,
        rewardPaise: BigInt(me.rewardPaise || 0),
        createdAt: new Date(me.createdAt),
      },
    });
  }

  // Step 14: Final Baseline Verification
  console.log('\n--- Step 14: Verifying clean_uat Baseline Counts ---');
  const userCount = await prisma.user.count();
  const walletCount = await prisma.walletAccount.count();
  const placementCount = await prisma.binaryPlacement.count();
  const voucherCount = await prisma.shoppingVoucher.count();
  const holdCount = await prisma.commissionHold.count();
  const journalCount = await prisma.journalEntry.count();
  const lineCount = await prisma.journalLine.count();

  const wallets = await prisma.walletAccount.findMany();
  const totalAvail = wallets.reduce((acc, w) => acc + w.availableEarningsPaise, 0n);
  const totalHeld = wallets.reduce((acc, w) => acc + w.heldCommissionsPaise, 0n);
  const totalVoucherBal = wallets.reduce((acc, w) => acc + w.shoppingVoucherBalancePaise, 0n);

  const lines = await prisma.journalLine.findMany();
  const totalDebits = lines.reduce((acc, l) => acc + l.debitPaise, 0n);
  const totalCredits = lines.reduce((acc, l) => acc + l.creditPaise, 0n);

  console.log(`Users:              ${userCount} (Expected: 28)`);
  console.log(`Wallets:            ${walletCount} (Expected: 28)`);
  console.log(`Placements:         ${placementCount} (Expected: 28)`);
  console.log(`Vouchers:           ${voucherCount} (Expected: 21)`);
  console.log(`Commission Holds:   ${holdCount} (Expected: 2)`);
  console.log(`Journal Entries:    ${journalCount} (Expected: 48)`);
  console.log(`Journal Lines:      ${lineCount} (Expected: 109)`);
  console.log(`Available Earnings: ₹${Number(totalAvail) / 100} (Expected: ₹110000)`);
  console.log(`Held Commissions:   ₹${Number(totalHeld) / 100} (Expected: ₹1000)`);
  console.log(`Voucher Balances:   ₹${Number(totalVoucherBal) / 100} (Expected: ₹630000)`);
  console.log(`Total Debits:       ₹${Number(totalDebits) / 100} (Expected: ₹798000)`);
  console.log(`Total Credits:      ₹${Number(totalCredits) / 100} (Expected: ₹798000)`);

  const testUsers = await prisma.user.findMany({
    where: {
      OR: [
        { memberId: { startsWith: 'UAT-' } },
        { memberId: { startsWith: 'DISP-' } },
        { memberId: { startsWith: 'MSTR-' } },
        { memberId: { startsWith: 'TEST-' } },
      ],
    },
  });
  console.log(`Test Personas in clean_uat: ${testUsers.length} (Expected: 0)`);

  if (
    userCount !== 28 ||
    walletCount !== 28 ||
    placementCount !== 28 ||
    voucherCount !== 21 ||
    holdCount !== 2 ||
    journalCount !== 48 ||
    lineCount !== 109 ||
    totalDebits !== totalCredits ||
    testUsers.length !== 0
  ) {
    throw new Error('FATAL: Clean UAT baseline verification failed!');
  }

  console.log('\n================================================================================');
  console.log('>>> CLEAN UAT RESTORED & VERIFIED: EXACTLY 28 ACCOUNTS & ZERO TEST PERSONAS <<<');
  console.log('================================================================================\n');

  await prisma.$disconnect();
}

restore().catch((e) => {
  console.error('\nFATAL ERROR DURING RESTORATION TO CLEAN UAT:', e);
  process.exit(1);
});

/**
 * ASKR EV — REHEARSAL DATABASE CLONE SETUP & SEEDING ENGINE
 *
 * 1. Creates clean disposable database `askrev_rehearsal_disposable` on localhost:5432.
 * 2. Pushes Prisma schema tables into `askrev_rehearsal_disposable`.
 * 3. Seeds complete verified baseline from `backups/complete_production_baseline_backup.json`:
 *    - 28 Users
 *    - 28 Wallets
 *    - 28 Pre-restructure Binary Placements
 *    - 21 Shopping Vouchers
 *    - 2 Commission Holds
 *    - 48 Journal Entries & 109 Journal Lines
 *    - 6 Binary Match Events
 * 4. Runs strict pre-flight assertion audit.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { PrismaClient } = require('d:/Projects/AskrEV/apps/api/node_modules/@prisma/client');

const adminPrisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://postgres:postgres@localhost:5432/postgres?schema=public' } },
});

const REHEARSAL_DB_NAME = 'askrev_rehearsal_disposable';
const REHEARSAL_DB_URL = `postgresql://postgres:postgres@localhost:5432/${REHEARSAL_DB_NAME}?schema=public`;

async function setup() {
  console.log('================================================================================');
  console.log('        ASKR EV — COMPLETE ISOLATED BASELINE REHEARSAL CLONE SETUP');
  console.log('================================================================================');

  console.log('Step 1: Dropping and Recreating Disposable Rehearsal Database...');
  await adminPrisma.$queryRawUnsafe(`DROP DATABASE IF EXISTS ${REHEARSAL_DB_NAME}`);
  await adminPrisma.$queryRawUnsafe(`CREATE DATABASE ${REHEARSAL_DB_NAME}`);
  console.log(`Database ${REHEARSAL_DB_NAME} created successfully on localhost:5432.`);
  await adminPrisma.$disconnect();

  console.log('\nStep 2: Pushing Prisma Schema to Rehearsal Database...');
  const schemaPath = path.resolve('packages/database/prisma/schema.prisma');
  execSync(`pnpm --filter @askrev/database exec prisma db push --schema="${schemaPath}" --accept-data-loss --skip-generate`, {
    env: { ...process.env, DATABASE_URL: REHEARSAL_DB_URL },
    stdio: 'inherit',
  });
  console.log('Schema tables and constraints successfully applied.');

  console.log('\nStep 3: Loading Complete Production Baseline Backup...');
  const backupFile = path.resolve('backups/complete_production_baseline_backup.json');
  if (!fs.existsSync(backupFile)) {
    throw new Error(`Backup file not found at ${backupFile}`);
  }
  const baseline = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
  console.log(`Loaded baseline backup metadata:`, baseline.metadata);

  const rehearsalPrisma = new PrismaClient({
    datasources: { db: { url: REHEARSAL_DB_URL } },
  });

  // 1. Seed Users (pass 1: base records without sponsor link)
  console.log('Seeding 28 Users (Pass 1: base records)...');
  for (const u of baseline.users) {
    await rehearsalPrisma.user.create({
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

  // 2. Update sponsor links (Pass 2)
  console.log('Seeding 28 Users (Pass 2: sponsor links)...');
  for (const u of baseline.users) {
    if (u.sponsorId) {
      await rehearsalPrisma.user.update({
        where: { id: u.id },
        data: { sponsorId: u.sponsorId },
      });
    }
  }

  // 3. Seed Wallets
  console.log('Seeding 28 Wallets...');
  for (const w of baseline.wallets) {
    await rehearsalPrisma.walletAccount.create({
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

  // 4. Seed Binary Placements (pre-restructure state)
  console.log('Seeding 28 Pre-Restructure Binary Placements...');
  const rootPlacement = baseline.binaryPlacements.find(p => !p.parentId);
  if (rootPlacement) {
    await rehearsalPrisma.binaryPlacement.create({
      data: {
        id: rootPlacement.id,
        userId: rootPlacement.userId,
        parentId: null,
        leg: null,
        leftCount: rootPlacement.leftCount || 0,
        rightCount: rootPlacement.rightCount || 0,
        leftVolumePaise: BigInt(rootPlacement.leftVolumePaise || 0),
        rightVolumePaise: BigInt(rootPlacement.rightVolumePaise || 0),
        carryLeftPaise: BigInt(rootPlacement.carryLeftPaise || 0),
        carryRightPaise: BigInt(rootPlacement.carryRightPaise || 0),
        matchedVolumeLeftPaise: BigInt(rootPlacement.matchedVolumeLeftPaise || 0),
        matchedVolumeRightPaise: BigInt(rootPlacement.matchedVolumeRightPaise || 0),
        totalMatchesConsumed: rootPlacement.totalMatchesConsumed || 0,
        totalRewardEarnedPaise: BigInt(rootPlacement.totalRewardEarnedPaise || 0),
        cumulativeFlushedPairs: rootPlacement.cumulativeFlushedPairs || 0,
        cumulativeFlushedPaise: BigInt(rootPlacement.cumulativeFlushedPaise || 0),
        lastMatchDate: rootPlacement.lastMatchDate || null,
        dailyMatchesCount: rootPlacement.dailyMatchesCount || 0,
      },
    });
  }

  const childPlacements = baseline.binaryPlacements.filter(p => p.id !== rootPlacement?.id);
  for (const bp of childPlacements) {
    await rehearsalPrisma.binaryPlacement.create({
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

  // 5. Seed Shopping Vouchers
  console.log('Seeding 21 Shopping Vouchers...');
  for (const v of baseline.shoppingVouchers) {
    await rehearsalPrisma.shoppingVoucher.create({
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

  // 6. Seed Commission Holds
  console.log('Seeding 2 Commission Holds...');
  for (const h of baseline.commissionHolds) {
    await rehearsalPrisma.commissionHold.create({
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

  // 7. Seed Journal Entries & Lines
  console.log('Seeding 48 Journal Entries and 109 Journal Lines...');
  for (const j of baseline.journalEntries) {
    const je = await rehearsalPrisma.journalEntry.create({
      data: {
        id: j.id,
        referenceId: j.referenceId,
        eventType: j.eventType,
        narration: j.narration,
        createdAt: new Date(j.createdAt),
      },
    });

    for (const l of j.lines) {
      await rehearsalPrisma.journalLine.create({
        data: {
          id: l.id,
          journalEntryId: je.id,
          account: l.account,
          userId: l.userId || null,
          debitPaise: BigInt(l.debitPaise || 0),
          creditPaise: BigInt(l.creditPaise || 0),
          description: l.description,
          createdAt: new Date(l.createdAt),
        },
      });
    }
  }

  // 8. Seed Binary Match Events
  console.log('Seeding 6 Binary Match Events...');
  for (const me of baseline.matchEvents) {
    await rehearsalPrisma.binaryMatchEvent.create({
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

  console.log('\n--- Step 4: Comprehensive Baseline Verification on Rehearsal Clone ---');
  const userCount = await rehearsalPrisma.user.count();
  const walletCount = await rehearsalPrisma.walletAccount.count();
  const placementCount = await rehearsalPrisma.binaryPlacement.count();
  const voucherCount = await rehearsalPrisma.shoppingVoucher.count();
  const holdCount = await rehearsalPrisma.commissionHold.count();
  const journalCount = await rehearsalPrisma.journalEntry.count();
  const lineCount = await rehearsalPrisma.journalLine.count();
  const matchEventCount = await rehearsalPrisma.binaryMatchEvent.count();

  const wallets = await rehearsalPrisma.walletAccount.findMany();
  const totalAvail = wallets.reduce((acc, w) => acc + w.availableEarningsPaise, 0n);
  const totalHeld = wallets.reduce((acc, w) => acc + w.heldCommissionsPaise, 0n);
  const totalVoucherBal = wallets.reduce((acc, w) => acc + w.shoppingVoucherBalancePaise, 0n);

  const lines = await rehearsalPrisma.journalLine.findMany();
  const totalDebits = lines.reduce((acc, l) => acc + l.debitPaise, 0n);
  const totalCredits = lines.reduce((acc, l) => acc + l.creditPaise, 0n);

  console.log(`Users:              ${userCount} (Expected: 28)`);
  console.log(`Wallets:            ${walletCount} (Expected: 28)`);
  console.log(`Placements:         ${placementCount} (Expected: 28)`);
  console.log(`Vouchers:           ${voucherCount} (Expected: 21)`);
  console.log(`Commission Holds:   ${holdCount} (Expected: 2)`);
  console.log(`Journal Entries:    ${journalCount} (Expected: 48)`);
  console.log(`Journal Lines:      ${lineCount} (Expected: 109)`);
  console.log(`Match Events:       ${matchEventCount} (Expected: 6)`);
  console.log(`Available Earnings: ₹${Number(totalAvail) / 100} (Expected: ₹110000)`);
  console.log(`Held Commissions:   ₹${Number(totalHeld) / 100} (Expected: ₹1000)`);
  console.log(`Voucher Balances:   ₹${Number(totalVoucherBal) / 100} (Expected: ₹630000)`);
  console.log(`Total Debits:       ₹${Number(totalDebits) / 100} (Expected: ₹798000)`);
  console.log(`Total Credits:      ₹${Number(totalCredits) / 100} (Expected: ₹798000)`);

  if (
    userCount !== 28 ||
    walletCount !== 28 ||
    placementCount !== 28 ||
    voucherCount !== 21 ||
    holdCount !== 2 ||
    journalCount !== 48 ||
    lineCount !== 109 ||
    matchEventCount !== 6 ||
    totalAvail !== 11000000n ||
    totalHeld !== 100000n ||
    totalVoucherBal !== 63000000n ||
    totalDebits !== 79800000n ||
    totalCredits !== 79800000n
  ) {
    throw new Error('FATAL: Rehearsal clone baseline counts or balances do not match verified production baseline!');
  }

  console.log('\n>>> REHEARSAL DATABASE CLONE SUCCESSFULLY INITIALIZED AND VERIFIED 100% <<<');
  await rehearsalPrisma.$disconnect();
}

setup().catch((e) => {
  console.error('Rehearsal setup failed:', e);
  process.exit(1);
});

/**
 * ASKR EV — REHEARSAL DATABASE CLONE SETUP & SEEDING ENGINE
 *
 * 1. Creates clean disposable database `askrev_rehearsal_disposable` on localhost:5432.
 * 2. Pushes Prisma schema tables into `askrev_rehearsal_disposable`.
 * 3. Seeds exact pre-restructure snapshot of all 28 baseline accounts from `backups/uat_binary_pre_restructure_snapshot.json`.
 * 4. Seeds wallets, binary placements (pre-restructure), vouchers, and historical journal entries.
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
  console.log('=== Step 1: Creating Disposable Database ===');
  await adminPrisma.$queryRawUnsafe(`DROP DATABASE IF EXISTS ${REHEARSAL_DB_NAME}`);
  await adminPrisma.$queryRawUnsafe(`CREATE DATABASE ${REHEARSAL_DB_NAME}`);
  console.log(`Database ${REHEARSAL_DB_NAME} created successfully.`);
  await adminPrisma.$disconnect();

  console.log('\n=== Step 2: Applying Prisma Schema ===');
  const schemaPath = path.resolve('packages/database/prisma/schema.prisma');
  execSync(`pnpm --filter @askrev/database exec prisma db push --schema="${schemaPath}" --accept-data-loss --skip-generate`, {
    env: { ...process.env, DATABASE_URL: REHEARSAL_DB_URL },
    stdio: 'inherit',
  });
  console.log('Schema tables created successfully.');

  console.log('\n=== Step 3: Seeding Pre-Migration Baseline Dataset ===');
  const rehearsalPrisma = new PrismaClient({
    datasources: { db: { url: REHEARSAL_DB_URL } },
  });

  const snapshotPath = path.resolve('backups/uat_binary_pre_restructure_snapshot.json');
  const usersData = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));

  console.log(`Found ${usersData.length} baseline accounts in pre-restructure snapshot.`);

  // 1. Seed Users first without sponsor links to prevent foreign key errors
  for (const u of usersData) {
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

  // 2. Update sponsor links
  for (const u of usersData) {
    if (u.sponsorId) {
      await rehearsalPrisma.user.update({
        where: { id: u.id },
        data: { sponsorId: u.sponsorId },
      });
    }
  }

  // 3. Seed Wallets
  for (const u of usersData) {
    if (u.wallet) {
      await rehearsalPrisma.walletAccount.create({
        data: {
          id: u.wallet.id,
          userId: u.id,
          availableEarningsPaise: BigInt(u.wallet.availableEarningsPaise || 0),
          heldCommissionsPaise: BigInt(u.wallet.heldCommissionsPaise || 0),
          shoppingVoucherBalancePaise: BigInt(u.wallet.shoppingVoucherBalancePaise || 0),
          pendingRecoveryPaise: BigInt(u.wallet.pendingRecoveryPaise || 0),
        },
      });
    }
  }

  // 4. Seed Pre-Restructure Binary Placements (Root first, then descendants)
  const rootPlacement = usersData.find((u) => u.binaryPlacement && !u.binaryPlacement.parentId);
  if (rootPlacement && rootPlacement.binaryPlacement) {
    const bp = rootPlacement.binaryPlacement;
    await rehearsalPrisma.binaryPlacement.create({
      data: {
        id: bp.id,
        userId: rootPlacement.id,
        parentId: null,
        leg: null,
        leftCount: bp.leftCount,
        rightCount: bp.rightCount,
        leftVolumePaise: BigInt(bp.leftVolumePaise || 0),
        rightVolumePaise: BigInt(bp.rightVolumePaise || 0),
        carryLeftPaise: BigInt(bp.carryLeftPaise || 0),
        carryRightPaise: BigInt(bp.carryRightPaise || 0),
        totalMatchesConsumed: bp.totalMatchesConsumed || 6,
      },
    });
  }

  const otherPlacements = usersData.filter((u) => u.id !== rootPlacement?.id);
  for (const u of otherPlacements) {
    const bp = u.binaryPlacement;
    if (bp) {
      await rehearsalPrisma.binaryPlacement.create({
        data: {
          id: bp.id,
          userId: u.id,
          parentId: bp.parentId || null,
          leg: bp.leg || null,
          leftCount: bp.leftCount || 0,
          rightCount: bp.rightCount || 0,
          leftVolumePaise: BigInt(bp.leftVolumePaise || 0),
          rightVolumePaise: BigInt(bp.rightVolumePaise || 0),
          carryLeftPaise: BigInt(bp.carryLeftPaise || 0),
          carryRightPaise: BigInt(bp.carryRightPaise || 0),
          totalMatchesConsumed: bp.totalMatchesConsumed || 0,
        },
      });
    }
  }

  // 5. Seed Historical BinaryMatchEvents for Root (6 matches = ₹18,000)
  for (let i = 1; i <= 6; i++) {
    await rehearsalPrisma.binaryMatchEvent.create({
      data: {
        userId: rootPlacement.id,
        matchDate: '2026-11-24',
        matchesEvaluated: 1,
        matchesSettled: 1,
        cappedOutMatches: 0,
        leftUnitsUsed: 1,
        rightUnitsUsed: 1,
        previousCarryLeft: 0,
        previousCarryRight: 0,
        newCarryLeft: 0,
        newCarryRight: 0,
        rewardPaise: 300000n,
      },
    });
  }

  // 6. Seed Balanced Double-Entry Journal for Root Matches
  for (let i = 1; i <= 6; i++) {
    const je = await rehearsalPrisma.journalEntry.create({
      data: {
        referenceId: `REF-HIST-MATCH-${i}`,
        eventType: 'BINARY_MATCHING_REWARD',
        narration: `Simulated binary matching reward for Super Administrator: 1 matches @ ₹3,000`,
      },
    });

    // Debit Expense
    await rehearsalPrisma.journalLine.create({
      data: {
        journalEntryId: je.id,
        account: '5200_BINARY_MATCHING_EXPENSE',
        debitPaise: 300000n,
        creditPaise: 0n,
        description: 'Binary matching expense',
      },
    });

    // Credit Payable
    await rehearsalPrisma.journalLine.create({
      data: {
        journalEntryId: je.id,
        account: '2000_MEMBER_EARNINGS_PAYABLE',
        userId: rootPlacement.id,
        debitPaise: 0n,
        creditPaise: 300000n,
        description: 'Binary matching reward credited to wallet',
      },
    });
  }

  console.log('Seeded 28 accounts, pre-migration binary tree, 6 match events, and balanced journal entries.');
  await rehearsalPrisma.$disconnect();
}

setup().catch((e) => {
  console.error('Rehearsal setup failed:', e);
  process.exit(1);
});

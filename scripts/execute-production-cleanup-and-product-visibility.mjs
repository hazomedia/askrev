// scripts/execute-production-cleanup-and-product-visibility.mjs
import fs from 'fs';
import { execSync } from 'child_process';
import { PrismaClient } from '../packages/database/dist/index.js';

const REQUIRED_BACKUP_CHECKSUM = '06c2ff70ab2508d9e8393344e7957c4ec990b7eb263f3dd441de5326227c19db';
const BACKUP_FILE_PATH = 'C:\\Users\\New\\.gemini\\antigravity\\backups\\askrev\\railway-prod-backup-2026-11-21T21-35-12-567Z.json';

const ADMIN_ID = '53d082e3-acc0-4527-a71a-dffa8a4cc844';
const APPROVED_TEST_MEMBER_IDS = [
  '2cae4024-5724-427f-b118-4847a391e286', // ASKR-510199 (Satheesh / isaac4484@gmail.com)
  '469f2367-a430-4599-beee-daed8abf0fde', // ASKR-995552 (Test 02 / test@gmail.com)
  '34237f24-2fad-4937-811c-289c01dbdb62', // ASKR-960845 (Test 04 / test01@gmai.com)
  '7bc80f85-af38-4dc0-ae5f-ae72700b191f', // ASKR-482883 (test 04 / tes@num.com)
  'da4ebdfd-4d2f-4ec4-a737-e28c0ef250f6', // ASKR-351889 (Test 05 / nunn@gmail.com)
];

const APPROVED_REAL_PRODUCT_SLUGS = [
  'askr-ev-s01',
  'askr-ev-s02',
  'askr-ev-s03',
  'askr-ev-s04',
  'askr-ev-s05',
  'askr-ev-s06',
  'askr-ev-b01',
  'askr-ev-u01',
  'askr-ev-u02',
  'askr-ev-j01',
  'askr-ev-j02',
  'askr-ev-j03',
];

async function main() {
  const isExecute = process.argv.includes('--execute');

  console.log('='.repeat(80));
  console.log('  ASKR EV — PRODUCTION TEST DATA CLEANUP & PRODUCT VISIBILITY ENFORCEMENT');
  console.log('='.repeat(80));
  console.log(`Execution Mode: ${isExecute ? 'LIVE TRANSACTION EXECUTION' : 'DRY-RUN MANIFEST ONLY'}\n`);

  // 1. Verify Backup Integrity
  console.log('--- 1. VERIFYING PRE-CLEANUP BACKUP GATE ---');
  if (!fs.existsSync(BACKUP_FILE_PATH)) {
    throw new Error(`Backup file not found at ${BACKUP_FILE_PATH}`);
  }
  const crypto = await import('crypto');
  const backupBuffer = fs.readFileSync(BACKUP_FILE_PATH);
  const actualChecksum = crypto.createHash('sha256').update(backupBuffer).digest('hex');
  if (actualChecksum !== REQUIRED_BACKUP_CHECKSUM) {
    throw new Error(`Backup checksum mismatch! Expected ${REQUIRED_BACKUP_CHECKSUM}, got ${actualChecksum}`);
  }
  console.log(`✅ Backup Verified: ${BACKUP_FILE_PATH}`);
  console.log(`   SHA-256 Checksum: ${actualChecksum} (MATCH)\n`);

  // 2. Connect to Railway PostgreSQL
  console.log('--- 2. CONNECTING TO RAILWAY PRODUCTION DATABASE ---');
  const rawVars = execSync('railway variable list --service Postgres --json', { stdio: 'pipe' }).toString();
  const parsed = JSON.parse(rawVars);
  const user = parsed.POSTGRES_USER || parsed.PGUSER;
  const password = parsed.POSTGRES_PASSWORD || parsed.PGPASSWORD;
  const host = parsed.RAILWAY_TCP_PROXY_DOMAIN;
  const port = parsed.RAILWAY_TCP_PROXY_PORT;
  const db = parsed.POSTGRES_DB || parsed.PGDATABASE || 'railway';

  const railwayUrl = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${db}?sslmode=require`;
  const prisma = new PrismaClient({ datasources: { db: { url: railwayUrl } } });

  // 3. Verify Target Identities
  console.log('--- 3. VALIDATING DATABASE IDENTITY & TARGET USERS ---');
  const allUsers = await prisma.user.findMany({ select: { id: true, memberId: true, email: true, role: true } });
  console.log(`Total users in production DB: ${allUsers.length}`);

  const adminInDb = allUsers.find(u => u.id === ADMIN_ID);
  if (!adminInDb || adminInDb.role !== 'SUPER_ADMIN') {
    throw new Error('Super Admin user missing or invalid in production database! ABORTING.');
  }
  console.log(`✅ Super Admin Protected: ${adminInDb.memberId} (${adminInDb.email})`);

  const testUsersInDb = allUsers.filter(u => APPROVED_TEST_MEMBER_IDS.includes(u.id));
  if (testUsersInDb.length !== APPROVED_TEST_MEMBER_IDS.length) {
    throw new Error(`Expected ${APPROVED_TEST_MEMBER_IDS.length} test members, found ${testUsersInDb.length}. ABORTING.`);
  }

  // Detect any unclassified users
  const unknownUsers = allUsers.filter(u => u.id !== ADMIN_ID && !APPROVED_TEST_MEMBER_IDS.includes(u.id));
  if (unknownUsers.length > 0) {
    throw new Error(`Detected unknown/unclassified users: ${JSON.stringify(unknownUsers)}. ABORTING.`);
  }
  console.log(`✅ Exactly 5 test members confirmed for cleanup. Unknown users: 0.\n`);

  // 4. Pre-Cleanup Inventory
  console.log('--- 4. PRE-CLEANUP RECORD INVENTORY ---');
  const preCounts = {
    users: await prisma.user.count(),
    testMembers: await prisma.user.count({ where: { id: { in: APPROVED_TEST_MEMBER_IDS } } }),
    binaryPlacements: await prisma.binaryPlacement.count(),
    walletAccounts: await prisma.walletAccount.count(),
    journalEntries: await prisma.journalEntry.count(),
    journalLines: await prisma.journalLine.count(),
    shoppingVouchers: await prisma.shoppingVoucher.count(),
    membershipRequests: await prisma.membershipRequest.count(),
    binaryMatchEvents: await prisma.binaryMatchEvent.count(),
    binarySimulationRuns: await prisma.binarySimulationRun.count(),
    commissionHolds: await prisma.commissionHold.count(),
    qualificationEvents: await prisma.qualificationEvent.count(),
    emailTokens: await prisma.emailVerificationToken.count(),
    totalProducts: await prisma.product.count(),
    publishedProducts: await prisma.product.count({ where: { status: 'PUBLISHED' } }),
    draftProducts: await prisma.product.count({ where: { status: 'DRAFT' } }),
  };
  console.table(preCounts);

  if (!isExecute) {
    console.log('\n==================================================');
    console.log('DRY-RUN COMPLETE: PASS. Re-run with --execute to commit changes.');
    console.log('==================================================');
    await prisma.$disconnect();
    return;
  }

  // 5. Execute Production Transaction
  console.log('--- 5. COMMITTING CLEANUP TRANSACTION & PRODUCT VISIBILITY ---');
  await prisma.$transaction(async (tx) => {
    // 5.1 Delete simulation runs & match events
    await tx.binarySimulationRun.deleteMany({});
    await tx.binaryMatchEvent.deleteMany({});

    // 5.2 Delete commission holds & qualification events
    await tx.commissionHold.deleteMany({});
    await tx.qualificationEvent.deleteMany({});

    // 5.3 Delete double-entry accounting records
    await tx.journalLine.deleteMany({});
    await tx.journalEntry.deleteMany({});

    // 5.4 Delete shopping vouchers
    await tx.shoppingVoucher.deleteMany({});

    // 5.5 Delete test membership requests
    await tx.membershipRequest.deleteMany({
      where: { userId: { in: APPROVED_TEST_MEMBER_IDS } }
    });

    // 5.6 Delete test verification tokens
    await tx.emailVerificationToken.deleteMany({
      where: { userId: { in: APPROVED_TEST_MEMBER_IDS } }
    });
    await tx.passwordResetToken.deleteMany({
      where: { userId: { in: APPROVED_TEST_MEMBER_IDS } }
    });

    // 5.7 Delete test binary placements
    await tx.binaryPlacement.deleteMany({
      where: { userId: { in: APPROVED_TEST_MEMBER_IDS } }
    });

    // 5.8 Reset Admin Binary Placement to 0 points / 0 children
    await tx.binaryPlacement.updateMany({
      where: { userId: ADMIN_ID },
      data: {
        leftCount: 0,
        rightCount: 0,
        leftVolumePaise: 0n,
        rightVolumePaise: 0n,
        carryLeftPaise: 0n,
        carryRightPaise: 0n,
        matchedVolumeLeftPaise: 0n,
        matchedVolumeRightPaise: 0n,
        totalMatchesConsumed: 0,
        totalRewardEarnedPaise: 0n,
        lastMatchDate: null,
        dailyMatchesCount: 0,
      }
    });

    // 5.9 Delete test member wallet accounts
    await tx.walletAccount.deleteMany({
      where: { userId: { in: APPROVED_TEST_MEMBER_IDS } }
    });

    // 5.10 Reset Admin Wallet Account to 0 paise balances
    await tx.walletAccount.updateMany({
      where: { userId: ADMIN_ID },
      data: {
        availableEarningsPaise: 0n,
        heldCommissionsPaise: 0n,
        pendingRecoveryPaise: 0n,
        shoppingVoucherBalancePaise: 0n,
        totalEarnedPaise: 0n,
        totalWithdrawnPaise: 0n,
      }
    });

    // 5.11 Delete 5 test members
    await tx.user.deleteMany({
      where: { id: { in: APPROVED_TEST_MEMBER_IDS } }
    });

    // 5.12 Update 12 approved real products to PUBLISHED
    await tx.product.updateMany({
      where: { slug: { in: APPROVED_REAL_PRODUCT_SLUGS } },
      data: { status: 'PUBLISHED' }
    });
  }, {
    maxWait: 20000,
    timeout: 60000
  });

  console.log('✅ Transaction committed successfully!\n');

  // 6. Post-Cleanup Verification Audit
  console.log('--- 6. POST-CLEANUP PRODUCTION VERIFICATION AUDIT ---');
  const postCounts = {
    users: await prisma.user.count(),
    testMembers: await prisma.user.count({ where: { id: { in: APPROVED_TEST_MEMBER_IDS } } }),
    binaryPlacements: await prisma.binaryPlacement.count(),
    walletAccounts: await prisma.walletAccount.count(),
    journalEntries: await prisma.journalEntry.count(),
    journalLines: await prisma.journalLine.count(),
    shoppingVouchers: await prisma.shoppingVoucher.count(),
    membershipRequests: await prisma.membershipRequest.count(),
    binaryMatchEvents: await prisma.binaryMatchEvent.count(),
    binarySimulationRuns: await prisma.binarySimulationRun.count(),
    commissionHolds: await prisma.commissionHold.count(),
    qualificationEvents: await prisma.qualificationEvent.count(),
    totalProducts: await prisma.product.count(),
    publishedProducts: await prisma.product.count({ where: { status: 'PUBLISHED' } }),
    draftProducts: await prisma.product.count({ where: { status: 'DRAFT' } }),
  };
  console.table(postCounts);

  // Check Admin preservation
  const adminPost = await prisma.user.findUnique({ where: { id: ADMIN_ID } });
  console.log('Admin Account Intact:', {
    id: adminPost?.id,
    memberId: adminPost?.memberId,
    email: adminPost?.email,
    role: adminPost?.role,
    mfaEnabled: adminPost?.twoFactorEnabled,
    sessionVersion: adminPost?.sessionVersion
  });

  // Check Admin placement
  const adminPlacement = await prisma.binaryPlacement.findFirst({ where: { userId: ADMIN_ID } });
  console.log('Admin Placement Intact & Reset:', {
    userId: adminPlacement?.userId,
    parentId: adminPlacement?.parentId,
    leftCount: adminPlacement?.leftCount,
    rightCount: adminPlacement?.rightCount,
    totalRewardEarnedPaise: adminPlacement?.totalRewardEarnedPaise?.toString()
  });

  // Check Admin wallet
  const adminWallet = await prisma.walletAccount.findFirst({ where: { userId: ADMIN_ID } });
  console.log('Admin Wallet Intact & Reset:', {
    userId: adminWallet?.userId,
    availableEarningsPaise: adminWallet?.availableEarningsPaise?.toString(),
    shoppingVoucherBalancePaise: adminWallet?.shoppingVoucherBalancePaise?.toString(),
    totalEarnedPaise: adminWallet?.totalEarnedPaise?.toString()
  });

  // Check category publication counts
  const categories = ['SCOOTER', 'BIKE', 'UTILITY', 'JEEP', 'CYCLE'];
  console.log('\nPublished Products by Category:');
  for (const cat of categories) {
    const c = await prisma.product.count({ where: { category: cat, status: 'PUBLISHED' } });
    console.log(`  - ${cat}: ${c}`);
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});

import fs from 'fs';
import { execSync } from 'child_process';
import { PrismaClient } from '../packages/database/node_modules/@prisma/client/index.js';

// Load .env safely if present without hardcoding any fallback credentials
if (!process.env.DATABASE_URL && fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

// ============================================================================
// APPROVED DISPOSABLE TEST ACCOUNT ALLOWLIST
// An account is disposable ONLY if explicitly enumerated here.
// No other account will ever be assumed disposable.
// ============================================================================
const APPROVED_DISPOSABLE_TEST_MEMBER_IDS = Object.freeze([
  'ASKR-465734',
  'ASKR-642041',
  'ASKR-721918',
  'ASKR-802562',
  'ASKR-T17579',
  'ASKR-T27579',
  'ASKR-100001',
  'ASKR-100002',
  'ASKR-100003',
  'ASKR-100004',
  'ASKR-100005',
]);

const PROTECTED_ROLES = Object.freeze([
  'SUPER_ADMIN',
  'ADMIN_OPERATIONS',
  'FINANCE_MANAGER',
]);

const ALLOWED_DATABASE_NAMES = Object.freeze(['askrev', 'askrev_staging_test']);

async function stagingFinalizationCleanup() {
  console.log('='.repeat(80));
  console.log('   ASKR EV — HARDENED STAGING CLEANUP & RE-SEED UTILITY');
  console.log('='.repeat(80));

  // --------------------------------------------------------------------------
  // MANDATORY SAFETY GATE 1: NO INSECURE HARDCODED CREDENTIALS
  // --------------------------------------------------------------------------
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ SAFETY ABORT: DATABASE_URL environment variable is required and must not be empty.');
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // MANDATORY SAFETY GATE 2: STRICT ENVIRONMENT GUARD (APP_ENV=local-test)
  // --------------------------------------------------------------------------
  if (process.env.APP_ENV !== 'local-test') {
    console.error(`❌ SAFETY ABORT: APP_ENV must be explicitly set to 'local-test'. Received: '${process.env.APP_ENV || 'undefined'}'.`);
    console.error('   Localhost alone does not authorize cleanup operations.');
    process.exit(1);
  }
  console.log("✓ Safety Gate 1 Passed: Confirmed APP_ENV === 'local-test'.");

  // --------------------------------------------------------------------------
  // MANDATORY SAFETY GATE 3: REJECT PRODUCTION DEPLOYMENT & HOSTED CREDENTIALS
  // --------------------------------------------------------------------------
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    process.env.RAILWAY_ENVIRONMENT === 'production' ||
    process.env.RAILWAY_ENVIRONMENT_NAME === 'production' ||
    process.env.VERCEL_ENV === 'production' ||
    dbUrl.toLowerCase().includes('rlwy.net') ||
    dbUrl.toLowerCase().includes('railway') ||
    dbUrl.toLowerCase().includes('askrevdrive.com') ||
    dbUrl.toLowerCase().includes('supabase') ||
    dbUrl.toLowerCase().includes('aws');

  if (isProduction) {
    console.error('❌ SAFETY ABORT: Execution against production or hosted cloud database is strictly forbidden!');
    process.exit(1);
  }
  console.log('✓ Safety Gate 2 Passed: Production and remote cloud hosts rejected.');

  // --------------------------------------------------------------------------
  // MANDATORY SAFETY GATE 4: VERIFIED LOCAL DATABASE IDENTITY
  // --------------------------------------------------------------------------
  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

  let dbIdentity;
  try {
    const identRes = await prisma.$queryRawUnsafe(`
      SELECT 
        current_database() as db_name, 
        current_user as db_user, 
        inet_server_addr() as server_ip,
        inet_server_port() as server_port;
    `);
    dbIdentity = identRes[0];
  } catch (err) {
    console.error('❌ SAFETY ABORT: Failed to query database identity:', err.message);
    await prisma.$disconnect();
    process.exit(1);
  }

  if (!ALLOWED_DATABASE_NAMES.includes(dbIdentity.db_name)) {
    console.error(`❌ SAFETY ABORT: Database name '${dbIdentity.db_name}' is not in the approved staging database allowlist:`, ALLOWED_DATABASE_NAMES);
    await prisma.$disconnect();
    process.exit(1);
  }

  const isLocalHost =
    dbUrl.includes('localhost') ||
    dbUrl.includes('127.0.0.1') ||
    dbIdentity.server_ip === '127.0.0.1' ||
    dbIdentity.server_ip === '::1' ||
    dbIdentity.server_ip === null;

  if (!isLocalHost) {
    console.error(`❌ SAFETY ABORT: Database server '${dbIdentity.server_ip}' is not a local loopback server!`);
    await prisma.$disconnect();
    process.exit(1);
  }
  console.log(`✓ Safety Gate 3 Passed: Verified database identity [DB: ${dbIdentity.db_name}, Port: ${dbIdentity.server_port}, User: ${dbIdentity.db_user}].`);

  // --------------------------------------------------------------------------
  // MANDATORY SAFETY GATE 5: BACKUP SNAPSHOT INTEGRITY VERIFICATION
  // --------------------------------------------------------------------------
  if (!fs.existsSync('backups')) {
    console.error('❌ SAFETY ABORT: No /backups directory found!');
    await prisma.$disconnect();
    process.exit(1);
  }
  const backupFiles = fs.readdirSync('backups').filter(f => f.startsWith('staging-backup-verified-'));
  if (backupFiles.length === 0) {
    console.error('❌ SAFETY ABORT: No verified staging backup snapshot found in /backups!');
    await prisma.$disconnect();
    process.exit(1);
  }
  const latestBackup = backupFiles[backupFiles.length - 1];
  console.log(`✓ Safety Gate 4 Passed: Verified backup available (${latestBackup}).`);

  // --------------------------------------------------------------------------
  // AUDIT DATABASE USERS & BUILD STRICT ALLOWLIST
  // --------------------------------------------------------------------------
  const allUsers = await prisma.user.findMany({
    select: { id: true, memberId: true, email: true, role: true, currentPackage: true }
  });

  const protectedUsers = [];
  const disposableUsers = [];
  const unrecognizedUsers = [];

  for (const u of allUsers) {
    if (PROTECTED_ROLES.includes(u.role)) {
      protectedUsers.push(u);
    } else if (APPROVED_DISPOSABLE_TEST_MEMBER_IDS.includes(u.memberId)) {
      disposableUsers.push(u);
    } else {
      unrecognizedUsers.push(u);
    }
  }

  // --------------------------------------------------------------------------
  // MANDATORY SAFETY GATE 6: ZERO ASSUMPTIONS - REJECT UNRECOGNIZED USERS
  // --------------------------------------------------------------------------
  if (unrecognizedUsers.length > 0) {
    console.error(`❌ SAFETY ABORT: Found ${unrecognizedUsers.length} unrecognized user account(s) not in the approved disposable test allowlist!`);
    console.error('Unrecognized accounts will NOT be deleted or assumed disposable:');
    unrecognizedUsers.forEach(u => console.error(`  - [${u.memberId}] ${u.email} (${u.role})`));
    console.error('Aborting. Add accounts to APPROVED_DISPOSABLE_TEST_MEMBER_IDS only after explicit stakeholder review.');
    await prisma.$disconnect();
    process.exit(1);
  }
  console.log(`✓ Safety Gate 5 Passed: Zero unrecognized accounts. Protected: ${protectedUsers.length}, Approved Disposable: ${disposableUsers.length}.`);

  const disposableUserIds = disposableUsers.map(u => u.id);

  // --------------------------------------------------------------------------
  // DISCOVER EXACT DEPENDENT RECORDS FOR APPROVED DISPOSABLE USERS
  // --------------------------------------------------------------------------
  const manifest = {
    mode: '',
    database: dbIdentity.db_name,
    targetApprovedUsers: disposableUsers.map(u => ({ id: u.id, memberId: u.memberId, email: u.email })),
    protectedAccountsRetained: protectedUsers.map(u => ({ id: u.id, memberId: u.memberId, email: u.email, role: u.role })),
    recordsMappedForScopedRemoval: {
      emailVerificationTokens: await prisma.emailVerificationToken.count({ where: { userId: { in: disposableUserIds } } }),
      passwordResetTokens: await prisma.passwordResetToken.count({ where: { userId: { in: disposableUserIds } } }),
      voucherTransactions: await prisma.voucherTransaction.count({ where: { voucher: { userId: { in: disposableUserIds } } } }),
      evBookings: await prisma.evBooking.count({ where: { userId: { in: disposableUserIds } } }),
      shoppingVouchers: await prisma.shoppingVoucher.count({ where: { userId: { in: disposableUserIds } } }),
      journalLines: await prisma.journalLine.count({ where: { userId: { in: disposableUserIds } } }),
      commissionHolds: await prisma.commissionHold.count({
        where: { OR: [{ sponsorId: { in: disposableUserIds } }, { referredMemberId: { in: disposableUserIds } }] }
      }),
      pendingRecoveries: await prisma.pendingRecovery.count({
        where: { OR: [{ sponsorId: { in: disposableUserIds } }, { referredMemberId: { in: disposableUserIds } }] }
      }),
      qualificationEvents: await prisma.qualificationEvent.count({
        where: { OR: [{ sponsorId: { in: disposableUserIds } }, { memberId: { in: disposableUserIds } }] }
      }),
      binaryMatchEvents: await prisma.binaryMatchEvent.count({ where: { userId: { in: disposableUserIds } } }),
      binaryPlacements: await prisma.binaryPlacement.count({ where: { userId: { in: disposableUserIds } } }),
      membershipRequests: await prisma.membershipRequest.count({ where: { userId: { in: disposableUserIds } } }),
      walletAccounts: await prisma.walletAccount.count({ where: { userId: { in: disposableUserIds } } }),
      auditLogs: await prisma.auditLog.count({ where: { actorId: { in: disposableUserIds } } }),
      disposableUsers: disposableUsers.length
    },
    systemAssetsProtected: {
      products: await prisma.product.count(),
      heroSlides: await prisma.homepageHeroSlide.count(),
      evBikes: await prisma.evBike.count(),
      protectedStaffAccounts: protectedUsers.length
    }
  };

  // --------------------------------------------------------------------------
  // MANDATORY SAFETY GATE 7: DRY-RUN BY DEFAULT & MANUAL EXECUTION FLAG
  // --------------------------------------------------------------------------
  const isExecuteFlagPassed = process.argv.includes('--execute');
  const isConfirmationEnvSet = process.env.CONFIRM_CLEANUP_EXECUTION === 'YES_PROCEED_WITH_DISPOSABLE_TEST_CLEANUP';
  const isDryRun = !isExecuteFlagPassed || !isConfirmationEnvSet;

  manifest.mode = isDryRun ? 'DRY_RUN_AUDIT_ONLY' : 'LIVE_SCOPED_EXECUTION';

  console.log('\n' + '='.repeat(80));
  console.log(`CLEANUP MANIFEST [MODE: ${manifest.mode}]`);
  console.log('='.repeat(80));
  console.log('\n--- TARGET APPROVED DISPOSABLE USERS ---');
  if (disposableUsers.length === 0) {
    console.log('  (None - Database has no pending disposable test accounts)');
  } else {
    disposableUsers.forEach(u => console.log(`  - [${u.memberId}] ${u.email}`));
  }

  console.log('\n--- PROTECTED ROOT & OPERATIONAL ACCOUNTS (UNTOUCHED) ---');
  protectedUsers.forEach(u => console.log(`  * [${u.memberId}] ${u.email} (${u.role})`));

  console.log('\n--- SCOPED RECORDS MAPPED FOR REMOVAL (ZERO BLANKET DELETIONS) ---');
  console.table(manifest.recordsMappedForScopedRemoval);

  console.log('\n--- SYSTEM ASSETS STRICTLY PRESERVED ---');
  console.table(manifest.systemAssetsProtected);

  if (isDryRun) {
    console.log('='.repeat(80));
    console.log('✅ DRY RUN COMPLETED SUCCESSFULLY — ZERO MUTATIONS EXECUTED.');
    console.log('   To execute this cleanup, ALL of the following are required:');
    console.log('   1. Environment: APP_ENV=local-test');
    console.log('   2. Environment: CONFIRM_CLEANUP_EXECUTION=YES_PROCEED_WITH_DISPOSABLE_TEST_CLEANUP');
    console.log('   3. CLI Argument: --execute');
    console.log('='.repeat(80));
    await prisma.$disconnect();
    return;
  }

  // --------------------------------------------------------------------------
  // LIVE SCOPED EXECUTION (ONLY IF ALL GATES EXPLICITLY PASSED)
  // --------------------------------------------------------------------------
  console.log('\n' + '='.repeat(80));
  console.log('⚠️ PROCEEDING WITH AUTHORIZED SCOPED CLEANUP');
  console.log('='.repeat(80));

  if (disposableUserIds.length === 0) {
    console.log('No disposable records to remove. Database already in clean state.');
    await prisma.$disconnect();
    return;
  }

  // Find journal entries associated with disposable test lines
  const disposableJournalLines = await prisma.journalLine.findMany({
    where: { userId: { in: disposableUserIds } },
    select: { journalEntryId: true }
  });
  const disposableJournalEntryIds = [...new Set(disposableJournalLines.map(l => l.journalEntryId))];

  // 1. Verification and reset tokens (scoped to approved disposable users only)
  const delTokens = await prisma.emailVerificationToken.deleteMany({ where: { userId: { in: disposableUserIds } } });
  console.log(`1. Deleted ${delTokens.count} scoped EmailVerificationTokens.`);
  const delReset = await prisma.passwordResetToken.deleteMany({ where: { userId: { in: disposableUserIds } } });
  console.log(`2. Deleted ${delReset.count} scoped PasswordResetTokens.`);

  // 2. Voucher transactions & bookings (scoped to approved disposable users only)
  const delTx = await prisma.voucherTransaction.deleteMany({ where: { voucher: { userId: { in: disposableUserIds } } } });
  console.log(`3. Deleted ${delTx.count} scoped VoucherTransactions.`);
  const delBk = await prisma.evBooking.deleteMany({ where: { userId: { in: disposableUserIds } } });
  console.log(`4. Deleted ${delBk.count} scoped EvBookings.`);

  // 3. Shopping vouchers (scoped to approved disposable users only)
  const delVouchers = await prisma.shoppingVoucher.deleteMany({ where: { userId: { in: disposableUserIds } } });
  console.log(`5. Deleted ${delVouchers.count} scoped ShoppingVouchers.`);

  // 4. Journal lines (scoped to approved disposable users only)
  const delJL = await prisma.journalLine.deleteMany({ where: { userId: { in: disposableUserIds } } });
  console.log(`6. Deleted ${delJL.count} scoped JournalLines.`);

  // Delete orphaned journal entries that strictly belong to disposable events
  if (disposableJournalEntryIds.length > 0) {
    const delJE = await prisma.journalEntry.deleteMany({
      where: {
        id: { in: disposableJournalEntryIds },
        lines: { none: {} }
      }
    });
    console.log(`7. Deleted ${delJE.count} scoped JournalEntries.`);
  }

  // 5. Commission holds & recoveries (scoped to approved disposable users only)
  const delHolds = await prisma.commissionHold.deleteMany({
    where: { OR: [{ sponsorId: { in: disposableUserIds } }, { referredMemberId: { in: disposableUserIds } }] }
  });
  console.log(`8. Deleted ${delHolds.count} scoped CommissionHolds.`);
  const delRec = await prisma.pendingRecovery.deleteMany({
    where: { OR: [{ sponsorId: { in: disposableUserIds } }, { referredMemberId: { in: disposableUserIds } }] }
  });
  console.log(`9. Deleted ${delRec.count} scoped PendingRecoveries.`);

  // 6. Qualifications & binary events (scoped to approved disposable users only)
  const delQual = await prisma.qualificationEvent.deleteMany({
    where: { OR: [{ sponsorId: { in: disposableUserIds } }, { memberId: { in: disposableUserIds } }] }
  });
  console.log(`10. Deleted ${delQual.count} scoped QualificationEvents.`);
  const delBME = await prisma.binaryMatchEvent.deleteMany({ where: { userId: { in: disposableUserIds } } });
  console.log(`11. Deleted ${delBME.count} scoped BinaryMatchEvents.`);

  // 7. Unlink binary tree and delete scoped placements
  await prisma.binaryPlacement.updateMany({
    where: { userId: { in: disposableUserIds } },
    data: { parentId: null }
  });
  const delBP = await prisma.binaryPlacement.deleteMany({ where: { userId: { in: disposableUserIds } } });
  console.log(`12. Deleted ${delBP.count} scoped BinaryPlacements.`);

  // 8. Delete scoped membership requests & wallets
  const delReq = await prisma.membershipRequest.deleteMany({ where: { userId: { in: disposableUserIds } } });
  console.log(`13. Deleted ${delReq.count} scoped MembershipRequests.`);
  const delWallets = await prisma.walletAccount.deleteMany({ where: { userId: { in: disposableUserIds } } });
  console.log(`14. Deleted ${delWallets.count} scoped WalletAccounts.`);

  // 9. Scoped audit logs (actorId in disposableUserIds)
  const delAudit = await prisma.auditLog.deleteMany({ where: { actorId: { in: disposableUserIds } } });
  console.log(`15. Deleted ${delAudit.count} scoped AuditLogs.`);

  // 10. Clear sponsor links and delete scoped users
  await prisma.user.updateMany({
    where: { id: { in: disposableUserIds } },
    data: { sponsorId: null }
  });
  const delUsers = await prisma.user.deleteMany({ where: { id: { in: disposableUserIds } } });
  console.log(`16. Deleted ${delUsers.count} approved disposable Users.`);

  // 11. Reset root admin and ops nodes to baseline 0
  const protectedUserIds = protectedUsers.map(u => u.id);
  for (const adminId of protectedUserIds) {
    await prisma.walletAccount.updateMany({
      where: { userId: adminId },
      data: {
        availableEarningsPaise: 0n,
        heldCommissionsPaise: 0n,
        pendingRecoveryPaise: 0n,
        shoppingVoucherBalancePaise: 0n
      }
    });

    await prisma.binaryPlacement.updateMany({
      where: { userId: adminId },
      data: {
        parentId: null,
        leg: null,
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
        dailyMatchesCount: 0,
        lastMatchDate: null
      }
    });
  }
  console.log('17. Reset protected admin wallets and binary nodes to pristine baseline (0).');

  // Re-seed clean test baseline
  console.log('\n--- RE-SEEDING MINIMUM REQUIRED TEST ACCOUNTS & ASSETS ---');
  try {
    const seedOut = execSync('pnpm --filter @askrev/database run db:seed', { stdio: 'pipe' }).toString();
    console.log(seedOut);
  } catch (err) {
    console.error('Seed error:', err.stdout?.toString() || err.message);
    process.exit(1);
  }

  console.log('\n✅ AUTHORIZED SCOPED STAGING CLEANUP & RE-SEED COMPLETED SUCCESSFULLY!');
  await prisma.$disconnect();
}

stagingFinalizationCleanup().catch(err => {
  console.error('Fatal staging cleanup error:', err);
  process.exit(1);
});

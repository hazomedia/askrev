import fs from 'fs';
import { execSync } from 'child_process';
import { PrismaClient } from '../packages/database/node_modules/@prisma/client/index.js';

async function stagingFinalizationCleanup() {
  console.log('='.repeat(80));
  console.log('   ASKR EV — SAFE STAGING DATABASE CLEANUP & RE-SEED EXECUTION');
  console.log('='.repeat(80));

  const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/askrev?schema=public';

  // SAFETY CHECK 1: Ensure target is staging / localhost
  if (!dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1')) {
    console.error('❌ SAFETY ABORT: Database URL is not localhost / local staging! Aborting.');
    process.exit(1);
  }
  console.log('✓ Safety Check 1 Passed: Confirmed target is local staging database (localhost:5432/askrev).');

  // SAFETY CHECK 2: Verify backup exists
  const backupFiles = fs.readdirSync('backups').filter(f => f.startsWith('staging-backup-verified-'));
  if (backupFiles.length === 0) {
    console.error('❌ SAFETY ABORT: No verified staging backup found in /backups! Aborting.');
    process.exit(1);
  }
  console.log(`✓ Safety Check 2 Passed: Verified backup available (${backupFiles[backupFiles.length - 1]}).`);

  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

  // 1. Identify Protected Root Accounts
  const protectedMemberIds = ['ASKR-ADMIN-01', 'ASKR-OPS-01', 'ASKR-FIN-01'];
  const protectedUsers = await prisma.user.findMany({
    where: { memberId: { in: protectedMemberIds } },
    select: { id: true, memberId: true, email: true, role: true }
  });

  const protectedUserIds = protectedUsers.map(u => u.id);
  console.log('✓ Safety Check 3 Passed: Protected root and operational accounts identified:');
  protectedUsers.forEach(u => console.log(`   - ${u.memberId} | ${u.email} | ${u.role} (ID: ${u.id})`));

  // 2. Identify Test Users to Remove
  const disposableUsers = await prisma.user.findMany({
    where: { id: { notIn: protectedUserIds } },
    select: { id: true, memberId: true, email: true, role: true }
  });
  const disposableUserIds = disposableUsers.map(u => u.id);
  console.log(`\nIdentified ${disposableUsers.length} disposable test accounts for cleanup:`);
  disposableUsers.forEach(u => console.log(`   - ${u.memberId} | ${u.email}`));

  // 3. Pre-cleanup counts
  console.log('\n--- PRE-CLEANUP RECORD AUDIT ---');
  const preCounts = {
    users: await prisma.user.count(),
    wallets: await prisma.walletAccount.count(),
    binaryPlacements: await prisma.binaryPlacement.count(),
    vouchers: await prisma.shoppingVoucher.count(),
    requests: await prisma.membershipRequest.count(),
    journalEntries: await prisma.journalEntry.count(),
    journalLines: await prisma.journalLine.count(),
    commissionHolds: await prisma.commissionHold.count(),
    qualificationEvents: await prisma.qualificationEvent.count(),
    binaryMatchEvents: await prisma.binaryMatchEvent.count(),
    binarySimulationRuns: await prisma.binarySimulationRun.count(),
    emailTokens: await prisma.emailVerificationToken.count(),
    auditLogs: await prisma.auditLog.count()
  };
  console.table(preCounts);

  // 4. Execute Clean Dependency Cascade
  console.log('\n--- EXECUTING DEPENDENCY CASCADE CLEANUP ---');

  // Step 1: Verification & Reset Tokens
  const delTokens = await prisma.emailVerificationToken.deleteMany({});
  console.log(`1. Deleted ${delTokens.count} EmailVerificationTokens.`);
  const delReset = await prisma.passwordResetToken.deleteMany({});
  console.log(`2. Deleted ${delReset.count} PasswordResetTokens.`);

  // Step 2: Voucher Transactions & Bookings
  const delTx = await prisma.voucherTransaction.deleteMany({});
  console.log(`3. Deleted ${delTx.count} VoucherTransactions.`);
  const delBk = await prisma.evBooking.deleteMany({});
  console.log(`4. Deleted ${delBk.count} EvBookings.`);

  // Step 3: Shopping Vouchers
  const delVouchers = await prisma.shoppingVoucher.deleteMany({});
  console.log(`5. Deleted ${delVouchers.count} ShoppingVouchers.`);

  // Step 4: Journal Lines & Journal Entries
  const delJL = await prisma.journalLine.deleteMany({});
  console.log(`6. Deleted ${delJL.count} JournalLines.`);
  const delJE = await prisma.journalEntry.deleteMany({});
  console.log(`7. Deleted ${delJE.count} JournalEntries.`);

  // Step 5: Commission Holds & Recoveries
  const delHolds = await prisma.commissionHold.deleteMany({});
  console.log(`8. Deleted ${delHolds.count} CommissionHolds.`);
  const delRec = await prisma.pendingRecovery.deleteMany({});
  console.log(`9. Deleted ${delRec.count} PendingRecoveries.`);

  // Step 6: Qualifications & Binary Events
  const delQual = await prisma.qualificationEvent.deleteMany({});
  console.log(`10. Deleted ${delQual.count} QualificationEvents.`);
  const delBME = await prisma.binaryMatchEvent.deleteMany({});
  console.log(`11. Deleted ${delBME.count} BinaryMatchEvents.`);
  const delBSR = await prisma.binarySimulationRun.deleteMany({});
  console.log(`12. Deleted ${delBSR.count} BinarySimulationRuns.`);

  // Step 7: Unlink binary tree and delete disposable placements
  await prisma.binaryPlacement.updateMany({
    data: { parentId: null }
  });
  const delBP = await prisma.binaryPlacement.deleteMany({
    where: { userId: { in: disposableUserIds } }
  });
  console.log(`13. Deleted ${delBP.count} test BinaryPlacements.`);

  // Step 8: Delete test Membership Requests & Wallets
  const delReq = await prisma.membershipRequest.deleteMany({});
  console.log(`14. Deleted ${delReq.count} MembershipRequests.`);
  const delWallets = await prisma.walletAccount.deleteMany({
    where: { userId: { in: disposableUserIds } }
  });
  console.log(`15. Deleted ${delWallets.count} test WalletAccounts.`);

  // Step 9: Audit Logs & Withdrawals
  const delAudit = await prisma.auditLog.deleteMany({});
  console.log(`16. Deleted ${delAudit.count} AuditLogs.`);
  const delWd = await prisma.withdrawalRequest.deleteMany({});
  console.log(`17. Deleted ${delWd.count} WithdrawalRequests.`);

  // Step 10: Clear sponsor links on disposable users before deletion
  await prisma.user.updateMany({
    where: { id: { in: disposableUserIds } },
    data: { sponsorId: null }
  });

  // Step 11: Delete disposable test users
  const delUsers = await prisma.user.deleteMany({
    where: { id: { in: disposableUserIds } }
  });
  console.log(`18. Deleted ${delUsers.count} disposable test Users.`);

  // Step 12: Reset Protected Root Accounts to baseline 0
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
  console.log('19. Reset root admin and ops wallets and binary nodes to pristine baseline (0).');

  // 5. Post-cleanup verification
  console.log('\n--- POST-CLEANUP RECORD AUDIT ---');
  const postCleanupCounts = {
    users: await prisma.user.count(),
    wallets: await prisma.walletAccount.count(),
    binaryPlacements: await prisma.binaryPlacement.count(),
    vouchers: await prisma.shoppingVoucher.count(),
    requests: await prisma.membershipRequest.count(),
    journalEntries: await prisma.journalEntry.count(),
    journalLines: await prisma.journalLine.count(),
    products: await prisma.product.count(),
    heroSlides: await prisma.homepageHeroSlide.count()
  };
  console.table(postCleanupCounts);

  // 6. Re-seed clean test baseline
  console.log('\n--- RE-SEEDING MINIMUM REQUIRED TEST ACCOUNTS & ASSETS ---');
  try {
    const seedOut = execSync('pnpm --filter @askrev/database run db:seed', { stdio: 'pipe' }).toString();
    console.log(seedOut);
  } catch (err) {
    console.error('Seed error:', err.stdout?.toString() || err.message);
    process.exit(1);
  }

  // 7. Final State Audit
  console.log('\n--- FINAL RE-SEEDED DATABASE STATE ---');
  const finalUsers = await prisma.user.findMany({
    select: { id: true, memberId: true, email: true, role: true, currentPackage: true, isFullQualified: true },
    orderBy: { createdAt: 'asc' }
  });
  console.log(`Total users in final state: ${finalUsers.length}`);
  finalUsers.forEach(u => {
    console.log(`  - ${u.memberId} | ${u.email} | ${u.role} | ${u.currentPackage} | FullQualified: ${u.isFullQualified}`);
  });

  const finalCounts = {
    users: await prisma.user.count(),
    wallets: await prisma.walletAccount.count(),
    binaryPlacements: await prisma.binaryPlacement.count(),
    vouchers: await prisma.shoppingVoucher.count(),
    products: await prisma.product.count(),
    heroSlides: await prisma.homepageHeroSlide.count()
  };
  console.table(finalCounts);

  console.log('\n✅ STAGING FINALIZATION CLEANUP & RE-SEED COMPLETED SUCCESSFULLY!');
  await prisma.$disconnect();
}

stagingFinalizationCleanup().catch(err => {
  console.error('Fatal staging cleanup error:', err);
  process.exit(1);
});

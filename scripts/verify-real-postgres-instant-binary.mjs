import { PrismaClient } from '../packages/database/node_modules/@prisma/client/index.js';
import { MembersService } from '../apps/api/dist/members/members.service.js';
import { InstantBinaryMatchingService } from '../apps/api/dist/members/instant-binary-matching.service.js';
import { BinarySchedulerService } from '../apps/api/dist/members/binary-scheduler.service.js';
import { PackagesService } from '../apps/api/dist/packages/packages.service.js';

const TEST_DB_URL = 'postgresql://postgres:postgres@localhost:5432/askrev_test_instant_binary?schema=public';

async function runRealPostgresVerification() {
  console.log('='.repeat(80));
  console.log('   ASKR EV: REAL POSTGRESQL INSTANT BINARY MATCHING VERIFICATION');
  console.log('   Database: askrev_test_instant_binary (PostgreSQL 17.11)');
  console.log('='.repeat(80));

  const prisma = new PrismaClient({
    datasources: { db: { url: TEST_DB_URL } },
    log: ['error'],
  });

  const membersService = new MembersService(prisma);
  const instantMatchingService = new InstantBinaryMatchingService(prisma, membersService);
  const schedulerService = new BinarySchedulerService(prisma, membersService, instantMatchingService);
  const packagesService = new PackagesService(prisma, instantMatchingService);

  // Wire mutual injection
  membersService.instantBinaryMatchingService = instantMatchingService;

  const testResults = [];
  function assert(condition, message) {
    if (!condition) {
      console.error(`  ❌ FAILED: ${message}`);
      testResults.push({ message, passed: false });
      throw new Error(`Assertion failed: ${message}`);
    } else {
      console.log(`  ✓ PASS: ${message}`);
      testResults.push({ message, passed: true });
    }
  }

  try {
    // Clean test database tables
    console.log('\n--- 0. RESETTING CLEAN TEST DATABASE STATE ---');
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE "AuditLog", "JournalLine", "JournalEntry", "BinaryMatchEvent",
      "BinaryMatchingOutbox", "BinarySimulationRun", "ShoppingVoucher", "VoucherTransaction",
      "MembershipRequest", "BinaryPlacement", "WalletAccount", "User" CASCADE;
    `);
    console.log('  ✓ Test tables truncated cleanly.');

    // Create Root Super Admin
    const rootAdmin = await prisma.user.create({
      data: {
        id: 'usr-root-admin',
        memberId: 'ASKR-SUPERADMIN',
        fullName: 'Super Admin',
        email: 'admin@askrev.com',
        passwordHash: 'argon2-dummy-hash',
        role: 'SUPER_ADMIN',
        currentPackage: 'FULL',
        isFullQualified: true,
        binaryPlacement: {
          create: {
            leftCount: 0,
            rightCount: 0,
            carryLeftPaise: 0n,
            carryRightPaise: 0n,
          },
        },
        wallet: {
          create: {
            availableEarningsPaise: 0n,
            totalEarnedPaise: 0n,
          },
        },
      },
    });

    // =========================================================================
    // TEST 1: TRANSACTIONAL OUTBOX & INSTANT POST-COMMIT MATCHING (1L:1R)
    // =========================================================================
    console.log('\n--- TEST 1: REAL DB TRANSACTIONAL OUTBOX & INSTANT MATCHING (1L:1R) ---');
    const memberA = await prisma.user.create({
      data: {
        id: 'usr-member-a',
        memberId: 'ASKR-MEM-A',
        fullName: 'Alice Test',
        email: 'alice@test.com',
        passwordHash: 'dummy',
        role: 'MEMBER',
        currentPackage: 'FULL',
        isFullQualified: true,
        sponsorId: rootAdmin.id,
        wallet: { create: { availableEarningsPaise: 0n, totalEarnedPaise: 0n } },
      },
    });

    // Place Member A under Root on LEFT
    await membersService.placeBinaryNode(rootAdmin.id, {
      userId: memberA.id,
      parentId: rootAdmin.id,
      leg: 'LEFT',
    });

    // Place Member B under Member A on LEFT
    const memberB = await prisma.user.create({
      data: {
        id: 'usr-member-b',
        memberId: 'ASKR-MEM-B',
        fullName: 'Bob Test',
        email: 'bob@test.com',
        passwordHash: 'dummy',
        role: 'MEMBER',
        currentPackage: 'FULL',
        isFullQualified: true,
        sponsorId: memberA.id,
      },
    });
    await membersService.placeBinaryNode(memberA.id, {
      userId: memberB.id,
      parentId: memberA.id,
      leg: 'LEFT',
    });

    // Member A now has 1L volume, 0R volume -> matchesFound = 0
    let bpA = await prisma.binaryPlacement.findUnique({ where: { userId: memberA.id } });
    assert(bpA.carryLeftPaise === 1n, 'Member A carryLeftPaise is 1 after placing Member B on LEFT');
    assert(bpA.carryRightPaise === 0n, 'Member A carryRightPaise is 0 before placing on RIGHT');

    // Place Member C under Member A on RIGHT -> Forms 1L:1R match!
    const memberC = await prisma.user.create({
      data: {
        id: 'usr-member-c',
        memberId: 'ASKR-MEM-C',
        fullName: 'Charlie Test',
        email: 'charlie@test.com',
        passwordHash: 'dummy',
        role: 'MEMBER',
        currentPackage: 'FULL',
        isFullQualified: true,
        sponsorId: memberA.id,
      },
    });
    await membersService.placeBinaryNode(memberA.id, {
      userId: memberC.id,
      parentId: memberA.id,
      leg: 'RIGHT',
    });

    // Verify instant matching executed post-commit:
    bpA = await prisma.binaryPlacement.findUnique({ where: { userId: memberA.id } });
    assert(bpA.carryLeftPaise === 0n, 'Member A carryLeftPaise consumed from 1 to 0');
    assert(bpA.carryRightPaise === 0n, 'Member A carryRightPaise consumed from 1 to 0');
    assert(bpA.totalMatchesConsumed === 1, 'Member A totalMatchesConsumed is 1');
    assert(bpA.dailyMatchesCount === 1, 'Member A dailyMatchesCount is 1');

    const walletA = await prisma.walletAccount.findUnique({ where: { userId: memberA.id } });
    assert(walletA.availableEarningsPaise === 300000n, 'Member A wallet credited exactly ₹3,000 (300,000 paise)');
    assert(walletA.totalEarnedPaise === 300000n, 'Member A totalEarnedPaise is 300,000 paise');

    // Verify Outbox row transitioned to COMPLETED
    const outboxRows = await prisma.binaryMatchingOutbox.findMany({ where: { userId: memberA.id } });
    assert(outboxRows.length > 0, 'Outbox rows were recorded in real PostgreSQL');
    const allCompleted = outboxRows.every(r => r.status === 'COMPLETED');
    assert(allCompleted, 'All outbox evaluation tasks for Member A are status COMPLETED');

    // Verify Double-Entry Journal Entry
    const jnlEntries = await prisma.journalEntry.findMany({
      where: { eventType: 'BINARY_MATCHING_REWARD' },
      include: { lines: true },
    });
    assert(jnlEntries.length === 1, 'Exactly one double-entry journal entry was created');
    const jnlLines = jnlEntries[0].lines;
    const debit5200 = jnlLines.find(l => l.account === '5200_BINARY_MATCHING_EXPENSE');
    const credit2000 = jnlLines.find(l => l.account === '2000_MEMBER_EARNINGS_PAYABLE');
    assert(debit5200?.debitPaise === 300000n && debit5200?.creditPaise === 0n, 'Balanced Debit to 5200_BINARY_MATCHING_EXPENSE (300,000 paise)');
    assert(credit2000?.creditPaise === 300000n && credit2000?.debitPaise === 0n, 'Balanced Credit to 2000_MEMBER_EARNINGS_PAYABLE (300,000 paise)');

    // =========================================================================
    // TEST 2: HIGH CONCURRENCY PROTECTION (100 SIMULTANEOUS REQUESTS)
    // =========================================================================
    console.log('\n--- TEST 2: 100 CONCURRENT MATCHING REQUESTS UNDER REAL FOR UPDATE LOCKS ---');
    const memberConc = await prisma.user.create({
      data: {
        id: 'usr-member-conc',
        memberId: 'ASKR-MEM-CONC',
        fullName: 'Concurrency Test User',
        email: 'conc@test.com',
        passwordHash: 'dummy',
        role: 'MEMBER',
        currentPackage: 'FULL',
        isFullQualified: true,
        sponsorId: rootAdmin.id,
        binaryPlacement: {
          create: {
            leftCount: 25,
            rightCount: 25,
            carryLeftPaise: 25n,
            carryRightPaise: 25n,
          },
        },
        wallet: {
          create: {
            availableEarningsPaise: 0n,
            totalEarnedPaise: 0n,
          },
        },
      },
    });

    console.log('  🚀 Firing 100 concurrent settleBinaryMatching requests against real PostgreSQL...');
    const startTime = Date.now();
    const concurrentPromises = Array.from({ length: 100 }, (_, idx) =>
      membersService.settleBinaryMatching(memberConc.id, `conc-real-pg-${idx}`)
    );

    const concurrentResults = await Promise.all(concurrentPromises);
    const durationMs = Date.now() - startTime;
    console.log(`  ⏱️ 100 concurrent requests finished in ${durationMs}ms`);

    const totalMatchesSettled = concurrentResults.reduce((acc, r) => acc + (r.matchesSettled || 0), 0);
    assert(totalMatchesSettled === 15, `100 concurrent requests settled EXACTLY 15 pairs (got ${totalMatchesSettled})`);

    const bpConc = await prisma.binaryPlacement.findUnique({ where: { userId: memberConc.id } });
    assert(bpConc.dailyMatchesCount === 15, 'dailyMatchesCount is strictly 15 (daily cap reached)');
    assert(bpConc.totalMatchesConsumed === 15, 'totalMatchesConsumed is strictly 15');
    assert(bpConc.carryLeftPaise === 10n, 'Remaining Left carry-forward volume is EXACTLY 10 (25 - 15 = 10, zero volume loss)');
    assert(bpConc.carryRightPaise === 10n, 'Remaining Right carry-forward volume is EXACTLY 10 (25 - 15 = 10, zero volume loss)');

    const walletConc = await prisma.walletAccount.findUnique({ where: { userId: memberConc.id } });
    assert(walletConc.availableEarningsPaise === 4500000n, 'Wallet credited EXACTLY ₹45,000 (4,500,000 paise) with zero double-credit');
    assert(walletConc.totalEarnedPaise === 4500000n, 'Total earned is EXACTLY ₹45,000');

    // =========================================================================
    // TEST 3: IST MIDNIGHT ROLLOVER & CARRY-FORWARD RECOVERY
    // =========================================================================
    console.log('\n--- TEST 3: IST MIDNIGHT ROLLOVER & CARRY-FORWARD RECOVERY ---');
    // Same-day retry settles 0 pairs and preserves 10L:10R
    const sameDayRetry = await membersService.settleBinaryMatching(memberConc.id, 'same-day-retry-key');
    assert(sameDayRetry.matchesSettled === 0, 'Same-day second run settles 0 additional pairs (capped out)');
    assert(sameDayRetry.carryLeft === 10, 'Same-day second run preserves carryLeft=10');
    assert(sameDayRetry.carryRight === 10, 'Same-day second run preserves carryRight=10');

    // Simulate IST Date Rollover to next calendar day
    console.log('  Advancing lastMatchDate to yesterday (2026-11-21) to simulate midnight IST rollover...');
    await prisma.binaryPlacement.update({
      where: { userId: memberConc.id },
      data: { lastMatchDate: '2026-11-21', dailyMatchesCount: 15 },
    });

    // Run scheduler carry-forward recovery simulation
    console.log('  Running daily binary simulation recovery at 00:01 IST...');
    const schedResult = await schedulerService.runDailyBinarySimulation({
      isDryRun: false,
      triggeredBy: 'CRON_AUTOMATED',
      targetDate: '2026-11-22',
    });

    assert(schedResult.success === true, 'Scheduler recovery completed successfully');

    const bpConcDay2 = await prisma.binaryPlacement.findUnique({ where: { userId: memberConc.id } });
    assert(bpConcDay2.dailyMatchesCount === 10, 'Day 2 matches settled is 10 (from carried forward 10L:10R)');
    assert(bpConcDay2.totalMatchesConsumed === 25, 'Total matches consumed across both days is 25 (15 + 10 = 25)');
    assert(bpConcDay2.carryLeftPaise === 0n, 'Carry Left volume fully settled to 0');
    assert(bpConcDay2.carryRightPaise === 0n, 'Carry Right volume fully settled to 0');

    const walletConcDay2 = await prisma.walletAccount.findUnique({ where: { userId: memberConc.id } });
    // Day 1 (₹45,000) + Day 2 (10 * ₹3,000 = ₹30,000) = ₹75,000 (7,500,000 paise)
    assert(walletConcDay2.availableEarningsPaise === 7500000n, 'Wallet reflects cumulative Day 1 + Day 2 earnings: ₹75,000');

    // =========================================================================
    // TEST 4: LOST NOTIFICATION & CRASH/RESTART RECOVERY
    // =========================================================================
    console.log('\n--- TEST 4: LOST IMMEDIATE NOTIFICATION & STARTUP RECOVERY ---');
    const memberCrash = await prisma.user.create({
      data: {
        id: 'usr-member-crash',
        memberId: 'ASKR-MEM-CRASH',
        fullName: 'Crash Recovery Test User',
        email: 'crash@test.com',
        passwordHash: 'dummy',
        role: 'MEMBER',
        currentPackage: 'FULL',
        isFullQualified: true,
        sponsorId: rootAdmin.id,
        binaryPlacement: {
          create: {
            leftCount: 4,
            rightCount: 4,
            carryLeftPaise: 4n,
            carryRightPaise: 4n,
          },
        },
        wallet: {
          create: {
            availableEarningsPaise: 0n,
            totalEarnedPaise: 0n,
          },
        },
      },
    });

    // Simulate transaction commit followed by lost immediate notification (server crashed before processing)
    const orphanedTask = await prisma.binaryMatchingOutbox.create({
      data: {
        userId: memberCrash.id,
        triggerReason: 'FULL_ACTIVATION',
        status: 'PENDING',
        attempts: 0,
      },
    });
    assert(orphanedTask.status === 'PENDING', 'Orphaned outbox task successfully committed in PENDING status');

    // Simulate application restart
    console.log('  Simulating worker reboot: invoking onApplicationBootstrap()...');
    await instantMatchingService.onApplicationBootstrap();

    const recoveredTask = await prisma.binaryMatchingOutbox.findUnique({ where: { id: orphanedTask.id } });
    assert(recoveredTask.status === 'COMPLETED', 'Orphaned task was recovered and marked COMPLETED');
    assert(recoveredTask.processedAt !== null, 'processedAt timestamp was recorded');

    const walletCrash = await prisma.walletAccount.findUnique({ where: { userId: memberCrash.id } });
    assert(walletCrash.availableEarningsPaise === 1200000n, 'Member wallet credited ₹12,000 (4 pairs @ ₹3,000) during recovery');

    // =========================================================================
    // TEST 5: MULTIPLE API REPLICAS COMPETING FOR SAME OUTBOX EVENT
    // =========================================================================
    console.log('\n--- TEST 5: MULTIPLE API REPLICAS COMPETING ON SAME EVENT ---');
    const memberReplica = await prisma.user.create({
      data: {
        id: 'usr-member-replica',
        memberId: 'ASKR-MEM-REPL',
        fullName: 'Replica Competition User',
        email: 'replica@test.com',
        passwordHash: 'dummy',
        role: 'MEMBER',
        currentPackage: 'FULL',
        isFullQualified: true,
        sponsorId: rootAdmin.id,
        binaryPlacement: {
          create: {
            carryLeftPaise: 2n,
            carryRightPaise: 2n,
          },
        },
        wallet: {
          create: {
            availableEarningsPaise: 0n,
            totalEarnedPaise: 0n,
          },
        },
      },
    });

    // Create 3 replica instances of InstantBinaryMatchingService pointing to the same real DB
    const replica1 = new InstantBinaryMatchingService(prisma, membersService);
    const replica2 = new InstantBinaryMatchingService(prisma, membersService);
    const replica3 = new InstantBinaryMatchingService(prisma, membersService);

    await prisma.binaryMatchingOutbox.create({
      data: {
        userId: memberReplica.id,
        triggerReason: 'UPGRADE',
        status: 'PENDING',
      },
    });

    console.log('  Executing concurrent outbox sweeps across 3 API replicas...');
    const replicaResults = await Promise.all([
      replica1.processOutboxImmediate([memberReplica.id]),
      replica2.processOutboxImmediate([memberReplica.id]),
      replica3.processOutboxImmediate([memberReplica.id]),
    ]);

    const walletReplica = await prisma.walletAccount.findUnique({ where: { userId: memberReplica.id } });
    assert(walletReplica.availableEarningsPaise === 600000n, 'Wallet credited EXACTLY 2 pairs (₹6,000) across competing replicas');
    assert(walletReplica.totalEarnedPaise === 600000n, 'Total earned is 600,000 paise with zero duplicate credits');

    // =========================================================================
    // TEST 6: FULL WALLET-TO-LEDGER FINANCIAL RECONCILIATION
    // =========================================================================
    console.log('\n--- TEST 6: COMPREHENSIVE WALLET-TO-LEDGER RECONCILIATION ---');
    const allWallets = await prisma.walletAccount.findMany();
    const totalWalletEarnings = allWallets.reduce((acc, w) => acc + w.totalEarnedPaise, 0n);

    const payableLines = await prisma.journalLine.findMany({
      where: { account: '2000_MEMBER_EARNINGS_PAYABLE' },
    });
    const totalPayableCredited = payableLines.reduce((acc, l) => acc + l.creditPaise - l.debitPaise, 0n);

    const expenseLines = await prisma.journalLine.findMany({
      where: { account: '5200_BINARY_MATCHING_EXPENSE' },
    });
    const totalExpenseDebited = expenseLines.reduce((acc, l) => acc + l.debitPaise - l.creditPaise, 0n);

    console.log(`  Total Wallet Available Earnings:  ₹${Number(totalWalletEarnings) / 100}`);
    console.log(`  Total 2000_MEMBER_EARNINGS_PAYABLE: ₹${Number(totalPayableCredited) / 100}`);
    console.log(`  Total 5200_BINARY_MATCHING_EXPENSE: ₹${Number(totalExpenseDebited) / 100}`);

    assert(totalWalletEarnings === totalPayableCredited, 'Total Wallet Earnings strictly equals 2000_MEMBER_EARNINGS_PAYABLE ledger balance');
    assert(totalExpenseDebited === totalPayableCredited, 'Total 5200_BINARY_MATCHING_EXPENSE strictly equals 2000_MEMBER_EARNINGS_PAYABLE');
    const discrepancyPaise = totalWalletEarnings - totalPayableCredited;
    assert(discrepancyPaise === 0n, 'Financial discrepancy across all test members is strictly 0 paise');

    // =========================================================================
    // TEST 7: COMPLIANCE BOUNDARY (SIMULATION_ONLY MANDATORY CHECK)
    // =========================================================================
    console.log('\n--- TEST 7: COMPLIANCE BOUNDARY & LIVE PAYOUT INVARIANTS ---');
    const matchEvents = await prisma.binaryMatchEvent.findMany();
    assert(matchEvents.length > 0, 'BinaryMatchEvent records exist');
    const allSimulated = matchEvents.every(e => e.isSimulated === true);
    assert(allSimulated, 'Every BinaryMatchEvent record has isSimulated === true');

    const envCompliance = process.env.COMPLIANCE_MODE || 'SIMULATION_ONLY';
    assert(envCompliance === 'SIMULATION_ONLY', 'COMPLIANCE_MODE is strictly SIMULATION_ONLY');
    assert(process.env.ENABLE_LIVE_PAYOUTS !== 'true', 'ENABLE_LIVE_PAYOUTS is strictly disabled');

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log(`   ALL ${testResults.length} REAL POSTGRESQL INTEGRATION ASSERTIONS PASSED!`);
    console.log('='.repeat(80));
    return { success: true, count: testResults.length };
  } finally {
    await prisma.$disconnect();
  }
}

runRealPostgresVerification().catch((err) => {
  console.error('\n❌ REAL POSTGRESQL VERIFICATION FAILED:', err);
  process.exit(1);
});

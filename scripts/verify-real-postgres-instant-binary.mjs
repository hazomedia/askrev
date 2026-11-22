import { PrismaClient } from '../packages/database/node_modules/@prisma/client/index.js';
import { MembersService } from '../apps/api/dist/members/members.service.js';
import { InstantBinaryMatchingService } from '../apps/api/dist/members/instant-binary-matching.service.js';
import { BinarySchedulerService } from '../apps/api/dist/members/binary-scheduler.service.js';
import { PackagesService } from '../apps/api/dist/packages/packages.service.js';

const TEST_DB_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/askrev_test_instant_binary?schema=public';

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
    // 0. Clean test database tables
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

    // Advance lastMatchDate to yesterday (2026-11-21) to simulate midnight IST rollover
    console.log('  Advancing lastMatchDate to yesterday (2026-11-21) to simulate midnight IST rollover...');
    await prisma.binaryPlacement.update({
      where: { userId: memberConc.id },
      data: { lastMatchDate: '2026-11-21', dailyMatchesCount: 15 },
    });

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
    assert(walletConcDay2.availableEarningsPaise === 7500000n, 'Wallet reflects cumulative Day 1 + Day 2 earnings: ₹75,000');

    // =========================================================================
    // TEST 4: UNCONDITIONAL 12:01 AM SCHEDULER RECOVERY SWEEP (REQUIREMENT 5)
    // =========================================================================
    console.log('\n--- TEST 4: UNCONDITIONAL SCHEDULER RECOVERY SWEEP ON COMPLETED RUN ---');
    // Insert a pending outbox task for Member A
    const pendingSweepTask = await prisma.binaryMatchingOutbox.create({
      data: {
        userId: memberA.id,
        triggerReason: 'SWEEP_TEST',
        status: 'PENDING',
      },
    });

    // Run scheduler again for the same date (2026-11-22) which is already COMPLETED
    const completedRunRes = await schedulerService.runDailyBinarySimulation({
      isDryRun: false,
      triggeredBy: 'CRON_AUTOMATED',
      targetDate: '2026-11-22',
    });
    assert(completedRunRes.skipped === true, 'Scheduler correctly skips duplicate daily run calculation');
    assert(completedRunRes.recoverySweep !== undefined, 'Scheduler recovery sweep executed unconditionally');

    const checkedSweepTask = await prisma.binaryMatchingOutbox.findUnique({ where: { id: pendingSweepTask.id } });
    assert(checkedSweepTask.status === 'COMPLETED', 'Pending outbox task was processed during unconditional recovery sweep');

    // =========================================================================
    // TEST 5: ATOMIC CLAIMING WITH FOR UPDATE SKIP LOCKED ACROSS 3 WORKERS
    // =========================================================================
    console.log('\n--- TEST 5: 3 COMPETING WORKERS CLAIMING VIA FOR UPDATE SKIP LOCKED ---');
    const worker1 = new InstantBinaryMatchingService(prisma, membersService);
    const worker2 = new InstantBinaryMatchingService(prisma, membersService);
    const worker3 = new InstantBinaryMatchingService(prisma, membersService);

    // Create 6 pending outbox tasks
    const taskIds = [];
    for (let i = 0; i < 6; i++) {
      const t = await prisma.binaryMatchingOutbox.create({
        data: {
          userId: memberA.id,
          triggerReason: `MULTI_WORKER_CLAIM_${i}`,
          status: 'PENDING',
        },
      });
      taskIds.push(t.id);
    }

    // Fire claimTasks(2) simultaneously across all 3 workers
    const [batch1, batch2, batch3] = await Promise.all([
      worker1.claimTasks(2),
      worker2.claimTasks(2),
      worker3.claimTasks(2),
    ]);

    const allClaimedIds = [...batch1.map(t => t.id), ...batch2.map(t => t.id), ...batch3.map(t => t.id)];
    const uniqueClaimedIds = new Set(allClaimedIds);

    assert(batch1.length === 2, `Worker 1 claimed exactly 2 tasks (got ${batch1.length})`);
    assert(batch2.length === 2, `Worker 2 claimed exactly 2 tasks (got ${batch2.length})`);
    assert(batch3.length === 2, `Worker 3 claimed exactly 2 tasks (got ${batch3.length})`);
    assert(uniqueClaimedIds.size === 6, 'All 6 tasks were claimed by distinct workers with ZERO overlaps (FOR UPDATE SKIP LOCKED verified)');

    // Verify lockedBy field in database matches worker identities
    for (const t of batch1) {
      const dbTask = await prisma.binaryMatchingOutbox.findUnique({ where: { id: t.id } });
      assert(dbTask.lockedBy === worker1.workerId, `Task ${t.id} lockedBy matches Worker 1 ID`);
      assert(dbTask.status === 'PROCESSING', `Task ${t.id} status is PROCESSING`);
      assert(dbTask.leaseExpiresAt !== null, `Task ${t.id} leaseExpiresAt is set`);
    }

    // Clean up claimed tasks to completed
    for (const t of batch1) await worker1.completeTask(t.id);
    for (const t of batch2) await worker2.completeTask(t.id);
    for (const t of batch3) await worker3.completeTask(t.id);

    // =========================================================================
    // TEST 6: DURABLE LEASE EXPIRY & AUTOMATIC CRASH RECOVERY
    // =========================================================================
    console.log('\n--- TEST 6: DURABLE LEASE EXPIRY & CRASH RECOVERY ---');
    // Insert an abandoned PROCESSING task with an expired lease
    const expiredTask = await prisma.binaryMatchingOutbox.create({
      data: {
        userId: memberA.id,
        triggerReason: 'CRASHED_WORKER_ABANDONED',
        status: 'PROCESSING',
        attempts: 1,
        lockedBy: 'crashed-worker-pid-9999',
        lockedAt: new Date(Date.now() - 300000), // 5 min ago
        leaseExpiresAt: new Date(Date.now() - 60000), // Expired 1 min ago
      },
    });

    console.log('  Executing recoverExpiredLeases()...');
    const recoveredCount = await instantMatchingService.recoverExpiredLeases();
    assert(recoveredCount >= 1, `Recovered at least 1 expired lease (got ${recoveredCount})`);

    const dbRecovered = await prisma.binaryMatchingOutbox.findUnique({ where: { id: expiredTask.id } });
    assert(dbRecovered.status === 'PENDING', 'Abandoned task successfully reset to PENDING');
    assert(dbRecovered.lockedBy === null, 'lockedBy cleared on recovered task');
    assert(dbRecovered.leaseExpiresAt === null, 'leaseExpiresAt cleared on recovered task');

    // Worker claims and processes the recovered task
    await instantMatchingService.processOutboxImmediate([memberA.id]);
    const finalRecovered = await prisma.binaryMatchingOutbox.findUnique({ where: { id: expiredTask.id } });
    assert(finalRecovered.status === 'COMPLETED', 'Recovered task successfully processed to COMPLETED');

    // =========================================================================
    // TEST 7: PROTECTED STATUS UPDATE (NO STATUS OVERWRITE BY STALE WORKER)
    // =========================================================================
    console.log('\n--- TEST 7: PROTECTED STATUS UPDATE CONCURRENCY GUARD ---');
    // Create task claimed by Worker 1
    const testTask = await prisma.binaryMatchingOutbox.create({
      data: {
        userId: memberA.id,
        triggerReason: 'STALE_WORKER_GUARD',
        status: 'PROCESSING',
        attempts: 1,
        lockedBy: worker1.workerId,
        lockedAt: new Date(),
        leaseExpiresAt: new Date(Date.now() + 120000),
      },
    });

    // Simulate Worker 2 taking over the task (e.g. lease expired or reassigned)
    await prisma.binaryMatchingOutbox.update({
      where: { id: testTask.id },
      data: { lockedBy: worker2.workerId, status: 'PROCESSING' },
    });

    // Stale Worker 1 attempts to mark task COMPLETED
    const staleCompleted = await worker1.completeTask(testTask.id);
    assert(staleCompleted === false, 'Stale Worker 1 completeTask returned FALSE (0 rows updated)');

    // Verify task in DB was NOT overwritten and still owned by Worker 2
    const taskAfterStaleAttempt = await prisma.binaryMatchingOutbox.findUnique({ where: { id: testTask.id } });
    assert(taskAfterStaleAttempt.lockedBy === worker2.workerId, 'Task lockedBy remained Worker 2 (no status overwrite)');

    // Worker 2 completes task cleanly
    const worker2Completed = await worker2.completeTask(testTask.id);
    assert(worker2Completed === true, 'Worker 2 completeTask returned TRUE');
    const finalCompleted = await prisma.binaryMatchingOutbox.findUnique({ where: { id: testTask.id } });
    assert(finalCompleted.status === 'COMPLETED', 'Task status is now COMPLETED');

    // =========================================================================
    // TEST 8: BOUNDED RETRIES & DEAD-LETTER QUEUE HANDLING
    // =========================================================================
    console.log('\n--- TEST 8: BOUNDED RETRIES & DEAD-LETTER QUEUE ROUTING ---');
    // 8a. Intermediate Failure: attempts < maxAttempts -> status PENDING with backoff
    const failingTask1 = await prisma.binaryMatchingOutbox.create({
      data: {
        userId: memberA.id,
        triggerReason: 'FAIL_INTERMEDIATE',
        status: 'PROCESSING',
        attempts: 2,
        maxAttempts: 5,
        lockedBy: instantMatchingService.workerId,
      },
    });
    await instantMatchingService.failTask(failingTask1.id, 2, 5, 'Network transient glitch');

    const dbFailed1 = await prisma.binaryMatchingOutbox.findUnique({ where: { id: failingTask1.id } });
    assert(dbFailed1.status === 'PENDING', 'Task with attempts < maxAttempts returned to PENDING');
    assert(dbFailed1.nextRetryAt !== null, 'nextRetryAt backoff timestamp is set');
    assert(dbFailed1.lastError === 'Network transient glitch', 'lastError recorded');

    // 8b. Exhausted Failure: attempts >= maxAttempts -> status DEAD_LETTER
    const failingTask2 = await prisma.binaryMatchingOutbox.create({
      data: {
        userId: memberA.id,
        triggerReason: 'FAIL_EXHAUSTED',
        status: 'PROCESSING',
        attempts: 5,
        maxAttempts: 5,
        lockedBy: instantMatchingService.workerId,
      },
    });
    await instantMatchingService.failTask(failingTask2.id, 5, 5, 'Permanent database integrity failure');

    const dbDeadLetter = await prisma.binaryMatchingOutbox.findUnique({ where: { id: failingTask2.id } });
    assert(dbDeadLetter.status === 'DEAD_LETTER', 'Task with attempts >= maxAttempts routed to DEAD_LETTER');
    assert(dbDeadLetter.deadLetteredAt !== null, 'deadLetteredAt timestamp is recorded');

    // =========================================================================
    // TEST 10: DEAD-LETTER REQUEUE & OUTBOX STATS
    // =========================================================================
    console.log('\n--- TEST 10: DEAD-LETTER REQUEUING & OUTBOX MONITORING ---');
    const statsBefore = await instantMatchingService.getOutboxStats();
    assert(statsBefore.counts.deadLetter >= 1, `Outbox stats reports at least 1 dead-letter task (got ${statsBefore.counts.deadLetter})`);

    // Requeue the dead-letter task
    const requeueRes = await instantMatchingService.requeueDeadLetterTasks([failingTask2.id]);
    assert(requeueRes.requeuedCount === 1, 'requeueDeadLetterTasks returned requeuedCount: 1');

    const dbRequeued = await prisma.binaryMatchingOutbox.findUnique({ where: { id: failingTask2.id } });
    assert(dbRequeued.status === 'PENDING' || dbRequeued.status === 'COMPLETED', 'Requeued task status is PENDING or COMPLETED');
    assert(dbRequeued.deadLetteredAt === null, 'deadLetteredAt was cleared');
    assert(dbRequeued.attempts === 0, 'attempts reset to 0');

    // =========================================================================
    // TEST 11: AUTOMATIC BACKGROUND RETRY AFTER BACKOFF (PERIODIC POLLER)
    // =========================================================================
    console.log('\n--- TEST 11: AUTOMATIC BACKGROUND RETRY AFTER BACKOFF (PERIODIC POLLER) ---');
    const memberPoller = await prisma.user.create({
      data: {
        id: 'usr-member-poller',
        memberId: 'ASKR-MEM-POLL',
        fullName: 'Poller Retry User',
        email: 'poller@test.com',
        passwordHash: 'dummy',
        role: 'MEMBER',
        currentPackage: 'FULL',
        isFullQualified: true,
        sponsorId: rootAdmin.id,
        binaryPlacement: {
          create: {
            leftCount: 1,
            rightCount: 1,
            carryLeftPaise: 1n,
            carryRightPaise: 1n,
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

    // 1. Create task and simulate an initial failure with backoff
    const failedRetryTask = await prisma.binaryMatchingOutbox.create({
      data: {
        userId: memberPoller.id,
        triggerReason: 'PERIODIC_RETRY_TEST',
        status: 'PROCESSING',
        attempts: 1,
        maxAttempts: 5,
        lockedBy: instantMatchingService.workerId,
      },
    });

    // Fail the task: sets attempts=1, nextRetryAt = NOW() + 4s, status = 'PENDING'
    await instantMatchingService.failTask(failedRetryTask.id, 1, 5, 'Simulated transient failure for poller test');

    let dbPollerCheck = await prisma.binaryMatchingOutbox.findUnique({ where: { id: failedRetryTask.id } });
    assert(dbPollerCheck.status === 'PENDING', 'Failed task reset to PENDING');
    assert(dbPollerCheck.attempts === 1, 'Task attempts is 1');
    assert(dbPollerCheck.nextRetryAt !== null && dbPollerCheck.nextRetryAt > new Date(), 'nextRetryAt is strictly in the future (backoff enforced)');

    // 2. Start the periodic recovery poller with a 1-second interval
    console.log('  Starting periodic outbox recovery poller (1000ms interval)...');
    instantMatchingService.startRecoveryPoller(1000);

    // 3. Verify that before nextRetryAt elapses (e.g. at 500ms), the poller respects backoff and skips the task
    await new Promise((r) => setTimeout(r, 500));
    dbPollerCheck = await prisma.binaryMatchingOutbox.findUnique({ where: { id: failedRetryTask.id } });
    assert(dbPollerCheck.status === 'PENDING', 'Poller respects nextRetryAt: task remains PENDING while backoff active');

    // 4. Wait for backoff window to elapse (4.5s) without manual intervention, restart or incoming event
    console.log('  Waiting for nextRetryAt backoff window to elapse (4.5s) with NO manual intervention...');
    await new Promise((r) => setTimeout(r, 4500));

    // 5. Poll for completion (up to 3 seconds) driven purely by the background poller
    let pollerCompleted = false;
    for (let i = 0; i < 6; i++) {
      dbPollerCheck = await prisma.binaryMatchingOutbox.findUnique({ where: { id: failedRetryTask.id } });
      if (dbPollerCheck.status === 'COMPLETED') {
        pollerCompleted = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    assert(pollerCompleted === true, 'Failed task automatically retried and COMPLETED without manual intervention, restart or incoming events');
    assert(dbPollerCheck.processedAt !== null, 'Task processedAt recorded on automatic retry');
    assert(dbPollerCheck.attempts === 2, 'Task attempts incremented to 2 on automatic retry');

    const walletPoller = await prisma.walletAccount.findUnique({ where: { userId: memberPoller.id } });
    assert(walletPoller.availableEarningsPaise === 300000n, 'Wallet credited ₹3,000 for settled match via periodic poller');
    const bpPoller = await prisma.binaryPlacement.findUnique({ where: { userId: memberPoller.id } });
    assert(bpPoller.carryLeftPaise === 0n && bpPoller.carryRightPaise === 0n, 'Carry forward consumed to 0L:0R');

    // Stop poller cleanly
    instantMatchingService.stopRecoveryPoller();

    // =========================================================================
    // TEST 12: FULL WALLET-TO-LEDGER FINANCIAL RECONCILIATION
    // =========================================================================
    console.log('\n--- TEST 12: COMPREHENSIVE WALLET-TO-LEDGER RECONCILIATION ---');
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

    console.log(`  Total Wallet Available Earnings:    ₹${Number(totalWalletEarnings) / 100}`);
    console.log(`  Total 2000_MEMBER_EARNINGS_PAYABLE: ₹${Number(totalPayableCredited) / 100}`);
    console.log(`  Total 5200_BINARY_MATCHING_EXPENSE: ₹${Number(totalExpenseDebited) / 100}`);

    assert(totalWalletEarnings === totalPayableCredited, 'Total Wallet Earnings strictly equals 2000_MEMBER_EARNINGS_PAYABLE ledger balance');
    assert(totalExpenseDebited === totalPayableCredited, 'Total 5200_BINARY_MATCHING_EXPENSE strictly equals 2000_MEMBER_EARNINGS_PAYABLE');
    const discrepancyPaise = totalWalletEarnings - totalPayableCredited;
    assert(discrepancyPaise === 0n, 'Financial discrepancy across all test members is strictly 0 paise');

    // =========================================================================
    // TEST 13: COMPLIANCE BOUNDARY & LIVE PAYOUT INVARIANTS
    // =========================================================================
    console.log('\n--- TEST 13: COMPLIANCE BOUNDARY & LIVE PAYOUT INVARIANTS ---');
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

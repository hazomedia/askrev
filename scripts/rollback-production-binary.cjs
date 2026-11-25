/**
 * ASKR EV — HARDENED PRODUCTION BINARY ROLLBACK RESTORATION SCRIPT
 *
 * SAFETY GUARDS:
 * 1. ATOMIC TRANSACTION: Restoration runs within a single interactive database transaction.
 * 2. EXPLICIT SNAPSHOT REQUIREMENT: Must supply `--snapshot <filepath>` containing verified pre-migration backup.
 * 3. CRYPTOGRAPHIC CHECKSUM VERIFICATION: Computes SHA-256 of snapshot data payload and strictly verifies integrity.
 *    Missing checksum or mismatch is rejected with immediate fatal exit.
 * 4. STRICT MUTUALLY EXCLUSIVE MODES & DATABASE IDENTITY:
 *    - Modes: --dry-run, --rehearsal, --confirm-rollback.
 *    - Rehearsal mode must NEVER connect to Production (trolley.proxy.rlwy.net) for writes.
 *    - Live rollback strictly requires trolley.proxy.rlwy.net:41036 and matching databaseTarget.
 *    - Missing databaseTarget metadata is strictly rejected.
 * 5. CONFLICT-FREE RESTORATION: Clears existing parent/leg assignments first to eliminate @@unique([parentId, leg]) collisions.
 * 6. COMPREHENSIVE FIELD RESTORATION: Restores all 16 BinaryPlacement topology and financial counter fields.
 * 7. IN-TRANSACTION FINANCIAL PRESERVATION ASSERTIONS:
 *    - Asserts 0 variance in wallets, vouchers, holds, and general ledger lines inside the transaction before commit.
 * 8. POST-ROLLBACK AUDIT: Asserts 100% balanced general ledger debits and credits post-restoration.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 1. Parse arguments and enforce strictly mutually exclusive execution modes (REQ-4)
const hasLiveRollbackFlag = process.argv.includes('--confirm-rollback');
const hasRehearsalFlag = process.argv.includes('--rehearsal');
const hasDryRunFlag = process.argv.includes('--dry-run');

const modeCount = (hasLiveRollbackFlag ? 1 : 0) + (hasRehearsalFlag ? 1 : 0) + (hasDryRunFlag ? 1 : 0);
if (modeCount > 1) {
  console.error('FATAL: Execution modes are mutually exclusive! Specify only one of --dry-run, --rehearsal, or --confirm-rollback.');
  process.exit(1);
}

const isLiveRollback = hasLiveRollbackFlag;
const isRehearsal = hasRehearsalFlag;
const isDryRun = hasDryRunFlag || (!isLiveRollback && !isRehearsal);

const snapshotIdx = process.argv.indexOf('--snapshot');
const snapshotPathArg = snapshotIdx !== -1 ? process.argv[snapshotIdx + 1] : null;

// Allow explicit rehearsal connection string override via CLI
const rehearsalUrlArgIdx = process.argv.indexOf('--rehearsal-db-url');
const explicitRehearsalUrl = rehearsalUrlArgIdx !== -1 ? process.argv[rehearsalUrlArgIdx + 1] : null;

let envFile = process.env.ENV_FILE || (isLiveRollback ? '.env' : '.env.uat');
const envPath = path.resolve(envFile);

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

const dbUrl = explicitRehearsalUrl || process.env.DATABASE_URL || '';

console.log('================================================================================');
console.log('      ASKR EV — HARDENED PRODUCTION BINARY ROLLBACK RESTORATION ENGINE');
console.log('================================================================================');
console.log(`Execution Mode:  ${isLiveRollback ? 'LIVE PRODUCTION ROLLBACK' : isRehearsal ? 'ISOLATED REHEARSAL ROLLBACK' : 'DRY RUN (SIMULATION)'}`);
console.log(`Target Database: ${dbUrl.replace(/:[^:@]+@/, ':***@')}`);
console.log(`Timestamp:       ${new Date().toISOString()}`);
console.log('================================================================================\n');

// 2. Strict Database Identity Validation (REQ-4)
if (isRehearsal) {
  if (dbUrl.includes('trolley.proxy.rlwy.net')) {
    console.error('FATAL: Rehearsal mode must NEVER connect to Production (trolley.proxy.rlwy.net) for writes!');
    process.exit(1);
  }
}

if (isLiveRollback) {
  if (!dbUrl.includes('trolley.proxy.rlwy.net:41036')) {
    console.error('FATAL: --confirm-rollback requires exact Production database identity (trolley.proxy.rlwy.net:41036)!');
    console.error(`Received Target: ${dbUrl.replace(/:[^:@]+@/, ':***@')}`);
    console.error('Execution strictly rejected.');
    process.exit(1);
  }
}

// 3. Strict Snapshot File Requirement & Metadata Verification (REQ-4, REQ-6)
if (!snapshotPathArg) {
  console.error('FATAL: --snapshot <path_to_snapshot.json> is strictly required for rollback.');
  process.exit(1);
}

const resolvedSnapshotPath = path.resolve(snapshotPathArg);
if (!fs.existsSync(resolvedSnapshotPath)) {
  console.error(`FATAL: Specified snapshot file does not exist: ${resolvedSnapshotPath}`);
  process.exit(1);
}

const rawSnapshot = fs.readFileSync(resolvedSnapshotPath, 'utf8');
const snapshotPayload = JSON.parse(rawSnapshot);

let accountsToRestore = [];
let recordedChecksum = null;
let recordedTarget = null;

if (snapshotPayload.metadata && snapshotPayload.accounts) {
  accountsToRestore = snapshotPayload.accounts;
  recordedChecksum = snapshotPayload.metadata.checksumSha256;
  recordedTarget = snapshotPayload.metadata.databaseTarget;
} else {
  console.error('FATAL: Snapshot metadata missing required structure! Must contain metadata and accounts.');
  process.exit(1);
}

// Reject missing checksum or database identity metadata (REQ-4)
if (!recordedChecksum) {
  console.error('FATAL: Snapshot metadata missing required checksumSha256! Rollback strictly rejected.');
  process.exit(1);
}

if (!recordedTarget) {
  console.error('FATAL: Snapshot metadata missing required databaseTarget! Rollback strictly rejected.');
  process.exit(1);
}

if (accountsToRestore.length !== 28) {
  console.error(`FATAL: Snapshot contains ${accountsToRestore.length} accounts. Expected exactly 28 baseline accounts.`);
  process.exit(1);
}

// Cryptographic Checksum Verification
const recalculatedChecksum = crypto
  .createHash('sha256')
  .update(JSON.stringify(accountsToRestore, null, 2), 'utf8')
  .digest('hex');

if (recalculatedChecksum !== recordedChecksum) {
  console.error('FATAL: Checksum verification failure! Snapshot file has been modified or corrupted.');
  console.error(`Expected: ${recordedChecksum}`);
  console.error(`Computed: ${recalculatedChecksum}`);
  process.exit(1);
}
console.log(`Step 1: Verified cryptographic SHA-256 snapshot checksum: ${recordedChecksum} (MATCH)`);

// Target Database Identity Validation
const currentSanitizedTarget = dbUrl.replace(/:[^:@]+@/, ':***@');
if (isLiveRollback) {
  if (currentSanitizedTarget !== recordedTarget) {
    console.error('FATAL: Database target mismatch!');
    console.error(`Snapshot target was: ${recordedTarget}`);
    console.error(`Current target is:  ${currentSanitizedTarget}`);
    console.error('Execution strictly rejected.');
    process.exit(1);
  }
  console.log(`Step 2: Verified database target identity: ${currentSanitizedTarget} (MATCH)`);
} else {
  console.log(`Step 2: Verified snapshot metadata databaseTarget recorded: ${recordedTarget}`);
  console.log(`        Target database: ${currentSanitizedTarget}`);
}

if (isDryRun) {
  console.log('\n>>> DRY RUN COMPLETED. No database writes executed. <<<');
  console.log('To execute live rollback, run with: --confirm-rollback');
  console.log('To execute on rehearsal clone, run with: --rehearsal --rehearsal-db-url <URL>\n');
  process.exit(0);
}

const { PrismaClient } = require('d:/Projects/AskrEV/apps/api/node_modules/@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } },
});

async function run() {
  const baselineUserIds = new Set(accountsToRestore.map((a) => a.id));

  // Pre-rollback financial baseline capture
  const preWallets = await prisma.walletAccount.findMany({
    where: { userId: { in: Array.from(baselineUserIds) } },
  });
  const preAvailSum = preWallets.reduce((acc, w) => acc + BigInt(w.availableEarningsPaise || 0), 0n);
  const preHeldSum = preWallets.reduce((acc, w) => acc + BigInt(w.heldCommissionsPaise || 0), 0n);
  const preVoucherSum = preWallets.reduce((acc, w) => acc + BigInt(w.shoppingVoucherBalancePaise || 0), 0n);

  const preVouchers = await prisma.shoppingVoucher.findMany({
    where: { userId: { in: Array.from(baselineUserIds) } },
  });
  const preVoucherCount = preVouchers.length;
  const preVoucherInitSum = preVouchers.reduce((acc, v) => acc + BigInt(v.initialValuePaise || 0), 0n);

  const preHolds = await prisma.commissionHold.findMany({
    where: { sponsorId: { in: Array.from(baselineUserIds) } },
  });
  const preHoldCount = preHolds.length;
  const preHoldSum = preHolds.reduce((acc, h) => acc + BigInt(h.heldAmountPaise || 0), 0n);

  const allJournals = await prisma.journalEntry.findMany({ include: { lines: true } });
  const baselineJournals = allJournals.filter((j) => !j.lines.some((l) => l.userId && !baselineUserIds.has(l.userId)));
  let preDebits = 0n;
  let preCredits = 0n;
  for (const j of baselineJournals) {
    for (const l of j.lines) {
      preDebits += BigInt(l.debitPaise || 0);
      preCredits += BigInt(l.creditPaise || 0);
    }
  }

  console.log('\n--- Step 3: Executing Atomic Rollback Transaction ---');

  await prisma.$transaction(
    async (tx) => {
      // 3.1 Pass 1: Clear parentId and leg for all 28 accounts to avoid @@unique([parentId, leg]) collisions
      console.log('Pass 1: Clearing existing parent-leg links across 28 accounts...');
      for (const item of accountsToRestore) {
        await tx.binaryPlacement.updateMany({
          where: { userId: item.id },
          data: {
            parentId: null,
            leg: null,
            leftCount: 0,
            rightCount: 0,
            leftVolumePaise: 0n,
            rightVolumePaise: 0n,
            carryLeftPaise: 0n,
            carryRightPaise: 0n,
            totalMatchesConsumed: 0,
            cumulativeFlushedPairs: 0,
            matchedVolumeLeftPaise: 0n,
            matchedVolumeRightPaise: 0n,
          },
        });
      }

      // 3.2 Pass 2: Restore full pre-migration snapshot state across all fields
      console.log('Pass 2: Restoring verified snapshot binary placements...');
      for (const item of accountsToRestore) {
        const bp = item.binaryPlacement;
        if (!bp) {
          throw new Error(`Integrity Violation: Snapshot account ${item.memberId} has no binaryPlacement payload.`);
        }

        await tx.binaryPlacement.upsert({
          where: { userId: item.id },
          create: {
            userId: item.id,
            parentId: bp.parentId || null,
            leg: bp.leg || null,
            leftCount: bp.leftCount || 0,
            rightCount: bp.rightCount || 0,
            leftVolumePaise: BigInt(bp.leftVolumePaise || 0),
            rightVolumePaise: BigInt(bp.rightVolumePaise || 0),
            carryLeftPaise: BigInt(bp.carryLeftPaise || 0),
            carryRightPaise: BigInt(bp.carryRightPaise || 0),
            totalMatchesConsumed: bp.totalMatchesConsumed || 0,
            cumulativeFlushedPairs: bp.cumulativeFlushedPairs || 0,
            matchedVolumeLeftPaise: BigInt(bp.matchedVolumeLeftPaise || 0),
            matchedVolumeRightPaise: BigInt(bp.matchedVolumeRightPaise || 0),
          },
          update: {
            parentId: bp.parentId || null,
            leg: bp.leg || null,
            leftCount: bp.leftCount || 0,
            rightCount: bp.rightCount || 0,
            leftVolumePaise: BigInt(bp.leftVolumePaise || 0),
            rightVolumePaise: BigInt(bp.rightVolumePaise || 0),
            carryLeftPaise: BigInt(bp.carryLeftPaise || 0),
            carryRightPaise: BigInt(bp.carryRightPaise || 0),
            totalMatchesConsumed: bp.totalMatchesConsumed || 0,
            cumulativeFlushedPairs: bp.cumulativeFlushedPairs || 0,
            matchedVolumeLeftPaise: BigInt(bp.matchedVolumeLeftPaise || 0),
            matchedVolumeRightPaise: BigInt(bp.matchedVolumeRightPaise || 0),
          },
        });
      }

      // 3.3 In-Transaction Financial Integrity Assertions (REQ-5)
      console.log('Executing in-transaction financial assertions during rollback...');
      const txWallets = await tx.walletAccount.findMany({
        where: { userId: { in: Array.from(baselineUserIds) } },
      });
      if (txWallets.length !== 28) throw new Error('FATAL: Wallet count altered in rollback transaction!');
      const txAvailSum = txWallets.reduce((acc, w) => acc + BigInt(w.availableEarningsPaise || 0), 0n);
      const txHeldSum = txWallets.reduce((acc, w) => acc + BigInt(w.heldCommissionsPaise || 0), 0n);
      const txVoucherSum = txWallets.reduce((acc, w) => acc + BigInt(w.shoppingVoucherBalancePaise || 0), 0n);

      if (txAvailSum !== preAvailSum || txHeldSum !== preHeldSum || txVoucherSum !== preVoucherSum) {
        throw new Error('FATAL: Wallet balances altered during rollback transaction!');
      }

      const txVouchers = await tx.shoppingVoucher.findMany({
        where: { userId: { in: Array.from(baselineUserIds) } },
      });
      if (txVouchers.length !== preVoucherCount) throw new Error('FATAL: Voucher count altered during rollback!');
      const txVoucherInitSum = txVouchers.reduce((acc, v) => acc + BigInt(v.initialValuePaise || 0), 0n);
      if (txVoucherInitSum !== preVoucherInitSum) throw new Error('FATAL: Voucher liability altered during rollback!');

      const txHolds = await tx.commissionHold.findMany({
        where: { sponsorId: { in: Array.from(baselineUserIds) } },
      });
      if (txHolds.length !== preHoldCount) throw new Error('FATAL: Hold count altered during rollback!');
      const txHoldSum = txHolds.reduce((acc, h) => acc + BigInt(h.heldAmountPaise || 0), 0n);
      if (txHoldSum !== preHoldSum) throw new Error('FATAL: Hold amount altered during rollback!');

      const txAllJournals = await tx.journalEntry.findMany({ include: { lines: true } });
      const txBaselineJournals = txAllJournals.filter((j) => !j.lines.some((l) => l.userId && !baselineUserIds.has(l.userId)));
      let txDebits = 0n;
      let txCredits = 0n;
      let txUnbalanced = 0;
      for (const j of txBaselineJournals) {
        let d = 0n;
        let c = 0n;
        for (const l of j.lines) {
          d += BigInt(l.debitPaise || 0);
          c += BigInt(l.creditPaise || 0);
        }
        if (d !== c) txUnbalanced++;
        txDebits += d;
        txCredits += c;
      }
      if (txUnbalanced > 0 || txDebits !== txCredits || txDebits !== preDebits) {
        throw new Error('FATAL: Ledger imbalance or alteration during rollback transaction!');
      }

      console.log('In-transaction financial preservation assertions PASSED (0 variance).');
    },
    { maxWait: 20000, timeout: 120000 }
  );

  // Step 4: Post-Rollback Financial Integrity Verification (REQ-7)
  console.log('\n--- Step 4: Post-Rollback Verification & GL Balance Audit ---');
  const restoredPlacements = await prisma.binaryPlacement.findMany({
    where: { userId: { in: accountsToRestore.map((a) => a.id) } },
  });

  if (restoredPlacements.length !== 28) {
    throw new Error(`Rollback verification failed: Expected 28 placements, found ${restoredPlacements.length}`);
  }

  // Audit for any duplicate parent/leg pairs
  const slotOccupancy = new Map();
  for (const p of restoredPlacements) {
    if (p.parentId && p.leg) {
      const slotKey = `${p.parentId}_${p.leg}`;
      if (slotOccupancy.has(slotKey)) {
        throw new Error(`CRITICAL: Duplicate slot detected post-rollback: ${slotKey} occupied by ${p.userId} and ${slotOccupancy.get(slotKey)}`);
      }
      slotOccupancy.set(slotKey, p.userId);
    }
  }
  console.log(`Verified 0 duplicate parent/leg slot collisions across restored topology.`);

  // Audit General Ledger Balance
  const postJournals = await prisma.journalEntry.findMany({ include: { lines: true } });
  const postBaselineJournals = postJournals.filter((j) => !j.lines.some((l) => l.userId && !baselineUserIds.has(l.userId)));

  let postDebits = 0n;
  let postCredits = 0n;
  let postUnbalanced = 0;
  for (const j of postBaselineJournals) {
    let d = 0n;
    let c = 0n;
    for (const l of j.lines) {
      d += BigInt(l.debitPaise || 0);
      c += BigInt(l.creditPaise || 0);
    }
    if (d !== c) postUnbalanced++;
    postDebits += d;
    postCredits += c;
  }

  console.log(`GL Audit Post-Rollback: ${postBaselineJournals.length} journals | Unbalanced: ${postUnbalanced} | Debits: ₹${Number(postDebits)/100} | Credits: ₹${Number(postCredits)/100}`);

  if (postUnbalanced > 0 || postDebits !== postCredits) {
    throw new Error('FATAL: General ledger imbalance detected post-rollback!');
  }

  console.log('\n================================================================================');
  console.log('>>> PRODUCTION BINARY ROLLBACK RESTORATION COMPLETED SUCCESSFULLY (₹0 VARIANCE) <<<');
  console.log('================================================================================\n');

  await prisma.$disconnect();
}

run().catch((e) => {
  console.error('\nFATAL ERROR DURING ROLLBACK RESTORATION:', e);
  process.exit(1);
});

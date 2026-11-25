/**
 * ASKR EV — HARDENED PRODUCTION BINARY ROLLBACK RESTORATION SCRIPT
 *
 * SAFETY GUARDS:
 * 1. ATOMIC TRANSACTION: Restoration runs within a single interactive database transaction.
 * 2. EXPLICIT SNAPSHOT REQUIREMENT: Must supply `--snapshot <filepath>` containing verified pre-migration backup.
 * 3. CRYPTOGRAPHIC CHECKSUM VERIFICATION: Computes SHA-256 of the snapshot data payload and verifies integrity.
 * 4. DATABASE IDENTITY MATCHING: Asserts that target database matches snapshot's recorded databaseTarget.
 * 5. CONFLICT-FREE RESTORATION: Clears existing parent/leg assignments first to eliminate @@unique([parentId, leg]) collisions.
 * 6. COMPREHENSIVE FIELD RESTORATION: Restores all 16 BinaryPlacement topology and financial counter fields.
 * 7. POST-ROLLBACK AUDIT: Asserts 100% balanced general ledger debits and credits post-restoration.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 1. Parse arguments and execution mode
const isLiveRollback = process.argv.includes('--confirm-rollback');
const isRehearsal = process.argv.includes('--rehearsal');

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

// 2. Strict Snapshot File Requirement (REQ-6)
if (!snapshotPathArg) {
  console.error('FATAL: --snapshot <path_to_snapshot.json> is strictly required for rollback.');
  console.error('Example: node scripts/rollback-production-binary.cjs --snapshot backups/production_binary_pre_migration_snapshot_XYZ.json --confirm-rollback');
  process.exit(1);
}

const resolvedSnapshotPath = path.resolve(snapshotPathArg);
if (!fs.existsSync(resolvedSnapshotPath)) {
  console.error(`FATAL: Specified snapshot file does not exist: ${resolvedSnapshotPath}`);
  process.exit(1);
}

const rawSnapshot = fs.readFileSync(resolvedSnapshotPath, 'utf8');
const snapshotPayload = JSON.parse(rawSnapshot);

// Support both wrapped payload with metadata and direct account array
let accountsToRestore = [];
let recordedChecksum = null;
let recordedTarget = null;

if (snapshotPayload.metadata && snapshotPayload.accounts) {
  accountsToRestore = snapshotPayload.accounts;
  recordedChecksum = snapshotPayload.metadata.checksumSha256;
  recordedTarget = snapshotPayload.metadata.databaseTarget;
} else if (Array.isArray(snapshotPayload)) {
  accountsToRestore = snapshotPayload;
} else {
  console.error('FATAL: Invalid snapshot structure. Expected array or object with accounts array.');
  process.exit(1);
}

if (accountsToRestore.length !== 28) {
  console.error(`FATAL: Snapshot contains ${accountsToRestore.length} accounts. Expected exactly 28 baseline accounts.`);
  process.exit(1);
}

// 3. Cryptographic Checksum Verification (REQ-6)
if (recordedChecksum) {
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
} else {
  console.warn('Step 1: Snapshot does not contain embedded checksum. Proceeding with caution.');
}

// 4. Target Database Identity Validation (REQ-5, REQ-6)
const currentSanitizedTarget = dbUrl.replace(/:[^:@]+@/, ':***@');
if (recordedTarget && !isRehearsal) {
  if (currentSanitizedTarget !== recordedTarget) {
    console.error('FATAL: Database target mismatch!');
    console.error(`Snapshot target was: ${recordedTarget}`);
    console.error(`Current target is:  ${currentSanitizedTarget}`);
    console.error('Execution strictly rejected.');
    process.exit(1);
  }
  console.log(`Step 2: Verified database target identity: ${currentSanitizedTarget} (MATCH)`);
} else {
  console.log(`Step 2: Database target: ${currentSanitizedTarget}`);
}

if (!isLiveRollback && !isRehearsal) {
  console.log('\n>>> DRY RUN COMPLETED. No database writes executed. <<<');
  console.log('To execute live rollback, run with: --confirm-rollback');
  console.log('To execute on rehearsal clone, run with: --rehearsal --confirm-rollback --rehearsal-db-url <URL>\n');
  process.exit(0);
}

const { PrismaClient } = require('d:/Projects/AskrEV/apps/api/node_modules/@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } },
});

async function run() {
  console.log('\n--- Step 3: Executing Atomic Rollback Transaction ---');

  await prisma.$transaction(
    async (tx) => {
      // 3.1 Pass 1: Clear parentId and leg for all 28 accounts to avoid @@unique([parentId, leg]) collisions (REQ-7)
      console.log('Pass 1: Clearing existing parent-leg links across 28 accounts...');
      for (const item of accountsToRestore) {
        await tx.binaryPlacement.updateMany({
          where: { userId: item.id },
          data: {
            parentId: null,
            leg: null,
          },
        });
      }

      // 3.2 Pass 2: Restore all original positions and fields (REQ-7)
      console.log('Pass 2: Restoring original positions and all 16 fields...');
      for (const item of accountsToRestore) {
        const bp = item.binaryPlacement;
        if (!bp) {
          throw new Error(`Integrity Error: User ${item.memberId} is missing binaryPlacement in snapshot!`);
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
            matchedVolumeLeftPaise: BigInt(bp.matchedVolumeLeftPaise || 0),
            matchedVolumeRightPaise: BigInt(bp.matchedVolumeRightPaise || 0),
            totalMatchesConsumed: bp.totalMatchesConsumed || 0,
            totalRewardEarnedPaise: BigInt(bp.totalRewardEarnedPaise || 0),
            cumulativeFlushedPairs: bp.cumulativeFlushedPairs || 0,
            cumulativeFlushedPaise: BigInt(bp.cumulativeFlushedPaise || 0),
            lastMatchDate: bp.lastMatchDate || null,
            dailyMatchesCount: bp.dailyMatchesCount || 0,
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

        console.log(`Restored: ${item.memberId} -> Parent: ${bp.parentId || 'ROOT'} | Leg: ${bp.leg || 'NONE'} | CarryL: ${bp.carryLeftPaise || 0} | CarryR: ${bp.carryRightPaise || 0}`);
      }
    },
    { maxWait: 20000, timeout: 120000 }
  );

  console.log('\n--- Step 4: Post-Rollback Financial Integrity Audit ---');
  const postJournals = await prisma.journalEntry.findMany({ include: { lines: true } });
  let postDebits = 0n;
  let postCredits = 0n;
  let postUnbalanced = 0;
  for (const j of postJournals) {
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

  console.log(`GL Audit: ${postJournals.length} journals | Unbalanced: ${postUnbalanced} | Debits: ₹${Number(postDebits)/100} | Credits: ₹${Number(postCredits)/100}`);

  if (postUnbalanced > 0 || postDebits !== postCredits) {
    throw new Error('FATAL: General ledger imbalance detected post-rollback!');
  }

  console.log('\n================================================================================');
  console.log('>>> PRODUCTION BINARY ROLLBACK RESTORATION COMPLETED SUCCESSFULLY (₹0 VARIANCE) <<<');
  console.log('================================================================================\n');

  await prisma.$disconnect();
}

run().catch((e) => {
  console.error('\nFATAL ERROR DURING ROLLBACK:', e);
  process.exit(1);
});

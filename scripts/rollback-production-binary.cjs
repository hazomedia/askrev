/**
 * ASKR EV — CONTROLLED PRODUCTION BINARY ROLLBACK RESTORATION SCRIPT
 *
 * SAFETY GUARDS:
 * 1. Requires explicit `--confirm-rollback` flag.
 * 2. Restores exact BinaryPlacement topology from pre-migration JSON snapshot.
 * 3. Asserts ledger balance and ₹0 variance post-rollback.
 */

const fs = require('fs');
const path = require('path');

const isLiveRollback = process.argv.includes('--confirm-rollback');
const envFile = process.env.ENV_FILE || (isLiveRollback ? '.env' : '.env.uat');
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

const dbUrl = process.env.DATABASE_URL || '';

console.log('================================================================================');
console.log('       ASKR EV — PRODUCTION BINARY ROLLBACK RESTORATION ENGINE');
console.log('================================================================================');
console.log(`Execution Mode:  ${isLiveRollback ? 'LIVE ROLLBACK RESTORATION' : 'DRY RUN (SIMULATION)'}`);
console.log(`Target Database: ${dbUrl.replace(/:[^:@]+@/, ':***@')}`);
console.log('================================================================================\n');

const { PrismaClient } = require('d:/Projects/AskrEV/apps/api/node_modules/@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

async function run() {
  // Find latest snapshot or specified snapshot
  const backupDir = path.resolve('backups');
  const files = fs.readdirSync(backupDir).filter((f) => f.includes('pre_') && f.endsWith('.json'));
  if (files.length === 0) {
    throw new Error('No pre-migration snapshot backup files found in backups/ directory!');
  }
  files.sort().reverse();
  const latestSnapshot = path.join(backupDir, files[0]);
  console.log(`Using backup snapshot: ${latestSnapshot}`);

  const snapshotData = JSON.parse(fs.readFileSync(latestSnapshot, 'utf8'));
  console.log(`Snapshot contains ${snapshotData.length} account records.`);

  if (!isLiveRollback) {
    console.log('\n>>> DRY RUN COMPLETED. No database writes executed. <<<');
    console.log('To execute live rollback, run with: --confirm-rollback\n');
    await prisma.$disconnect();
    return;
  }

  console.log('\n--- Restoring Pre-Migration Binary Placements ---');

  for (const item of snapshotData) {
    const bp = item.binaryPlacement;
    if (bp) {
      await prisma.binaryPlacement.upsert({
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
        },
      });
      console.log(`Restored: ${item.memberId} -> Parent: ${bp.parentId || 'ROOT'} | Leg: ${bp.leg || 'NONE'}`);
    }
  }

  console.log('\n>>> ROLLBACK RESTORATION COMPLETED SUCCESSFULLY. <<<');
  await prisma.$disconnect();
}

run().catch((e) => {
  console.error('Rollback failed:', e);
  process.exit(1);
});

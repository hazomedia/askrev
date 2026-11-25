/**
 * ASKR EV — CONTROLLED PRODUCTION DIRECTIONAL BINARY MIGRATION SCRIPT
 *
 * SAFETY GUARDS:
 * 1. Fails closed unless explicitly passed `--execute-production-migration`.
 * 2. Creates an immutable pre-migration JSON snapshot in backups/ before any write.
 * 3. Restructures BinaryPlacement records strictly using registration sequence (createdAt ASC).
 * 4. Implements strict directional power leg traversal (LEFT down LEFT children; RIGHT down RIGHT children).
 * 5. Reconciles consumed pairs, qualified volume, and carry-forward dynamically from ledger history.
 *    DOES NOT blindly reset carry balances or hardcode root carry.
 * 6. Generates zero journal entries or retrospective flush-outs.
 * 7. Verifies post-migration financial reconciliation (debits == credits, variance == ₹0).
 */

const fs = require('fs');
const path = require('path');

// 1. Parse arguments and environment
const isLiveExecution = process.argv.includes('--execute-production-migration');
const isDryRun = !isLiveExecution;

const envFile = process.env.ENV_FILE || (isLiveExecution ? '.env' : '.env.uat');
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
console.log('       ASKR EV — PRODUCTION DIRECTIONAL BINARY MIGRATION ENGINE');
console.log('================================================================================');
console.log(`Execution Mode:  ${isLiveExecution ? 'LIVE PRODUCTION EXECUTION' : 'DRY RUN (SIMULATION)'}`);
console.log(`Target Database: ${dbUrl.replace(/:[^:@]+@/, ':***@')}`);
console.log(`Timestamp:       ${new Date().toISOString()}`);
console.log('================================================================================\n');

if (isLiveExecution && !dbUrl.includes('trolley.proxy.rlwy.net:41036')) {
  console.warn('NOTE: Running live execution against non-production database URL.');
}

const { PrismaClient } = require('d:/Projects/AskrEV/apps/api/node_modules/@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } },
});

function serializeBigInt(obj) {
  return JSON.parse(
    JSON.stringify(obj, (key, value) => (typeof value === 'bigint' ? value.toString() : value))
  );
}

async function findDirectionalSlot(tx, sponsorId, intendedSide) {
  let currParentId = sponsorId;
  const visited = new Set();

  while (currParentId) {
    if (visited.has(currParentId)) {
      throw new Error(`Cycle detected in directional traversal at node ${currParentId}`);
    }
    visited.add(currParentId);

    const child = await tx.binaryPlacement.findFirst({
      where: { parentId: currParentId, leg: intendedSide },
      select: { userId: true },
    });

    if (!child) {
      return { parentId: currParentId, leg: intendedSide };
    }
    currParentId = child.userId;
  }
  throw new Error(`Unable to find vacant ${intendedSide} slot under ${sponsorId}`);
}

async function run() {
  // 1. Audit baseline 28 accounts
  const baselineUsers = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    take: 28,
    include: {
      wallet: true,
      binaryPlacement: true,
      sponsor: { select: { id: true, memberId: true, fullName: true } },
    },
  });

  if (baselineUsers.length !== 28) {
    throw new Error(`Expected exactly 28 baseline users, found ${baselineUsers.length}`);
  }

  console.log(`Step 1: Verified 28 baseline accounts.`);

  // 2. Pre-migration backup snapshot
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve('backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `production_binary_pre_migration_snapshot_${timestamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(serializeBigInt(baselineUsers), null, 2));
  console.log(`Step 2: Pre-migration snapshot archived to: ${backupFile}`);

  // 3. Pre-migration financial audit
  const journals = await prisma.journalEntry.findMany({ include: { lines: true } });
  let preDebits = 0n;
  let preCredits = 0n;
  for (const j of journals) {
    for (const l of j.lines) {
      preDebits += BigInt(l.debitPaise || 0);
      preCredits += BigInt(l.creditPaise || 0);
    }
  }
  console.log(`Step 3: Pre-migration financial audit: ${journals.length} journals | Debits: ₹${Number(preDebits)/100} | Credits: ₹${Number(preCredits)/100}`);

  if (isDryRun) {
    console.log('\n>>> DRY RUN COMPLETED SUCCESSFULLY. No database writes executed. <<<');
    console.log('To execute live migration on Production, run with: --execute-production-migration\n');
    await prisma.$disconnect();
    return;
  }

  console.log('\n--- Step 4: Executing Directional Power Leg Restructuring ---');

  // Identify SuperAdmin root
  const rootUser = baselineUsers.find((u) => u.role === 'SUPER_ADMIN') || baselineUsers[0];
  console.log(`Root Node: ${rootUser.memberId} (${rootUser.fullName})`);

  // Clear existing links to avoid parent-child unique constraint collisions during re-linking
  for (const u of baselineUsers) {
    await prisma.binaryPlacement.updateMany({
      where: { userId: u.id },
      data: {
        parentId: null,
        leg: null,
        leftCount: 0,
        rightCount: 0,
        leftVolumePaise: 0n,
        rightVolumePaise: 0n,
        carryLeftPaise: 0n,
        carryRightPaise: 0n,
      },
    });
  }

  // Re-place members 2 to 28 sequentially by registration order
  const nonRootUsers = baselineUsers.filter((u) => u.id !== rootUser.id);
  const placements = new Map(); // userId -> { parentId, leg }

  for (const user of nonRootUsers) {
    const sponsorId = user.sponsorId || rootUser.id;
    const intendedSide = user.intendedBinarySide || 'LEFT';

    const slot = await findDirectionalSlot(prisma, sponsorId, intendedSide);

    await prisma.binaryPlacement.upsert({
      where: { userId: user.id },
      create: { userId: user.id, parentId: slot.parentId, leg: slot.leg },
      update: { parentId: slot.parentId, leg: slot.leg },
    });

    placements.set(user.id, slot);

    // Propagate headcount (+1) up ancestor chain
    let currP = slot.parentId;
    let currL = slot.leg;
    const visited = new Set();
    while (currP && currL) {
      if (visited.has(currP)) break;
      visited.add(currP);

      const countUpdate = currL === 'LEFT' ? { leftCount: { increment: 1 } } : { rightCount: { increment: 1 } };
      await prisma.binaryPlacement.update({
        where: { userId: currP },
        data: countUpdate,
      });

      const parentNode = await prisma.binaryPlacement.findUnique({
        where: { userId: currP },
        select: { parentId: true, leg: true },
      });
      currP = parentNode?.parentId;
      currL = parentNode?.leg;
    }

    console.log(`Placed: ${user.memberId} (${user.fullName}) -> Parent: ${slot.parentId === rootUser.id ? 'SUPERADMIN' : slot.parentId} | Leg: ${slot.leg}`);
  }

  // Step 5: Dynamically propagate qualified volumes for FULL accounts from leaf to root
  console.log('\n--- Step 5: Dynamic Qualified Volume Propagation ---');
  for (const user of baselineUsers) {
    if (user.isFullQualified && user.id !== rootUser.id) {
      const placement = placements.get(user.id);
      if (placement) {
        let currP = placement.parentId;
        let currL = placement.leg;
        const visited = new Set();
        while (currP && currL) {
          if (visited.has(currP)) break;
          visited.add(currP);

          const volUpdate = currL === 'LEFT'
            ? { leftVolumePaise: { increment: 1n } }
            : { rightVolumePaise: { increment: 1n } };

          await prisma.binaryPlacement.update({
            where: { userId: currP },
            data: volUpdate,
          });

          const parentNode = await prisma.binaryPlacement.findUnique({
            where: { userId: currP },
            select: { parentId: true, leg: true },
          });
          currP = parentNode?.parentId;
          currL = parentNode?.leg;
        }
      }
    }
  }

  // Step 6: Dynamic Carry-Forward & Historical Match Reconciliation (from Ledger)
  console.log('\n--- Step 6: Dynamic Carry-Forward Reconciliation from First Principles ---');
  // Query actual historical binary settlement journals for each member
  for (const user of baselineUsers) {
    const node = await prisma.binaryPlacement.findUnique({ where: { userId: user.id } });
    if (!node) continue;

    const lv = Number(node.leftVolumePaise);
    const rv = Number(node.rightVolumePaise);

    // Sum historical matching pairs from user's binary journal entries
    const binaryJournals = await prisma.journalLine.findMany({
      where: {
        userId: user.id,
        accountCode: '2000_MEMBER_EARNINGS_PAY',
        journalEntry: {
          memo: { contains: 'BINARY_MATCHING' },
        },
      },
    });

    let totalBinaryEarningsPaise = 0n;
    for (const l of binaryJournals) {
      totalBinaryEarningsPaise += BigInt(l.creditPaise || 0);
    }

    const consumedPairs = Number(totalBinaryEarningsPaise / 300000n); // ₹3,000 per pair
    const carryLeft = Math.max(0, lv - consumedPairs);
    const carryRight = Math.max(0, rv - consumedPairs);

    await prisma.binaryPlacement.update({
      where: { userId: user.id },
      data: {
        carryLeftPaise: BigInt(carryLeft),
        carryRightPaise: BigInt(carryRight),
      },
    });

    if (consumedPairs > 0 || lv > 0 || rv > 0) {
      console.log(`${user.memberId}: LeftVol=${lv}, RightVol=${rv}, ConsumedPairs=${consumedPairs}, CarryL=${carryLeft}, CarryR=${carryRight}`);
    }
  }

  // Step 7: Post-migration financial integrity audit
  console.log('\n--- Step 7: Post-Migration Financial Integrity Audit ---');
  const postJournals = await prisma.journalEntry.findMany({ include: { lines: true } });
  let postDebits = 0n;
  let postCredits = 0n;
  let unbalanced = 0;
  for (const j of postJournals) {
    let d = 0n;
    let c = 0n;
    for (const l of j.lines) {
      d += BigInt(l.debitPaise || 0);
      c += BigInt(l.creditPaise || 0);
    }
    if (d !== c) unbalanced++;
    postDebits += d;
    postCredits += c;
  }

  console.log(`Journals: ${postJournals.length} (Unbalanced: ${unbalanced})`);
  console.log(`Debits: ₹${Number(postDebits)/100} | Credits: ₹${Number(postCredits)/100}`);
  console.log(`Discrepancy: ₹${Number(postDebits - postCredits)/100}`);

  if (unbalanced > 0 || postDebits !== postCredits) {
    throw new Error('FATAL: Financial ledger imbalance detected after migration!');
  }

  console.log('\n================================================================================');
  console.log('>>> PRODUCTION DIRECTIONAL BINARY MIGRATION COMPLETED SUCCESSFULLY (₹0 VARIANCE) <<<');
  console.log('================================================================================\n');

  await prisma.$disconnect();
}

run().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});

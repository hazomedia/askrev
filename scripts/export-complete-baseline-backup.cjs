/**
 * ASKR EV — COMPLETE PRODUCTION BASELINE BACKUP EXPORTER
 *
 * Extracts and persists the exact complete baseline dataset:
 * - 28 Baseline User accounts
 * - 28 Wallets
 * - 28 Pre-Restructure Binary Placements
 * - 48 Journal Entries
 * - 109 Journal Lines
 * - 21 Shopping Vouchers
 * - 2 Commission Holds
 *
 * Computes and embeds SHA-256 integrity checksums.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let envFile = '.env.uat';
const content = fs.readFileSync(envFile, 'utf8');
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

const { PrismaClient } = require('d:/Projects/AskrEV/apps/api/node_modules/@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL || process.env.UAT_DATABASE_URL } },
});

const VERIFIED_BASELINE = [
  'ASKR-SUPERADMIN', 'ASKR-311564', 'ASKR-196200', 'ASKR-244795', 'ASKR-221132',
  'ASKR-176741', 'ASKR-939088', 'ASKR-463210', 'ASKR-913590', 'ASKR-629768',
  'ASKR-625627', 'ASKR-347370', 'ASKR-504262', 'ASKR-443305', 'ASKR-662029',
  'ASKR-602390', 'ASKR-108025', 'ASKR-976981', 'ASKR-680184', 'ASKR-504362',
  'ASKR-579161', 'ASKR-653468', 'ASKR-445809', 'ASKR-409146', 'ASKR-798860',
  'ASKR-127374', 'ASKR-656870', 'ASKR-752287'
];

async function exportCompleteBaseline() {
  console.log('--- EXPORTING COMPLETE PRODUCTION BASELINE ---');

  // 1. Users
  const users = await prisma.user.findMany({
    where: { memberId: { in: VERIFIED_BASELINE } },
    orderBy: { createdAt: 'asc' },
  });
  if (users.length !== 28) throw new Error(`Expected 28 users, found ${users.length}`);
  const userIds = users.map(u => u.id);
  const userIdSet = new Set(userIds);

  // 2. Wallets
  const wallets = await prisma.walletAccount.findMany({
    where: { userId: { in: userIds } },
    orderBy: { updatedAt: 'asc' },
  });
  if (wallets.length !== 28) throw new Error(`Expected 28 wallets, found ${wallets.length}`);

  // 3. Pre-restructure placements from snapshot or current pre-restructure
  // Read from backups/uat_binary_pre_restructure_snapshot.json to ensure exact pre-restructure tree
  const preSnapshot = JSON.parse(fs.readFileSync('backups/uat_binary_pre_restructure_snapshot.json', 'utf8'));
  const placements = preSnapshot.map(u => u.binaryPlacement).filter(Boolean);
  if (placements.length !== 28) throw new Error(`Expected 28 pre-restructure placements, found ${placements.length}`);

  // 4. Shopping Vouchers
  const vouchers = await prisma.shoppingVoucher.findMany({
    where: { userId: { in: userIds } },
    orderBy: { createdAt: 'asc' },
  });
  if (vouchers.length !== 21) throw new Error(`Expected 21 vouchers, found ${vouchers.length}`);

  // 5. Commission Holds
  const holds = await prisma.commissionHold.findMany({
    where: { sponsorId: { in: userIds } },
    orderBy: { createdAt: 'asc' },
  });
  if (holds.length !== 2) throw new Error(`Expected 2 holds, found ${holds.length}`);

  // 6. Journal Entries and Lines (strictly baseline)
  const allJournals = await prisma.journalEntry.findMany({
    include: { lines: { orderBy: { createdAt: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  });

  const baselineJournals = allJournals.filter(j => !j.lines.some(l => l.userId && !userIdSet.has(l.userId)));
  if (baselineJournals.length !== 48) throw new Error(`Expected 48 journals, found ${baselineJournals.length}`);

  const baselineLines = baselineJournals.flatMap(j => j.lines);
  if (baselineLines.length !== 109) throw new Error(`Expected 109 journal lines, found ${baselineLines.length}`);

  // 7. Binary Match Events for SuperAdmin
  const matchEvents = await prisma.binaryMatchEvent.findMany({
    where: { userId: { in: userIds } },
    orderBy: { createdAt: 'asc' },
  });

  // BigInt serialization
  const serialize = (obj) => JSON.parse(JSON.stringify(obj, (k, v) => (typeof v === 'bigint' ? v.toString() : v)));

  const backupData = {
    metadata: {
      generatedAt: new Date().toISOString(),
      dataset: 'COMPLETE_PRODUCTION_BASELINE',
      sourceDatabase: process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':***@') : 'UAT',
      counts: {
        users: users.length,
        wallets: wallets.length,
        binaryPlacements: placements.length,
        shoppingVouchers: vouchers.length,
        commissionHolds: holds.length,
        journalEntries: baselineJournals.length,
        journalLines: baselineLines.length,
        matchEvents: matchEvents.length,
      },
    },
    users: serialize(users),
    wallets: serialize(wallets),
    binaryPlacements: serialize(placements),
    shoppingVouchers: serialize(vouchers),
    commissionHolds: serialize(holds),
    journalEntries: serialize(baselineJournals),
    matchEvents: serialize(matchEvents),
  };

  const jsonStr = JSON.stringify(backupData, null, 2);
  const checksum = crypto.createHash('sha256').update(jsonStr, 'utf8').digest('hex');
  backupData.metadata.checksumSha256 = checksum;

  const finalJson = JSON.stringify(backupData, null, 2);
  const outPath = 'backups/complete_production_baseline_backup.json';
  fs.writeFileSync(outPath, finalJson);

  console.log(`\nExported complete baseline backup to: ${outPath}`);
  console.log(`Checksum SHA-256: ${checksum}`);
  console.log('Verified Counts:');
  console.log(`- Users: ${users.length}`);
  console.log(`- Wallets: ${wallets.length}`);
  console.log(`- Binary Placements: ${placements.length}`);
  console.log(`- Shopping Vouchers: ${vouchers.length}`);
  console.log(`- Commission Holds: ${holds.length}`);
  console.log(`- Journal Entries: ${baselineJournals.length}`);
  console.log(`- Journal Lines: ${baselineLines.length}`);
  console.log(`- Match Events: ${matchEvents.length}`);

  await prisma.$disconnect();
}

exportCompleteBaseline().catch(err => {
  console.error('Fatal export error:', err);
  process.exit(1);
});

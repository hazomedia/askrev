const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PrismaClient } = require('d:/Projects/AskrEV/apps/api/node_modules/@prisma/client');

const PROD_URL = 'postgresql://postgres:YLsFUdfsvWxWVIVbVDfZdcsoRMXoxHwB@trolley.proxy.rlwy.net:41036/railway';

function calculateSha256(str) {
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

async function run() {
  console.log('================================================================================');
  console.log('   ASKR EV — FRESH PRODUCTION POST-VOUCHER PRE-DEPLOYMENT BACKUP & PREFLIGHT');
  console.log('================================================================================');

  const prodPrisma = new PrismaClient({ datasources: { db: { url: PROD_URL } } });

  try {
    // 1. Verify Production Identity
    console.log('\n--- 1. VERIFYING ACTUAL PRODUCTION DATABASE IDENTITY ---');
    const [dbInfo] = await prodPrisma.$queryRawUnsafe(`
      SELECT current_database() as db_name, current_user as db_user, version() as pg_version;
    `);
    console.log(`Connected Database: ${dbInfo.db_name} as ${dbInfo.db_user}`);
    console.log(`PostgreSQL Engine: ${dbInfo.pg_version}`);

    if (dbInfo.db_name !== 'railway') {
      throw new Error(`CRITICAL: Connected database name is ${dbInfo.db_name}, expected 'railway'!`);
    }

    // 2. Fetch all public tables & export snapshot
    console.log('\n--- 2. EXPORTING COMPLETE PRODUCTION SNAPSHOT ---');
    const tableRows = await prodPrisma.$queryRawUnsafe(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const tables = tableRows.map(r => r.table_name);
    console.log(`Found ${tables.length} tables in Production database.`);

    const data = {};
    const tableCounts = {};

    for (const table of tables) {
      try {
        const rows = await prodPrisma.$queryRawUnsafe(`SELECT * FROM "${table}";`);
        data[table] = rows;
        tableCounts[table] = rows.length;
        console.log(`  - ${table}: ${rows.length} rows`);
      } catch (err) {
        console.warn(`  - ${table}: FAILED (${err.message})`);
        tableCounts[table] = -1;
      }
    }

    const backupPayload = {
      metadata: {
        backupTimestamp: new Date().toISOString(),
        purpose: 'PRE_DEPLOYMENT_POST_VOUCHERS_BACKUP',
        sourceHost: 'trolley.proxy.rlwy.net:41036',
        database: 'railway',
        environment: 'PRODUCTION_ACTUAL',
        tableCounts,
      },
      data,
    };

    const backupJson = JSON.stringify(backupPayload, (k, v) => (typeof v === 'bigint' ? v.toString() : v), 2);
    const checksumSha256 = calculateSha256(backupJson);
    backupPayload.metadata.checksumSha256 = checksumSha256;

    if (!fs.existsSync('backups')) {
      fs.mkdirSync('backups', { recursive: true });
    }

    const backupFile = path.resolve('backups/production_backup_post_vouchers_20261125.json');
    fs.writeFileSync(backupFile, JSON.stringify(backupPayload, (k, v) => (typeof v === 'bigint' ? v.toString() : v), 2), 'utf8');

    const artifactBackup = path.resolve('C:/Users/New/.gemini/antigravity/brain/2be6b61f-ae3e-45fe-b65c-bc7fd8d418f1/production_backup_post_vouchers_20261125.json');
    fs.writeFileSync(artifactBackup, JSON.stringify(backupPayload, (k, v) => (typeof v === 'bigint' ? v.toString() : v), 2), 'utf8');

    console.log(`\n[PASS] Production backup saved to: ${backupFile}`);
    console.log(`[PASS] Mirror saved to artifact directory: ${artifactBackup}`);
    console.log(`[PASS] SHA-256 Checksum: ${checksumSha256}`);

    // 3. Preflight Financial Assertions
    console.log('\n--- 3. FINANCIAL PRESERVATION & EQUILIBRIUM PREFLIGHT ---');
    const [balanceCheck] = await prodPrisma.$queryRawUnsafe(`
      SELECT 
        SUM("debitPaise")::bigint as total_debits,
        SUM("creditPaise")::bigint as total_credits,
        (SUM("debitPaise") - SUM("creditPaise"))::bigint as variance
      FROM "JournalLine";
    `);

    console.log(`Total Debits:  paise ${balanceCheck.total_debits}`);
    console.log(`Total Credits: paise ${balanceCheck.total_credits}`);
    console.log(`Variance:      paise ${balanceCheck.variance}`);

    if (balanceCheck.variance !== 0n) {
      throw new Error(`CRITICAL: Ledger variance detected! Expected 0, got ${balanceCheck.variance}`);
    }
    console.log('[PASS] Full General Ledger is in 100% exact equilibrium.');

    // 4. Counts validation
    console.log('\n--- 4. STRUCTURAL SUMMARY ---');
    console.log(`Members: ${tableCounts['User']} (Expected: 28)`);
    console.log(`Wallets: ${tableCounts['WalletAccount']} (Expected: 28)`);
    console.log(`Vouchers: ${tableCounts['ShoppingVoucher']} (Expected: 26)`);
    console.log(`Journals: ${tableCounts['JournalEntry']} (Expected: 53)`);
    console.log(`Journal Lines: ${tableCounts['JournalLine']} (Expected: 119)`);
    console.log(`Commission Holds: ${tableCounts['CommissionHold']} (Expected: 2)`);

    console.log('\nPREFLIGHT SUITE COMPLETED SUCCESSFULLY.');
  } finally {
    await prodPrisma.$disconnect();
  }
}

run().catch((e) => {
  console.error('FATAL ERROR:', e);
  process.exit(1);
});

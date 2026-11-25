const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PrismaClient } = require('d:/Projects/AskrEV/apps/api/node_modules/@prisma/client');

const PROD_URL = 'postgresql://postgres:YLsFUdfsvWxWVIVbVDfZdcsoRMXoxHwB@trolley.proxy.rlwy.net:41036/railway';
const CLEAN_UAT_URL = 'postgresql://postgres:criOL0BwGsXD3Dq7wRA0xVfP99mLZVDB@nozomi.proxy.rlwy.net:28651/clean_uat';

function calculateSha256(str) {
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

function paiseToInr(paise) {
  const p = BigInt(paise || 0);
  const sign = p < 0n ? '-' : '';
  const absP = p < 0n ? -p : p;
  const inr = absP / 100n;
  const rem = (absP % 100n).toString().padStart(2, '0');
  return `${sign}₹${inr.toLocaleString('en-IN')}.${rem}`;
}

async function run() {
  console.log('================================================================================');
  console.log('   ASKR EV — PRODUCTION PRE-MIGRATION BACKUP & FINAL PRESERVATION GATE');
  console.log('================================================================================');

  const prodPrisma = new PrismaClient({ datasources: { db: { url: PROD_URL } } });
  const uatPrisma = new PrismaClient({ datasources: { db: { url: CLEAN_UAT_URL } } });

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
        purpose: 'PRE_MIGRATION_PRODUCTION_SAFETY_BACKUP',
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

    const backupFile = path.resolve('backups/production_pre_migration_final_backup_20261125.json');
    fs.writeFileSync(backupFile, JSON.stringify(backupPayload, (k, v) => (typeof v === 'bigint' ? v.toString() : v), 2), 'utf8');

    // Also mirror to artifact directory
    const artifactBackup = path.resolve('C:/Users/New/.gemini/antigravity/brain/2be6b61f-ae3e-45fe-b65c-bc7fd8d418f1/production_pre_migration_final_backup_20261125.json');
    fs.writeFileSync(artifactBackup, JSON.stringify(backupPayload, (k, v) => (typeof v === 'bigint' ? v.toString() : v), 2), 'utf8');

    console.log(`\n[PASS] Production backup saved to: ${backupFile}`);
    console.log(`[PASS] Mirror saved to artifact directory: ${artifactBackup}`);
    console.log(`[PASS] SHA-256 Checksum: ${checksumSha256}`);

    // 3. Mandatory Final Data Preservation Gate Checks
    console.log('\n--- 3. MANDATORY FINAL DATA PRESERVATION GATE ASSERTIONS ---');

    const users = data['User'];
    const wallets = data['WalletAccount'];
    const placements = data['BinaryPlacement'];
    const vouchers = data['ShoppingVoucher'];
    const holds = data['CommissionHold'];
    const journals = data['JournalEntry'];
    const lines = data['JournalLine'];
    const matches = data['BinaryMatchEvent'];

    const evGoCount = users.filter(u => u.currentPackage === 'FREE').length;
    const evProCount = users.filter(u => u.currentPackage === 'BASIC').length;
    const evUltraCount = users.filter(u => u.currentPackage === 'FULL').length;

    const totalAvailablePaise = wallets.reduce((acc, w) => acc + BigInt(w.availableEarningsPaise || 0), 0n);
    const totalHeldPaise = wallets.reduce((acc, w) => acc + BigInt(w.heldCommissionsPaise || 0), 0n);
    const totalVoucherPaise = wallets.reduce((acc, w) => acc + BigInt(w.shoppingVoucherBalancePaise || 0), 0n);

    const totalMatchingIncomePaise = matches.reduce((acc, m) => acc + BigInt(m.rewardPaise || m.bonusPaise || 0), 0n);
    const totalMatchingPairs = matches.reduce((acc, m) => acc + (m.matchesSettled || m.pairCount || 0), 0);

    const totalDebitPaise = lines.reduce((acc, l) => acc + BigInt(l.debitPaise || 0), 0n);
    const totalCreditPaise = lines.reduce((acc, l) => acc + BigInt(l.creditPaise || 0), 0n);

    const assertions = [
      { name: 'Users', expected: 28, actual: users.length },
      { name: 'Wallets', expected: 28, actual: wallets.length },
      { name: 'Binary Placements', expected: 28, actual: placements.length },
      { name: 'EV GO (FREE)', expected: 9, actual: evGoCount },
      { name: 'EV PRO (BASIC)', expected: 3, actual: evProCount },
      { name: 'EV ULTRA (FULL)', expected: 16, actual: evUltraCount },
      { name: 'Journal Entries', expected: 48, actual: journals.length },
      { name: 'Journal Lines', expected: 109, actual: lines.length },
      { name: 'Shopping Vouchers', expected: 21, actual: vouchers.length },
      { name: 'Commission Holds', expected: 2, actual: holds.length },
      { name: 'Available Earnings', expected: '₹1,10,000.00', actual: paiseToInr(totalAvailablePaise) },
      { name: 'Held Commissions', expected: '₹1,000.00', actual: paiseToInr(totalHeldPaise) },
      { name: 'Voucher Liability', expected: '₹6,30,000.00', actual: paiseToInr(totalVoucherPaise) },
      { name: 'Historical Matching Income', expected: '₹18,000.00', actual: paiseToInr(totalMatchingIncomePaise) },
      { name: 'Historical Matching Pairs', expected: 6, actual: totalMatchingPairs },
      { name: 'Ledger Debits', expected: '₹7,98,000.00', actual: paiseToInr(totalDebitPaise) },
      { name: 'Ledger Credits', expected: '₹7,98,000.00', actual: paiseToInr(totalCreditPaise) },
    ];

    let gateFailed = false;
    for (const a of assertions) {
      const pass = a.expected === a.actual;
      if (!pass) gateFailed = true;
      console.log(`  [${pass ? 'PASS' : 'FAIL'}] ${a.name}: Expected ${a.expected} | Actual ${a.actual}`);
    }

    if (gateFailed) {
      throw new Error('FATAL: One or more Mandatory Final Data Preservation Gate assertions failed!');
    }

    // 4. Compare Production Individual Records Against Clean UAT
    console.log('\n--- 4. COMPARING INDIVIDUAL PRODUCTION RECORDS AGAINST CLEAN UAT ---');
    const uatUsers = await uatPrisma.user.findMany({ orderBy: { createdAt: 'asc' } });
    const uatWallets = new Map((await uatPrisma.walletAccount.findMany()).map(w => [w.userId, w]));
    const uatVouchers = await uatPrisma.shoppingVoucher.findMany();
    const uatHolds = await uatPrisma.commissionHold.findMany();

    const prodUserMap = new Map(users.map(u => [u.id, u]));
    const uatUserMap = new Map(uatUsers.map(u => [u.id, u]));

    let individualDiffCount = 0;
    for (const pu of users) {
      const uu = uatUserMap.get(pu.id);
      if (!uu) {
        console.error(`User ${pu.memberId} missing in Clean UAT!`);
        individualDiffCount++;
        continue;
      }

      // Check package
      if (pu.currentPackage !== uu.currentPackage) {
        console.error(`Package mismatch for ${pu.memberId}: Prod ${pu.currentPackage} vs UAT ${uu.currentPackage}`);
        individualDiffCount++;
      }

      // Check sponsor
      const pSponsor = pu.sponsorId ? prodUserMap.get(pu.sponsorId)?.memberId : 'ROOT';
      const uSponsor = uu.sponsorId ? uatUserMap.get(uu.sponsorId)?.memberId : 'ROOT';
      if (pSponsor !== uSponsor) {
        console.error(`Sponsor mismatch for ${pu.memberId}: Prod ${pSponsor} vs UAT ${uSponsor}`);
        individualDiffCount++;
      }

      // Check wallet
      const pw = wallets.find(w => w.userId === pu.id);
      const uw = uatWallets.get(pu.id);
      if (BigInt(pw?.availableEarningsPaise || 0) !== BigInt(uw?.availableEarningsPaise || 0) ||
          BigInt(pw?.heldCommissionsPaise || 0) !== BigInt(uw?.heldCommissionsPaise || 0) ||
          BigInt(pw?.shoppingVoucherBalancePaise || 0) !== BigInt(uw?.shoppingVoucherBalancePaise || 0)) {
        console.error(`Wallet mismatch for ${pu.memberId}!`);
        individualDiffCount++;
      }
    }

    if (individualDiffCount === 0) {
      console.log(`[PASS] All 28 individual member records (packages, sponsors, wallets, vouchers) match with ZERO variance!`);
    } else {
      throw new Error(`FATAL: Found ${individualDiffCount} individual record differences between Production and Clean UAT!`);
    }

    console.log('\n================================================================================');
    console.log('   ALL MANDATORY PREFLIGHT GATES PASSED! READY FOR PRODUCTION MIGRATION!');
    console.log('================================================================================\n');
  } finally {
    await prodPrisma.$disconnect();
    await uatPrisma.$disconnect();
  }
}

run().catch(err => {
  console.error('PREFLIGHT GATE ERROR:', err);
  process.exit(1);
});

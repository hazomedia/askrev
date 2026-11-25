/**
 * ASKR EV — RESTORE FRESH PRODUCTION BACKUP TO CLEAN UAT (RAW INSERT ENGINE)
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('d:/Projects/AskrEV/apps/api/node_modules/@prisma/client');

const CLEAN_UAT_URL = 'postgresql://postgres:criOL0BwGsXD3Dq7wRA0xVfP99mLZVDB@nozomi.proxy.rlwy.net:28651/clean_uat';

async function restore() {
  console.log('================================================================================');
  console.log('    ASKR EV — RESTORE PRODUCTION BACKUP TO CLEAN UAT (RAW INSERT ENGINE)');
  console.log('================================================================================');

  const backupFile = path.resolve('backups/production_fresh_read_only_backup_20261125.json');
  const backup = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
  const { data } = backup;

  const prisma = new PrismaClient({
    datasources: { db: { url: CLEAN_UAT_URL } },
  });

  // Test session_replication_role
  try {
    await prisma.$executeRawUnsafe("SET session_replication_role = 'replica';");
    console.log('Successfully set session_replication_role = replica (foreign keys temporarily relaxed).');
  } catch (e) {
    console.log('Note: session_replication_role could not be set, proceeding with ordered insertion:', e.message);
  }

  // Desired table load order if constraints are active
  const tableOrder = [
    'Product',
    'HomepageHeroSlide',
    'DashboardTopBanner',
    'PaymentConfig',
    'PaymentGatewayConfig',
    'RetailQualificationConfig',
    'TaxSimulationRule',
    'PopupCampaign',
    'PopupDismissal',
    'User',
    'WalletAccount',
    'BinaryPlacement',
    'ShoppingVoucher',
    'CommissionHold',
    'JournalEntry',
    'JournalLine',
    'BinaryMatchEvent',
    'BinaryMatchingOutbox',
    'MembershipRequest',
    'QualificationEvent',
    'EmailVerificationToken',
    'PasswordResetToken',
    'RevokedToken',
    'AuditLog',
    'BinarySimulationRun',
  ];

  for (const table of tableOrder) {
    const rows = data[table];
    if (!rows || rows.length === 0) continue;

    console.log(`Restoring ${rows.length} rows into "${table}"...`);
    for (const row of rows) {
      const keys = Object.keys(row);
      const colNames = keys.map((k) => `"${k}"`).join(', ');
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const values = keys.map((k) => {
        const val = row[k];
        // Handle dates
        if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
          return new Date(val);
        }
        // Handle JSON objects
        if (val !== null && typeof val === 'object') {
          return JSON.stringify(val);
        }
        return val;
      });

      try {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "${table}" (${colNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING;`,
          ...values
        );
      } catch (insertErr) {
        console.warn(`Error inserting into ${table}: ${insertErr.message}`);
      }
    }
  }

  try {
    await prisma.$executeRawUnsafe("SET session_replication_role = 'origin';");
    console.log('Restored session_replication_role = origin.');
  } catch (e) {}

  // Verification
  console.log('\n--- Verifying clean_uat Baseline Counts ---');
  const userCount = await prisma.user.count();
  const walletCount = await prisma.walletAccount.count();
  const placementCount = await prisma.binaryPlacement.count();
  const voucherCount = await prisma.shoppingVoucher.count();
  const holdCount = await prisma.commissionHold.count();
  const journalCount = await prisma.journalEntry.count();
  const lineCount = await prisma.journalLine.count();

  const wallets = await prisma.walletAccount.findMany();
  const totalAvail = wallets.reduce((acc, w) => acc + w.availableEarningsPaise, 0n);
  const totalHeld = wallets.reduce((acc, w) => acc + w.heldCommissionsPaise, 0n);
  const totalVoucherBal = wallets.reduce((acc, w) => acc + w.shoppingVoucherBalancePaise, 0n);

  const lines = await prisma.journalLine.findMany();
  const totalDebits = lines.reduce((acc, l) => acc + l.debitPaise, 0n);
  const totalCredits = lines.reduce((acc, l) => acc + l.creditPaise, 0n);

  console.log(`Users:              ${userCount} (Expected: 28)`);
  console.log(`Wallets:            ${walletCount} (Expected: 28)`);
  console.log(`Placements:         ${placementCount} (Expected: 28)`);
  console.log(`Vouchers:           ${voucherCount} (Expected: 21)`);
  console.log(`Commission Holds:   ${holdCount} (Expected: 2)`);
  console.log(`Journal Entries:    ${journalCount} (Expected: 48)`);
  console.log(`Journal Lines:      ${lineCount} (Expected: 109)`);
  console.log(`Available Earnings: ₹${Number(totalAvail) / 100} (Expected: ₹110000)`);
  console.log(`Held Commissions:   ₹${Number(totalHeld) / 100} (Expected: ₹1000)`);
  console.log(`Voucher Balances:   ₹${Number(totalVoucherBal) / 100} (Expected: ₹630000)`);
  console.log(`Total Debits:       ₹${Number(totalDebits) / 100} (Expected: ₹798000)`);
  console.log(`Total Credits:      ₹${Number(totalCredits) / 100} (Expected: ₹798000)`);

  const testUsers = await prisma.user.findMany({
    where: {
      OR: [
        { memberId: { startsWith: 'UAT-' } },
        { memberId: { startsWith: 'DISP-' } },
        { memberId: { startsWith: 'MSTR-' } },
      ],
    },
  });
  console.log(`Test Personas in clean_uat: ${testUsers.length} (Expected: 0)`);

  if (
    userCount !== 28 ||
    walletCount !== 28 ||
    placementCount !== 28 ||
    voucherCount !== 21 ||
    holdCount !== 2 ||
    journalCount !== 48 ||
    lineCount !== 109 ||
    totalDebits !== totalCredits ||
    testUsers.length !== 0
  ) {
    throw new Error('FATAL: Clean UAT baseline verification failed!');
  }

  console.log('\n================================================================================');
  console.log('>>> CLEAN UAT RESTORED & VERIFIED: EXACTLY 28 ACCOUNTS & ZERO TEST PERSONAS <<<');
  console.log('================================================================================\n');

  await prisma.$disconnect();
}

restore().catch((e) => {
  console.error('\nFATAL ERROR DURING RESTORATION TO CLEAN UAT:', e);
  process.exit(1);
});

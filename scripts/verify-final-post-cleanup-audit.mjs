// scripts/verify-final-post-cleanup-audit.mjs
import { execSync } from 'child_process';
import { PrismaClient } from '../packages/database/dist/index.js';

async function audit() {
  const rawVars = execSync('railway variable list --service Postgres --json', { stdio: 'pipe' }).toString();
  const parsed = JSON.parse(rawVars);
  const user = parsed.POSTGRES_USER || parsed.PGUSER;
  const password = parsed.POSTGRES_PASSWORD || parsed.PGPASSWORD;
  const host = parsed.RAILWAY_TCP_PROXY_DOMAIN;
  const port = parsed.RAILWAY_TCP_PROXY_PORT;
  const db = parsed.POSTGRES_DB || parsed.PGDATABASE || 'railway';

  const railwayUrl = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${db}?sslmode=require`;
  const prisma = new PrismaClient({ datasources: { db: { url: railwayUrl } } });

  console.log('='.repeat(80));
  console.log('  ASKR EV — FINAL PRODUCTION POST-CLEANUP VERIFICATION');
  console.log('='.repeat(80));

  // 1. User Accounts
  const users = await prisma.user.findMany();
  console.log(`\n1. Users in Database: ${users.length}`);
  console.table(users.map(u => ({
    id: u.id,
    memberId: u.memberId,
    email: u.email,
    role: u.role,
    pkg: u.currentPackage,
    mfaEnabled: u.twoFactorEnabled,
    sessionVersion: u.sessionVersion
  })));

  // 2. Binary Placements
  const placements = await prisma.binaryPlacement.findMany();
  console.log(`\n2. Binary Placements: ${placements.length}`);
  console.table(placements.map(p => ({
    userId: p.userId,
    parentId: p.parentId,
    leg: p.leg,
    leftCount: p.leftCount,
    rightCount: p.rightCount,
    leftVol: p.leftVolumePaise.toString(),
    rightVol: p.rightVolumePaise.toString(),
    reward: p.totalRewardEarnedPaise.toString()
  })));

  // 3. Wallets
  const wallets = await prisma.walletAccount.findMany();
  console.log(`\n3. Wallet Accounts: ${wallets.length}`);
  console.table(wallets.map(w => ({
    userId: w.userId,
    availablePaise: w.availableEarningsPaise.toString(),
    heldPaise: w.heldCommissionsPaise.toString(),
    voucherBalancePaise: w.shoppingVoucherBalancePaise.toString(),
    totalEarnedPaise: w.totalEarnedPaise.toString()
  })));

  // 4. Shopping Vouchers
  const vouchers = await prisma.shoppingVoucher.findMany();
  console.log(`\n4. Shopping Vouchers: ${vouchers.length}`);

  // 5. Journal Entries and Lines (Ledger Parity)
  const entries = await prisma.journalEntry.findMany();
  const lines = await prisma.journalLine.findMany();
  let totalDebit = 0n;
  let totalCredit = 0n;
  for (const l of lines) {
    if (l.type === 'DEBIT') totalDebit += BigInt(l.amountPaise);
    if (l.type === 'CREDIT') totalCredit += BigInt(l.amountPaise);
  }
  const discrepancy = totalDebit - totalCredit;
  console.log(`\n5. Double-Entry Ledger Parity:`);
  console.log(`   Journal Entries: ${entries.length}, Journal Lines: ${lines.length}`);
  console.log(`   Total Debits: ₹${Number(totalDebit)/100}, Total Credits: ₹${Number(totalCredit)/100}`);
  console.log(`   Discrepancy: ${discrepancy} paise`);

  // 6. Simulation & Hold records
  const simRuns = await prisma.binarySimulationRun.count();
  const matchEvents = await prisma.binaryMatchEvent.count();
  const holds = await prisma.commissionHold.count();
  const quals = await prisma.qualificationEvent.count();
  console.log(`\n6. Simulation & Hold Records:`);
  console.log(`   Simulation Runs: ${simRuns}, Match Events: ${matchEvents}, Holds: ${holds}, Qualifications: ${quals}`);

  // 7. Products
  const products = await prisma.product.findMany({ orderBy: [{ category: 'asc' }, { createdAt: 'asc' }] });
  console.log(`\n7. Products: ${products.length} total, all preserved`);
  console.table(products.map(p => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    category: p.category,
    status: p.status,
    availability: p.availability
  })));

  // 8. Site Content & Hero Slides
  const slides = await prisma.homepageHeroSlide.count();
  const revokedTokens = await prisma.revokedToken.count();
  const retailConfig = await prisma.retailQualificationConfig.count();
  console.log(`\n8. System Configuration & Site Content:`);
  console.log(`   Homepage Hero Slides: ${slides}`);
  console.log(`   Revoked Tokens: ${revokedTokens}`);
  console.log(`   Retail Qualification Config: ${retailConfig}`);

  await prisma.$disconnect();
}

audit();

const fs = require('fs');
const path = require('path');

// 1. Load UAT environment
const envPath = path.resolve('.env.uat');
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

const { PrismaClient } = require('d:/Projects/AskrEV/apps/api/node_modules/@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL || process.env.UAT_DATABASE_URL },
  },
});

async function main() {
  console.log('=== VERIFYING POST-RESTRUCTURE FINANCIAL INTEGRITY ===');

  const journals = await prisma.journalEntry.findMany({
    include: { lines: true },
  });

  let totalDebits = 0n;
  let totalCredits = 0n;
  let unbalanced = 0;

  for (const j of journals) {
    let d = 0n;
    let c = 0n;
    for (const l of j.lines) {
      d += BigInt(l.debitPaise || 0);
      c += BigInt(l.creditPaise || 0);
    }
    if (d !== c) unbalanced++;
    totalDebits += d;
    totalCredits += c;
  }

  const baselineUsers = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    take: 28,
    include: { wallet: true, binaryPlacement: true },
  });

  let totalAvailableEarnings = 0n;
  let totalHeldCommissions = 0n;
  let totalPlaced = 0;

  for (const u of baselineUsers) {
    if (u.wallet) {
      totalAvailableEarnings += BigInt(u.wallet.availableEarningsPaise || 0);
      totalHeldCommissions += BigInt(u.wallet.heldCommissionsPaise || 0);
    }
    if (u.binaryPlacement?.parentId || u.role === 'SUPER_ADMIN') {
      totalPlaced++;
    }
  }

  console.log(`Total Journals: ${journals.length}`);
  console.log(`Unbalanced Journals: ${unbalanced}`);
  console.log(`Total Platform Debits: ₹${Number(totalDebits) / 100}`);
  console.log(`Total Platform Credits: ₹${Number(totalCredits) / 100}`);
  console.log(`Debit - Credit Discrepancy: ₹${Number(totalDebits - totalCredits) / 100}`);
  console.log(`28 Baseline Available Earnings: ₹${Number(totalAvailableEarnings) / 100}`);
  console.log(`28 Baseline Held Commissions: ₹${Number(totalHeldCommissions) / 100}`);
  console.log(`28 Baseline Placed in Binary: ${totalPlaced} / 28 (100% placed)`);

  if (unbalanced > 0 || totalDebits !== totalCredits) {
    throw new Error('Double-entry accounting imbalance detected!');
  }

  if (totalPlaced !== 28) {
    throw new Error(`Expected all 28 accounts to be placed, found ${totalPlaced}`);
  }

  console.log('>>> ALL FINANCIAL INTEGRITY ASSERTIONS PASSED WITH ZERO DISCREPANCY! <<<');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

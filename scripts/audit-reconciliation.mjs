import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PrismaClient } = require('../packages/database/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function audit() {
  console.log('=== RUNNING COMPREHENSIVE RECONCILIATION AUDIT ===\n');

  // 1. All Users and Wallets
  const users = await prisma.user.findMany({
    include: {
      wallet: true,
      vouchers: true,
    },
  });

  let memberDiscrepancies = [];

  for (const user of users) {
    if (!user.wallet) continue;

    // Check voucher balance: wallet vs sum of active vouchers
    const activeVouchers = user.vouchers.filter(v => ['ACTIVE', 'PARTIALLY_REDEEMED'].includes(v.status));
    const sumVoucherPaise = activeVouchers.reduce((acc, v) => acc + v.remainingBalancePaise, 0n);

    if (user.wallet.shoppingVoucherBalancePaise !== sumVoucherPaise) {
      memberDiscrepancies.push({
        memberId: user.memberId,
        type: 'VOUCHER_MISMATCH',
        walletBalance: user.wallet.shoppingVoucherBalancePaise.toString(),
        sumVouchers: sumVoucherPaise.toString(),
      });
    }

    // Check ledger earnings payable for user
    const earningsLines = await prisma.journalLine.findMany({
      where: {
        userId: user.id,
        account: '2000_MEMBER_EARNINGS_PAYABLE',
      },
    });

    const netEarningsPaise = earningsLines.reduce((acc, l) => acc + (l.creditPaise - l.debitPaise), 0n);

    if (user.wallet.availableEarningsPaise !== netEarningsPaise) {
      memberDiscrepancies.push({
        memberId: user.memberId,
        type: 'EARNINGS_MISMATCH',
        walletAvailable: user.wallet.availableEarningsPaise.toString(),
        netLedger: netEarningsPaise.toString(),
      });
    }
  }

  console.log(`Audited ${users.length} members.`);
  if (memberDiscrepancies.length === 0) {
    console.log('✓ Per-Member Audit: 100% RECONCILED. Zero discrepancies across all members!\n');
  } else {
    console.log('❌ Discrepancies detected:', memberDiscrepancies);
  }

  // 2. Voucher Liability System-wide
  const voucherLines = await prisma.journalLine.findMany({
    where: { account: '2100_SHOPPING_VOUCHER_LIABILITY' },
  });
  const netVoucherLiability = voucherLines.reduce((acc, l) => acc + (l.creditPaise - l.debitPaise), 0n);

  const allActiveVouchers = await prisma.shoppingVoucher.findMany({
    where: { status: { in: ['ACTIVE', 'PARTIALLY_REDEEMED'] } },
  });
  const sumAllActiveVouchers = allActiveVouchers.reduce((acc, v) => acc + v.remainingBalancePaise, 0n);

  console.log('System-wide Voucher Liability:');
  console.log(`  - Ledger Net Liability: ₹${Number(netVoucherLiability) / 100}`);
  console.log(`  - Sum Active Vouchers:  ₹${Number(sumAllActiveVouchers) / 100}`);
  console.log(`  - Difference:           ₹${Number(sumAllActiveVouchers - netVoucherLiability) / 100}`);

  // Inspect ASKR-100001
  const u1001 = await prisma.user.findFirst({
    where: { memberId: 'ASKR-100001' },
    include: { wallet: true, vouchers: true },
  });
  console.log('\nDetails for ASKR-100001:');
  console.log('Wallet:', u1001?.wallet);
  console.log('Vouchers:', u1001?.vouchers);

  // 3. Check All Journal Entries for balance
  const journals = await prisma.journalEntry.findMany({
    include: { lines: true },
  });
  let unbalanced = 0;
  for (const j of journals) {
    const dr = j.lines.reduce((acc, l) => acc + l.debitPaise, 0n);
    const cr = j.lines.reduce((acc, l) => acc + l.creditPaise, 0n);
    if (dr !== cr) {
      console.error(`Unbalanced Journal ${j.referenceId}: Dr ${dr} !== Cr ${cr}`);
      unbalanced++;
    }
  }
  console.log(`Double-entry Equilibrium: ${journals.length} journals checked, ${unbalanced} unbalanced.`);

  // 4. Check bookings and vouchers
  const bookings = await prisma.evBooking.findMany({
    include: { bike: true, voucher: true },
  });
  console.log(`\nEV Bookings: ${bookings.length} total bookings.`);
  for (const b of bookings) {
    console.log(`  - Booking #${b.bookingNumber}: Status=${b.status}, Bike=${b.bike.name}, Amount=₹${Number(b.bookingAmountPaise)/100}, VoucherDiscount=₹${Number(b.voucherDiscountPaise)/100}, Paid=₹${Number(b.amountPaidPaise)/100}`);
  }

  await prisma.$disconnect();
}

audit().catch(console.error);

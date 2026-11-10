import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PrismaClient } = require('../packages/database/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function reconcileSeededSponsor() {
  const sponsorA = await prisma.user.findFirst({
    where: { memberId: 'ASKR-100001' },
    include: { wallet: true, vouchers: true },
  });

  if (!sponsorA) {
    console.log('Seeded sponsor ASKR-100001 not found.');
    return;
  }

  console.log(`Checking ASKR-100001: Wallet Voucher = ₹${Number(sponsorA.wallet.shoppingVoucherBalancePaise)/100}, Vouchers Count = ${sponsorA.vouchers.length}`);

  if (sponsorA.vouchers.length === 0 && sponsorA.wallet.shoppingVoucherBalancePaise > 0n) {
    console.log('Creating matching ShoppingVoucher and balanced JournalEntry for seeded sponsor ASKR-100001...');
    const voucherAmountPaise = sponsorA.wallet.shoppingVoucherBalancePaise;

    await prisma.$transaction(async (tx) => {
      // 1. Create Shopping Voucher
      const voucher = await tx.shoppingVoucher.create({
        data: {
          voucherCode: 'VCHR-SEED-100001',
          userId: sponsorA.id,
          initialValuePaise: voucherAmountPaise,
          remainingBalancePaise: voucherAmountPaise,
          issuedReason: 'FULL_MEMBERSHIP_ACTIVATION_GRANT',
          status: 'ACTIVE',
          expiresAt: new Date('2099-12-31T23:59:59.999Z'),
        },
      });

      // 2. Create Balanced Double-Entry Journal
      await tx.journalEntry.create({
        data: {
          referenceId: 'JNL-SEED-VCHR-ASKR-100001',
          eventType: 'MEMBERSHIP_FULL_ACTIVATION',
          narration: `Simulated full membership activation voucher for seeded sponsor ${sponsorA.fullName} (${sponsorA.memberId})`,
          lines: {
            create: [
              {
                account: '1000_CASH_AND_BANK',
                userId: sponsorA.id,
                debitPaise: voucherAmountPaise,
                creditPaise: 0n,
                description: `Full membership activation payment received for seeded member ${sponsorA.fullName}`,
              },
              {
                account: '2100_SHOPPING_VOUCHER_LIABILITY',
                userId: sponsorA.id,
                debitPaise: 0n,
                creditPaise: voucherAmountPaise,
                description: `Shopping voucher liability established for seeded member ${sponsorA.fullName}`,
              },
            ],
          },
        },
      });

      // 3. Create initial voucher transaction
      await tx.voucherTransaction.create({
        data: {
          voucherId: voucher.id,
          amountPaise: voucherAmountPaise,
          transactionType: 'CREDIT',
          balanceAfterPaise: voucherAmountPaise,
          referenceId: 'REF-SEED-100001',
          narration: 'Initial voucher grant from Full membership seed',
        },
      });
    });

    console.log('✓ Successfully reconciled ASKR-100001 with voucher and balanced journal entry.');
  } else {
    console.log('✓ ASKR-100001 is already reconciled.');
  }

  await prisma.$disconnect();
}

reconcileSeededSponsor().catch(console.error);

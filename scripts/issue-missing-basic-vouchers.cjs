const { PrismaClient } = require('d:/Projects/AskrEV/apps/api/node_modules/@prisma/client');

const PROD_DB_URL = 'postgresql://postgres:YLsFUdfsvWxWVIVbVDfZdcsoRMXoxHwB@trolley.proxy.rlwy.net:41036/railway';

const prisma = new PrismaClient({
  datasources: { db: { url: PROD_DB_URL } },
});

const TARGET_MEMBER_IDS = [
  'ASKR-625627', // Pranavi
  'ASKR-662029', // V Satheesh Kumar
  'ASKR-108025', // K Anantha kumara setty
  'ASKR-976981', // Dodium Fakruddin
  'ASKR-409146', // Bharath kumar
];

const BASIC_VOUCHER_GRANT_PAISE = 300000n; // ₹3,000

async function main() {
  console.log('===============================================================');
  console.log('       PRODUCTION AUDIT & ISSUANCE: 5 MISSING BASIC VOUCHERS   ');
  console.log('===============================================================');

  // Verify DB connection
  const dbResult = await prisma.$queryRaw`SELECT current_database(), count(*)::int as users_count FROM "User"`;
  console.log('Connected DB:', dbResult[0]);

  // Preflight check existing vouchers and ledger equilibrium
  const initialVoucherCount = await prisma.shoppingVoucher.count();
  console.log(`Initial Shopping Vouchers in Production: ${initialVoucherCount}`);

  const initialDebitsCredits = await prisma.$queryRaw`
    SELECT 
      SUM("debitPaise")::bigint as total_debit,
      SUM("creditPaise")::bigint as total_credit,
      (SUM("debitPaise") - SUM("creditPaise"))::bigint as variance
    FROM "JournalLine"
  `;
  console.log('Pre-issuance Ledger Equilibrium:', {
    totalDebitPaise: initialDebitsCredits[0].total_debit.toString(),
    totalCreditPaise: initialDebitsCredits[0].total_credit.toString(),
    variancePaise: initialDebitsCredits[0].variance.toString(),
  });

  if (initialDebitsCredits[0].variance !== 0n) {
    throw new Error('Ledger is not in equilibrium before starting! Aborting.');
  }

  const issuedResults = [];

  for (const memberId of TARGET_MEMBER_IDS) {
    console.log(`\nEvaluating member ${memberId}...`);
    const user = await prisma.user.findUnique({
      where: { memberId },
      include: {
        wallet: true,
        vouchers: true,
      },
    });

    if (!user) {
      throw new Error(`Target member ${memberId} not found in database!`);
    }

    console.log(`  User: ${user.fullName} (${user.id}) | Current Package: ${user.currentPackage}`);
    console.log(`  Current Vouchers count: ${user.vouchers.length}`);
    console.log(`  Current Shopping Voucher Balance: ₹${Number(user.wallet?.shoppingVoucherBalancePaise || 0) / 100}`);

    // Check idempotency: already has a basic activation grant?
    const existingBasicVoucher = user.vouchers.find(
      v => v.issuedReason === 'BASIC_MEMBERSHIP_ACTIVATION_GRANT' ||
           (v.category === 'ADDITIONAL_SHOPPING_VOUCHER' && v.initialValuePaise === BASIC_VOUCHER_GRANT_PAISE)
    );

    const refId = `JNL-VCHR-BSC-${user.memberId}`;
    const existingJournal = await prisma.journalEntry.findUnique({
      where: { referenceId: refId },
    });

    if (existingBasicVoucher || existingJournal) {
      console.log(`  [SKIP] Member ${memberId} already has basic voucher (${existingBasicVoucher?.voucherCode}) or journal (${existingJournal?.referenceId}). Skipping.`);
      issuedResults.push({
        memberId,
        status: 'ALREADY_EXISTS',
        voucherCode: existingBasicVoucher?.voucherCode,
      });
      continue;
    }

    // Generate unique voucher code
    const voucherCode = `VCHR-BSC-${Date.now().toString().slice(-8)}-${Math.floor(1000 + Math.random() * 9000)}`;

    console.log(`  Issuing ₹3,000 voucher ${voucherCode} in atomic transaction...`);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create ShoppingVoucher
      const voucher = await tx.shoppingVoucher.create({
        data: {
          voucherCode,
          userId: user.id,
          initialValuePaise: BASIC_VOUCHER_GRANT_PAISE,
          remainingBalancePaise: BASIC_VOUCHER_GRANT_PAISE,
          issuedReason: 'BASIC_MEMBERSHIP_ACTIVATION_GRANT',
          category: 'ADDITIONAL_SHOPPING_VOUCHER',
          emailSent: false,
          emailSentAt: null,
          status: 'ACTIVE',
          expiresAt: new Date('2099-12-31T23:59:59.999Z'),
        },
      });

      // 2. Increment WalletAccount
      const updatedWallet = await tx.walletAccount.update({
        where: { userId: user.id },
        data: {
          shoppingVoucherBalancePaise: { increment: BASIC_VOUCHER_GRANT_PAISE },
        },
      });

      // 3. Double-entry JournalEntry
      const journal = await tx.journalEntry.create({
        data: {
          referenceId: refId,
          eventType: 'BASIC_VOUCHER_LIABILITY',
          narration: `Simulated ₹3,000 shopping voucher issued to basic member ${user.fullName} (${user.memberId})`,
          lines: {
            create: [
              {
                account: '5100_SHOPPING_VOUCHER_PROMO_EXPENSE',
                userId: null,
                debitPaise: BASIC_VOUCHER_GRANT_PAISE,
                creditPaise: 0n,
                description: `Promotional voucher incentive expense for basic member ${user.memberId}`,
              },
              {
                account: '2100_SHOPPING_VOUCHER_LIABILITY',
                userId: user.id,
                debitPaise: 0n,
                creditPaise: BASIC_VOUCHER_GRANT_PAISE,
                description: `Voucher liability recorded for basic member ${user.memberId}`,
              },
            ],
          },
        },
      });

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'VOUCHER_EMAIL_NOTIFICATION',
          entityType: 'ShoppingVoucher',
          entityId: voucher.id,
          metadata: {
            deliveryStatus: 'SANDBOX_LOGGED',
            recipientEmail: user.email,
            voucherCode,
            category: 'ADDITIONAL_SHOPPING_VOUCHER',
            loggedAt: new Date().toISOString(),
          },
        },
      });

      return { voucher, updatedWallet, journal };
    });

    console.log(`  [SUCCESS] Issued ${result.voucher.voucherCode} to ${memberId}. Wallet voucher balance now: ₹${Number(result.updatedWallet.shoppingVoucherBalancePaise)/100}`);
    issuedResults.push({
      memberId,
      status: 'ISSUED',
      voucherCode: result.voucher.voucherCode,
      walletBalanceINR: Number(result.updatedWallet.shoppingVoucherBalancePaise) / 100,
    });
  }

  // Post-flight checks
  console.log('\n===============================================================');
  console.log('                   POST-ISSUANCE VERIFICATION                  ');
  console.log('===============================================================');

  const finalVoucherCount = await prisma.shoppingVoucher.count();
  console.log(`Final Shopping Vouchers count in Production: ${finalVoucherCount} (Expected: 26)`);

  const finalDebitsCredits = await prisma.$queryRaw`
    SELECT 
      SUM("debitPaise")::bigint as total_debit,
      SUM("creditPaise")::bigint as total_credit,
      (SUM("debitPaise") - SUM("creditPaise"))::bigint as variance
    FROM "JournalLine"
  `;
  console.log('Post-issuance Ledger Equilibrium:', {
    totalDebitPaise: finalDebitsCredits[0].total_debit.toString(),
    totalCreditPaise: finalDebitsCredits[0].total_credit.toString(),
    variancePaise: finalDebitsCredits[0].variance.toString(),
  });

  if (finalDebitsCredits[0].variance !== 0n) {
    throw new Error('FATAL: Ledger variance detected after issuance! Variance is not zero.');
  }

  console.log('\nIssuance Summary:');
  console.table(issuedResults);

  await prisma.$disconnect();
  console.log('\nAudit and issuance completed successfully.');
}

main().catch(async (e) => {
  console.error('ERROR in execution:', e);
  await prisma.$disconnect();
  process.exit(1);
});

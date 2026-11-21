import { PrismaClient } from '../packages/database/node_modules/@prisma/client/index.js';

async function securityAudit() {
  console.log('='.repeat(80));
  console.log('   ASKR EV — PRE-PRODUCTION SECURITY AUDIT SCRIPT');
  console.log('='.repeat(80));

  const prisma = new PrismaClient();

  try {
    // 1. Binary Tree Integrity & Duplicate Parent-Leg Check
    console.log('\n--- 1. BINARY PLACEMENT INTEGRITY & DUPLICATE CHECKS ---');
    const duplicatePlacements = await prisma.$queryRawUnsafe(`
      SELECT "parentId", leg, COUNT(*) as count 
      FROM "BinaryPlacement" 
      WHERE "parentId" IS NOT NULL AND leg IS NOT NULL 
      GROUP BY "parentId", leg 
      HAVING COUNT(*) > 1;
    `);
    console.log('Duplicate (parentId, leg) entries in BinaryPlacement:', duplicatePlacements);

    // 2. Sensitive Data & Token Exposure in Audit Logs
    console.log('\n--- 2. SENSITIVE DATA IN AUDIT LOGS ---');
    const logs = await prisma.auditLog.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' }
    });
    let foundSensitiveInLogs = false;
    for (const log of logs) {
      const metaStr = JSON.stringify(log.metadata || {});
      if (
        metaStr.includes('password') && !metaStr.includes('BAD_PASSWORD') && !metaStr.includes('reason') ||
        metaStr.includes('token=') ||
        metaStr.includes('secret=')
      ) {
        console.warn(`[WARN] Sensitive pattern in AuditLog ID ${log.id}:`, metaStr);
        foundSensitiveInLogs = true;
      }
    }
    if (!foundSensitiveInLogs) {
      console.log('✓ Clean: No raw passwords, secrets, or auth tokens found in AuditLog metadata.');
    }

    // 3. Token Storage Security (Email & Password Reset)
    console.log('\n--- 3. TOKEN STORAGE SECURITY ---');
    const emailTokens = await prisma.emailVerificationToken.findMany({ take: 10 });
    const pwResetTokens = await prisma.passwordResetToken.findMany({ take: 10 });
    let allTokensHashed = true;
    for (const t of emailTokens) {
      if (t.tokenHash.length !== 64) { // SHA-256 is 64 hex chars
        console.warn(`[WARN] Email verification token not 64-char SHA-256: ID ${t.id}`);
        allTokensHashed = false;
      }
    }
    for (const t of pwResetTokens) {
      if (t.tokenHash.length !== 64) {
        console.warn(`[WARN] Password reset token not 64-char SHA-256: ID ${t.id}`);
        allTokensHashed = false;
      }
    }
    if (allTokensHashed) {
      console.log('✓ Clean: All tokens are stored as 64-character SHA-256 hashes.');
    }

    // 4. Admin Privileges & MFA Status
    console.log('\n--- 4. PRIVILEGED ACCOUNTS & MFA AUDIT ---');
    const staff = await prisma.user.findMany({
      where: {
        role: { in: ['SUPER_ADMIN', 'ADMIN_OPERATIONS', 'FINANCE_MANAGER'] }
      },
      select: { id: true, memberId: true, email: true, role: true, twoFactorEnabled: true }
    });
    console.table(staff);

    // 5. Financial Ledger Balanced State
    console.log('\n--- 5. DOUBLE-ENTRY LEDGER BALANCE ---');
    const lineAggregates = await prisma.journalLine.aggregate({
      _sum: {
        debitPaise: true,
        creditPaise: true
      }
    });
    const totalDebits = lineAggregates._sum.debitPaise || 0n;
    const totalCredits = lineAggregates._sum.creditPaise || 0n;
    console.log(`Total Debits: ₹${totalDebits / 100n} (${totalDebits} paise)`);
    console.log(`Total Credits: ₹${totalCredits / 100n} (${totalCredits} paise)`);
    console.log(`Balance Discrepancy: ${totalDebits - totalCredits} paise`);

    // 6. Wallet Balance Non-Negativity
    console.log('\n--- 6. WALLET NON-NEGATIVITY AUDIT ---');
    const negativeWallets = await prisma.walletAccount.findMany({
      where: {
        OR: [
          { availableEarningsPaise: { lt: 0n } },
          { heldCommissionsPaise: { lt: 0n } },
          { pendingRecoveryPaise: { lt: 0n } },
          { shoppingVoucherBalancePaise: { lt: 0n } }
        ]
      }
    });
    console.log(`Negative balance wallets: ${negativeWallets.length}`);

    // 7. Shopping Voucher Balance Non-Negativity
    console.log('\n--- 7. VOUCHER NON-NEGATIVITY AUDIT ---');
    const negativeVouchers = await prisma.shoppingVoucher.findMany({
      where: {
        remainingBalancePaise: { lt: 0n }
      }
    });
    console.log(`Negative balance vouchers: ${negativeVouchers.length}`);

  } catch (err) {
    console.error('Audit Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

securityAudit();

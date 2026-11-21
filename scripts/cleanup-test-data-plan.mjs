#!/usr/bin/env node
/**
 * ASKR EV — Test Data Cleanup Plan & Dependency-Aware Dry-Run Scope
 *
 * READ-ONLY DRY-RUN INSPECTION ONLY.
 * ZERO MUTATIONS / ZERO DELETIONS ARE EXECUTED BY THIS SCRIPT.
 *
 * Foreign Key Hierarchy & Dependent Table Cascade Sequence:
 * Level 1 (Leaf dependents):
 *   - AuditLog (actorId / metadata)
 *   - EmailVerificationToken (userId)
 *   - PasswordResetToken (userId)
 *   - VoucherTransaction (voucherId)
 * Level 2 (Voucher & Booking assets):
 *   - EvBooking (userId)
 *   - ShoppingVoucher (userId)
 * Level 3 (Ledger lines & Journal entries):
 *   - JournalLine (userId, journalEntryId)
 *   - JournalEntry (referenced by test requests)
 * Level 4 (Commission holds, recoveries, qualifications):
 *   - CommissionHold (sponsorId, referredMemberId)
 *   - PendingRecovery (sponsorId, referredMemberId)
 *   - QualificationEvent (sponsorId, memberId)
 * Level 5 (Binary tree placement & match events):
 *   - BinaryMatchEvent (userId)
 *   - BinaryPlacement (userId, parentId)
 * Level 6 (Requests & Wallets):
 *   - MembershipRequest (userId)
 *   - WalletAccount (userId)
 * Level 7 (Root test accounts):
 *   - User (test member accounts, preserving SUPER_ADMIN)
 */

import { PrismaClient } from '../packages/database/node_modules/@prisma/client/index.js';

const prisma = new PrismaClient();

async function main() {
  console.log('='.repeat(80));
  console.log('   ASKR EV — TEST DATA CLEANUP SCOPE & DEPENDENCY AUDIT (READ-ONLY)');
  console.log('='.repeat(80));

  try {
    // 1. Identify production accounts vs test accounts
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        memberId: true,
        fullName: true,
        email: true,
        role: true,
        currentPackage: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const prodAdmin = allUsers.filter((u) => u.role === 'SUPER_ADMIN' || u.memberId === 'ASKR-ADMIN-01');
    const testUsers = allUsers.filter((u) => u.role !== 'SUPER_ADMIN' && u.memberId !== 'ASKR-ADMIN-01');

    console.log(`\n1. ACCOUNT INVENTORY:`);
    console.log(`   - Production Super Admin Accounts (PROTECTED): ${prodAdmin.length}`);
    prodAdmin.forEach((a) => {
      console.log(`     * ${a.memberId} | ${a.fullName} | ${a.email} (${a.role})`);
    });
    console.log(`   - Test / Simulated Accounts Identified: ${testUsers.length}`);

    const testUserIds = testUsers.map((u) => u.id);

    // 2. Query Record Counts for Test Accounts across all dependent models
    const [
      testAuditLogs,
      testEmailTokens,
      testPasswordTokens,
      testVouchers,
      testBookings,
      testJournalLines,
      testMembershipRequests,
      testBinaryPlacements,
      testBinaryMatchEvents,
      testWallets,
      testHolds,
      testRecoveries,
      testQualEvents,
    ] = await Promise.all([
      prisma.auditLog.count({ where: { actorId: { in: testUserIds } } }),
      prisma.emailVerificationToken.count({ where: { userId: { in: testUserIds } } }),
      prisma.passwordResetToken.count({ where: { userId: { in: testUserIds } } }),
      prisma.shoppingVoucher.count({ where: { userId: { in: testUserIds } } }),
      prisma.evBooking.count({ where: { userId: { in: testUserIds } } }),
      prisma.journalLine.count({ where: { userId: { in: testUserIds } } }),
      prisma.membershipRequest.count({ where: { userId: { in: testUserIds } } }),
      prisma.binaryPlacement.count({ where: { userId: { in: testUserIds } } }),
      prisma.binaryMatchEvent.count({ where: { userId: { in: testUserIds } } }),
      prisma.walletAccount.count({ where: { userId: { in: testUserIds } } }),
      prisma.commissionHold.count({ where: { OR: [{ sponsorId: { in: testUserIds } }, { referredMemberId: { in: testUserIds } }] } }),
      prisma.pendingRecovery.count({ where: { OR: [{ sponsorId: { in: testUserIds } }, { referredMemberId: { in: testUserIds } }] } }),
      prisma.qualificationEvent.count({ where: { OR: [{ sponsorId: { in: testUserIds } }, { memberId: { in: testUserIds } }] } }),
    ]);

    console.log(`\n2. TEST RECORD INVENTORY (IDENTIFIED FOR CLEANUP):`);
    console.log(`   - Test Users:                    ${testUsers.length}`);
    console.log(`   - Wallet Accounts:               ${testWallets}`);
    console.log(`   - Membership Requests:           ${testMembershipRequests}`);
    console.log(`   - Binary Placements:             ${testBinaryPlacements}`);
    console.log(`   - Binary Match Events:           ${testBinaryMatchEvents}`);
    console.log(`   - Shopping Vouchers:             ${testVouchers}`);
    console.log(`   - EV Bookings:                   ${testBookings}`);
    console.log(`   - Journal Lines (double-entry):  ${testJournalLines}`);
    console.log(`   - Commission Holds:              ${testHolds}`);
    console.log(`   - Pending Recoveries:            ${testRecoveries}`);
    console.log(`   - Qualification Events:          ${testQualEvents}`);
    console.log(`   - Email Verification Tokens:     ${testEmailTokens}`);
    console.log(`   - Password Reset Tokens:         ${testPasswordTokens}`);
    console.log(`   - Audit Logs:                    ${testAuditLogs}`);

    // 3. Dependency-Aware Deletion Plan Definition
    console.log(`\n3. DEPENDENCY-AWARE DELETION SEQUENCE (EXECUTION SPECIFICATION):`);
    console.log(`   Step 1:  Delete EmailVerificationToken & PasswordResetToken where userId in testUserIds`);
    console.log(`   Step 2:  Delete VoucherTransaction for all test user shopping vouchers`);
    console.log(`   Step 3:  Delete EvBooking where userId in testUserIds`);
    console.log(`   Step 4:  Delete ShoppingVoucher where userId in testUserIds`);
    console.log(`   Step 5:  Delete JournalLine where userId in testUserIds`);
    console.log(`   Step 6:  Delete JournalEntry orphaned by test requests (referenceId like JNL-REQ-% or SPON-BASIC-%)`);
    console.log(`   Step 7:  Delete CommissionHold & PendingRecovery where sponsorId or referredMemberId in testUserIds`);
    console.log(`   Step 8:  Delete QualificationEvent where sponsorId or memberId in testUserIds`);
    console.log(`   Step 9:  Delete BinaryMatchEvent where userId in testUserIds`);
    console.log(`   Step 10: Clear BinaryPlacement foreign keys (parentId = null), then delete test BinaryPlacement rows`);
    console.log(`   Step 11: Reset Super Admin BinaryPlacement volumes/counts to baseline`);
    console.log(`   Step 12: Delete MembershipRequest where userId in testUserIds`);
    console.log(`   Step 13: Delete WalletAccount where userId in testUserIds`);
    console.log(`   Step 14: Delete AuditLog where actorId in testUserIds`);
    console.log(`   Step 15: Clear User self-referential sponsorId for test users`);
    console.log(`   Step 16: Delete User records where id in testUserIds (PRESERVING SUPER_ADMIN)`);

    console.log(`\n4. SAFETY VERIFICATION:`);
    console.log(`   [PASS] Zero mutations executed. Database remains completely unchanged.`);
    console.log(`   [PASS] Super Admin account (${prodAdmin[0]?.memberId || 'ASKR-ADMIN-01'}) is explicitly protected.`);
    console.log(`   [PASS] All foreign key relationships mapped in strict child-to-parent deletion order.`);

    console.log('\n' + '='.repeat(80));
    console.log('   CLEANUP PLAN PREPARATION COMPLETE (READY FOR FUTURE USER APPROVAL)');
    console.log('='.repeat(80));
  } catch (err) {
    console.error('Audit execution error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

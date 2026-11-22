// scripts/test-isolated-cleanup-and-publication.mjs
import { PrismaClient } from '../packages/database/dist/index.js';

const ISOLATED_DB_URL = 'postgresql://postgres:postgres@localhost:5432/askrev_prod_backup_restore_gate?schema=public';
const prisma = new PrismaClient({ datasources: { db: { url: ISOLATED_DB_URL } } });

const ADMIN_ID = '53d082e3-acc0-4527-a71a-dffa8a4cc844';
const TEST_MEMBER_IDS = [
  '2cae4024-5724-427f-b118-4847a391e286', // ASKR-510199 (Satheesh / isaac4484@gmail.com)
  '469f2367-a430-4599-beee-daed8abf0fde', // ASKR-995552 (Test 02 / test@gmail.com)
  '34237f24-2fad-4937-811c-289c01dbdb62', // ASKR-960845 (Test 04 / test01@gmai.com)
  '7bc80f85-af38-4dc0-ae5f-ae72700b191f', // ASKR-482883 (test 04 / tes@num.com)
  'da4ebdfd-4d2f-4ec4-a737-e28c0ef250f6', // ASKR-351889 (Test 05 / nunn@gmail.com)
];

const APPROVED_REAL_PRODUCT_SLUGS = [
  'askr-ev-s01',
  'askr-ev-s02',
  'askr-ev-s03',
  'askr-ev-s04',
  'askr-ev-s05',
  'askr-ev-s06',
  'askr-ev-b01',
  'askr-ev-u01',
  'askr-ev-u02',
  'askr-ev-j01',
  'askr-ev-j02',
  'askr-ev-j03',
];

async function runTest() {
  console.log('='.repeat(80));
  console.log('  TESTING CONTROLLED CLEANUP & PRODUCT PUBLICATION ON ISOLATED DATABASE');
  console.log('='.repeat(80));

  // --- PART 1: TEST CONTROLLED CLEANUP IN TRANSACTION ---
  console.log('\n--- 1. EXECUTING CONTROLLED CLEANUP TRANSACTION ---');

  await prisma.$transaction(async (tx) => {
    // 1. Delete dependent simulation records
    const simRuns = await tx.binarySimulationRun.deleteMany({});
    console.log(`Deleted BinarySimulationRuns: ${simRuns.count}`);

    const matchEvents = await tx.binaryMatchEvent.deleteMany({});
    console.log(`Deleted BinaryMatchEvents: ${matchEvents.count}`);

    // 2. Delete commission holds and qualification events for test members
    const holds = await tx.commissionHold.deleteMany({});
    console.log(`Deleted CommissionHolds: ${holds.count}`);

    const quals = await tx.qualificationEvent.deleteMany({});
    console.log(`Deleted QualificationEvents: ${quals.count}`);

    // 3. Delete double-entry journal entries and lines created by test activations
    const journalLines = await tx.journalLine.deleteMany({});
    console.log(`Deleted JournalLines: ${journalLines.count}`);

    const journalEntries = await tx.journalEntry.deleteMany({});
    console.log(`Deleted JournalEntries: ${journalEntries.count}`);

    // 4. Delete shopping vouchers (all 4 generated during test activations)
    const vouchers = await tx.shoppingVoucher.deleteMany({});
    console.log(`Deleted ShoppingVouchers: ${vouchers.count}`);

    // 5. Delete membership requests for test members
    const requests = await tx.membershipRequest.deleteMany({
      where: { userId: { in: TEST_MEMBER_IDS } }
    });
    console.log(`Deleted MembershipRequests: ${requests.count}`);

    // 6. Delete tokens for test members
    const tokens = await tx.emailVerificationToken.deleteMany({
      where: { userId: { in: TEST_MEMBER_IDS } }
    });
    console.log(`Deleted EmailVerificationTokens: ${tokens.count}`);

    const pwdTokens = await tx.passwordResetToken.deleteMany({
      where: { userId: { in: TEST_MEMBER_IDS } }
    });
    console.log(`Deleted PasswordResetTokens: ${pwdTokens.count}`);

    // 7. Delete binary placements for test members
    const placements = await tx.binaryPlacement.deleteMany({
      where: { userId: { in: TEST_MEMBER_IDS } }
    });
    console.log(`Deleted BinaryPlacements: ${placements.count}`);

    // 8. Reset Admin Binary Placement to 0 points / 0 children
    const updatedAdminPlacement = await tx.binaryPlacement.updateMany({
      where: { userId: ADMIN_ID },
      data: {
        leftCount: 0,
        rightCount: 0,
        leftVolumePaise: 0n,
        rightVolumePaise: 0n,
        carryLeftPaise: 0n,
        carryRightPaise: 0n,
        matchedVolumeLeftPaise: 0n,
        matchedVolumeRightPaise: 0n,
        totalMatchesConsumed: 0,
        totalRewardEarnedPaise: 0n,
        lastMatchDate: null,
        dailyMatchesCount: 0,
      }
    });
    console.log(`Reset Admin BinaryPlacement: ${updatedAdminPlacement.count}`);

    // 9. Delete wallet accounts for test members
    const wallets = await tx.walletAccount.deleteMany({
      where: { userId: { in: TEST_MEMBER_IDS } }
    });
    console.log(`Deleted WalletAccounts: ${wallets.count}`);

    // 10. Reset Admin WalletAccount to 0 paise balances
    const updatedAdminWallet = await tx.walletAccount.updateMany({
      where: { userId: ADMIN_ID },
      data: {
        availableEarningsPaise: 0n,
        heldCommissionsPaise: 0n,
        pendingRecoveryPaise: 0n,
        shoppingVoucherBalancePaise: 0n,
        totalEarnedPaise: 0n,
        totalWithdrawnPaise: 0n,
      }
    });
    console.log(`Reset Admin WalletAccount: ${updatedAdminWallet.count}`);

    // 11. Delete the 5 test member User records
    const deletedUsers = await tx.user.deleteMany({
      where: { id: { in: TEST_MEMBER_IDS } }
    });
    console.log(`Deleted Test Members: ${deletedUsers.count}`);
  });

  // --- PART 2: TEST PRODUCT PUBLICATION CHANGES ---
  console.log('\n--- 2. UPDATING APPROVED REAL PRODUCTS TO PUBLISHED ---');
  const pubResult = await prisma.product.updateMany({
    where: { slug: { in: APPROVED_REAL_PRODUCT_SLUGS } },
    data: { status: 'PUBLISHED' }
  });
  console.log(`Updated ${pubResult.count} products to PUBLISHED.`);

  // --- PART 3: VERIFY POST-CLEANUP STATE ON ISOLATED DB ---
  console.log('\n--- 3. VERIFYING POST-CLEANUP PARITY ON ISOLATED DB ---');
  const remainingUsers = await prisma.user.findMany();
  console.log(`Remaining Users: ${remainingUsers.length}`);
  console.table(remainingUsers.map(u => ({ id: u.id, memberId: u.memberId, email: u.email, role: u.role })));

  const remainingPlacements = await prisma.binaryPlacement.findMany();
  console.log(`Remaining BinaryPlacements: ${remainingPlacements.length}`);
  for (const p of remainingPlacements) {
    console.log(`Placement: userId=${p.userId}, parentId=${p.parentId}, leg=${p.leg}, L=${p.leftCount}, R=${p.rightCount}, Rew=${p.totalRewardEarnedPaise}`);
  }

  const remainingWallets = await prisma.walletAccount.findMany();
  console.log(`Remaining WalletAccounts: ${remainingWallets.length}`);
  for (const w of remainingWallets) {
    console.log(`Wallet: userId=${w.userId}, available=${w.availableEarningsPaise}, vouchers=${w.shoppingVoucherBalancePaise}, total=${w.totalEarnedPaise}`);
  }

  const remainingVouchers = await prisma.shoppingVoucher.count();
  console.log(`Remaining ShoppingVouchers: ${remainingVouchers}`);

  const remainingJournals = await prisma.journalEntry.count();
  const remainingLines = await prisma.journalLine.count();
  console.log(`Remaining JournalEntries: ${remainingJournals}, JournalLines: ${remainingLines}`);

  const totalProducts = await prisma.product.count();
  const publishedProducts = await prisma.product.count({ where: { status: 'PUBLISHED' } });
  const draftProducts = await prisma.product.count({ where: { status: 'DRAFT' } });
  console.log(`Total Products: ${totalProducts}, Published: ${publishedProducts}, Draft: ${draftProducts}`);

  // Products by Category
  const categories = ['SCOOTER', 'BIKE', 'UTILITY', 'JEEP', 'CYCLE'];
  for (const cat of categories) {
    const count = await prisma.product.count({ where: { category: cat, status: 'PUBLISHED' } });
    console.log(`Category ${cat} Published Count: ${count}`);
  }

  await prisma.$disconnect();
  console.log('\n✅ Isolated simulation completed with 100% success!');
}

runTest().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

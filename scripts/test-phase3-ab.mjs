import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PrismaClient } = require('../packages/database/node_modules/@prisma/client');
let bcrypt;
try {
  bcrypt = require('../apps/api/node_modules/bcrypt');
} catch (e) {
  bcrypt = require('bcrypt');
}

const prisma = new PrismaClient();
const API_URL = 'http://localhost:4000/api';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function login(email, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Login failed for ${email}: ${res.status} ${err}`);
  }
  return res.json();
}

async function runTest() {
  console.log('=================================================================');
  console.log('   ASKR EV — PHASE 3A & 3B DATABASE INTEGRATION TEST SUITE');
  console.log('=================================================================\n');

  const testSuffix = Date.now().toString().slice(-6);
  const password = 'TestPassword@123';
  const passwordHash = await bcrypt.hash(password, 10);

  // Admin credentials from seed
  const adminAuth = await login('admin@askrev.com', 'Admin@123456');
  console.log('✓ Admin authenticated:', adminAuth.user.fullName);

  let sponsorA, memberB, memberC, memberD, memberE, memberF, memberG;

  try {
    // -------------------------------------------------------------------------
    // 1. SETUP ISOLATED TEST USERS
    // -------------------------------------------------------------------------
    console.log('\n--- Step 1: Creating Isolated Test Sponsor A and Referrals ---');

    sponsorA = await prisma.user.create({
      data: {
        memberId: `TEST-SPON-${testSuffix}`,
        email: `sponsora_${testSuffix}@test.askrev.local`,
        passwordHash,
        fullName: `Test Sponsor A (${testSuffix})`,
        role: 'MEMBER',
        currentPackage: 'FULL',
        isFullQualified: true,
        wallet: {
          create: {
            availableEarningsPaise: 0n,
            heldCommissionsPaise: 0n,
            pendingRecoveryPaise: 0n,
            shoppingVoucherBalancePaise: 0n,
          },
        },
      },
      include: { wallet: true },
    });
    console.log(`✓ Created Sponsor A: ${sponsorA.memberId} [${sponsorA.email}]`);

    const createMember = async (letter) => {
      return await prisma.user.create({
        data: {
          memberId: `TEST-MBR-${letter}-${testSuffix}`,
          email: `member_${letter.toLowerCase()}_${testSuffix}@test.askrev.local`,
          passwordHash,
          fullName: `Test Member ${letter}`,
          role: 'FREE_USER',
          currentPackage: 'FREE',
          isFullQualified: false,
          sponsorId: sponsorA.id,
          wallet: { create: {} },
        },
        include: { wallet: true },
      });
    };

    memberB = await createMember('B');
    memberC = await createMember('C');
    memberD = await createMember('D');
    memberE = await createMember('E');
    memberF = await createMember('F');
    memberG = await createMember('G');
    console.log('✓ Created direct referrals B, C, D, E, F, G under Sponsor A');

    // -------------------------------------------------------------------------
    // 2. TEST PHASE 3A: MEMBERSHIP ACTIVATION REQUESTS
    // -------------------------------------------------------------------------
    console.log('\n--- Step 2: Testing Activation Requests & Idempotency ---');

    const authB = await login(memberB.email, password);
    const authC = await login(memberC.email, password);
    const authD = await login(memberD.email, password);
    const authE = await login(memberE.email, password);

    // B submits Basic activation request
    const reqBRes = await fetch(`${API_URL}/packages/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authB.tokens.accessToken}`,
      },
      body: JSON.stringify({
        requestType: 'BASIC_ACTIVATION',
        paymentMode: 'SIMULATED_UPI',
        paymentReference: `UPI-B-${testSuffix}`,
        idempotencyKey: `IDEMP-B-${testSuffix}`,
      }),
    });
    const reqB = await reqBRes.json();
    if (!reqBRes.ok) throw new Error(`B request failed: ${JSON.stringify(reqB)}`);
    console.log('✓ Member B submitted Basic activation request (₹3,000)');

    // Test duplicate request prevention
    const dupRes = await fetch(`${API_URL}/packages/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authB.tokens.accessToken}`,
      },
      body: JSON.stringify({
        requestType: 'BASIC_ACTIVATION',
        paymentMode: 'SIMULATED_UPI',
      }),
    });
    if (dupRes.status === 400) {
      console.log('✓ Duplicate request correctly prevented with HTTP 400 Bad Request');
    } else {
      throw new Error(`Expected 400 for duplicate request, got: ${dupRes.status}`);
    }

    // C, D, E submit requests
    const submitReq = async (auth, type, ref) => {
      const res = await fetch(`${API_URL}/packages/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.tokens.accessToken}`,
        },
        body: JSON.stringify({
          requestType: type,
          paymentMode: 'SIMULATED_NETBANKING',
          paymentReference: ref,
        }),
      });
      return await res.json();
    };

    const reqC = await submitReq(authC, 'BASIC_ACTIVATION', `NET-C-${testSuffix}`);
    const reqD = await submitReq(authD, 'BASIC_ACTIVATION', `NET-D-${testSuffix}`);
    const reqE = await submitReq(authE, 'BASIC_ACTIVATION', `NET-E-${testSuffix}`);
    console.log('✓ Members C, D, E submitted Basic activation requests');

    // -------------------------------------------------------------------------
    // 3. TEST ADMIN APPROVAL & BASIC SPONSOR COMMISSIONS (B, C, D, E)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 3: Admin Approvals & Basic Sponsor Commission Settlement ---');

    const approveReq = async (reqId) => {
      const res = await fetch(`${API_URL}/packages/admin/requests/${reqId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminAuth.tokens.accessToken}`,
        },
        body: JSON.stringify({ adminNotes: 'Verified in automated test suite' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`Approve failed: ${JSON.stringify(data)}`);
      return data;
    };

    // Approve B: Should HOLD ₹1,000 (target hold reserve = ₹1,000 prior to 2nd full direct)
    const approveB = await approveReq(reqB.request.id);
    console.log('  Approve B result:', approveB.sponsorSettlement.action, `₹${approveB.sponsorSettlement.amountINR}`);

    let walletA = await prisma.walletAccount.findUnique({ where: { userId: sponsorA.id } });
    if (walletA.heldCommissionsPaise !== 100000n || walletA.availableEarningsPaise !== 0n) {
      throw new Error(`Sponsor A wallet mismatch after B. Expected Held 1000, Avail 0. Got: Held ${walletA.heldCommissionsPaise}, Avail ${walletA.availableEarningsPaise}`);
    }
    console.log('✓ Member B approved: ₹1,000 held in Sponsor A reserve (Available: ₹0, Held: ₹1,000)');

    // Approve C: Hold reserve target already satisfied -> Release ₹1,000 to Available
    const approveC = await approveReq(reqC.request.id);
    console.log('  Approve C result:', approveC.sponsorSettlement.action, `₹${approveC.sponsorSettlement.amountINR}`);

    walletA = await prisma.walletAccount.findUnique({ where: { userId: sponsorA.id } });
    if (walletA.heldCommissionsPaise !== 100000n || walletA.availableEarningsPaise !== 100000n) {
      throw new Error(`Sponsor A wallet mismatch after C. Expected Held 1000, Avail 1000. Got: Held ${walletA.heldCommissionsPaise}, Avail ${walletA.availableEarningsPaise}`);
    }
    console.log('✓ Member C approved: ₹1,000 released to Sponsor A wallet (Available: ₹1,000, Held: ₹1,000)');

    // Approve D and E
    await approveReq(reqD.request.id);
    await approveReq(reqE.request.id);

    walletA = await prisma.walletAccount.findUnique({ where: { userId: sponsorA.id } });
    if (walletA.heldCommissionsPaise !== 100000n || walletA.availableEarningsPaise !== 300000n) {
      throw new Error(`Sponsor A wallet mismatch after D, E. Expected Held 1000, Avail 3000. Got: Held ${walletA.heldCommissionsPaise}, Avail ${walletA.availableEarningsPaise}`);
    }
    console.log('✓ Members D & E approved: ₹1,000 released each (Available: ₹3,000, Held: ₹1,000)');

    // -------------------------------------------------------------------------
    // 4. TEST UPGRADE OF D (1ST QUALIFIED DIRECT -> ₹9,000 NET CREDIT)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 4: Upgrading D to Full (1st Qualified Direct) ---');

    const upgReqD = await submitReq(authD, 'BASIC_TO_FULL_UPGRADE', `UPG-D-${testSuffix}`);
    const approveUpgD = await approveReq(upgReqD.request.id);
    console.log('  Approve D Upgrade result:', approveUpgD.sponsorSettlement.action, `Net: ₹${approveUpgD.sponsorSettlement.netCreditedINR}`);

    // Verify D is Full Qualified and received ₹30k voucher
    const userD = await prisma.user.findUnique({
      where: { id: memberD.id },
      include: { wallet: true, vouchers: true },
    });
    if (!userD.isFullQualified || userD.wallet.shoppingVoucherBalancePaise !== 3000000n) {
      throw new Error(`Member D status or voucher mismatch after upgrade`);
    }
    console.log('✓ Member D is Full Qualified with ₹30,000 shopping voucher');

    // Verify Sponsor A wallet: Available was ₹3,000 + ₹9,000 net = ₹12,000. Held is ₹1,000.
    walletA = await prisma.walletAccount.findUnique({ where: { userId: sponsorA.id } });
    if (walletA.availableEarningsPaise !== 1200000n || walletA.heldCommissionsPaise !== 100000n) {
      throw new Error(`Sponsor A wallet mismatch after D upgrade. Expected Avail 12000, Held 1000. Got: Avail ${walletA.availableEarningsPaise}, Held ${walletA.heldCommissionsPaise}`);
    }
    console.log('✓ Sponsor A wallet after 1st Qualified Direct: Available: ₹12,000, Held: ₹1,000');

    // -------------------------------------------------------------------------
    // 5. TEST UPGRADE OF E (2ND QUALIFIED DIRECT -> ₹30,000 VOUCHER, HOLD RELEASE & RECOVERY)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 5: Upgrading E to Full (2nd Qualified Direct) ---');

    const upgReqE = await submitReq(authE, 'BASIC_TO_FULL_UPGRADE', `UPG-E-${testSuffix}`);
    const approveUpgE = await approveReq(upgReqE.request.id);
    console.log('  Approve E Upgrade result:', approveUpgE.sponsorSettlement.action, {
      voucher: `₹${approveUpgE.sponsorSettlement.voucherIssuedINR}`,
      holdReleased: `₹${approveUpgE.sponsorSettlement.holdReleasedINR}`,
      recovered: `₹${approveUpgE.sponsorSettlement.recoveredINR}`,
    });

    // Check Sponsor A final canonical state:
    // Available Earnings: ₹12,000
    // Held Commissions: ₹0
    // Pending Recovery: ₹0
    // Shopping Voucher: ₹30,000
    walletA = await prisma.walletAccount.findUnique({
      where: { userId: sponsorA.id },
    });

    console.log('\n--- VERIFYING SPONSOR A CANONICAL STATE ---');
    console.log(`  Available Earnings : ₹${Number(walletA.availableEarningsPaise) / 100} (Target: ₹12,000)`);
    console.log(`  Held Commissions   : ₹${Number(walletA.heldCommissionsPaise) / 100} (Target: ₹0)`);
    console.log(`  Pending Recovery   : ₹${Number(walletA.pendingRecoveryPaise) / 100} (Target: ₹0)`);
    console.log(`  Shopping Voucher   : ₹${Number(walletA.shoppingVoucherBalancePaise) / 100} (Target: ₹30,000)`);

    if (
      walletA.availableEarningsPaise !== 1200000n ||
      walletA.heldCommissionsPaise !== 0n ||
      walletA.pendingRecoveryPaise !== 0n ||
      walletA.shoppingVoucherBalancePaise !== 3000000n
    ) {
      throw new Error('Sponsor A canonical state mismatch! Accounting rules violation.');
    }
    console.log('✓ CANONICAL SCENARIO MATCHED 100% TO SPECIFICATION!');

    // -------------------------------------------------------------------------
    // 6. TEST 3RD QUALIFIED DIRECT (MEMBER F)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 6: Testing 3rd Qualified Direct (Member F) ---');
    const authF = await login(memberF.email, password);

    // Direct Full Activation for F
    const reqF = await submitReq(authF, 'FULL_ACTIVATION', `FULL-F-${testSuffix}`);
    const approveF = await approveReq(reqF.request.id);
    console.log('  Approve F Full Activation result:', approveF.sponsorSettlement.action, `Net: ₹${approveF.sponsorSettlement.netCreditedINR}`);

    // Since F is directly Full (3rd qualified direct), Sponsor A gets full ₹10,000 wallet credit!
    // Available becomes ₹12,000 + ₹10,000 = ₹22,000.
    walletA = await prisma.walletAccount.findUnique({ where: { userId: sponsorA.id } });
    if (walletA.availableEarningsPaise !== 2200000n) {
      throw new Error(`Expected Sponsor A Available ₹22,000 after 3rd direct, got: ${walletA.availableEarningsPaise}`);
    }
    console.log('✓ 3rd Qualified Direct credited full ₹10,000 (Available: ₹22,000)');

    // -------------------------------------------------------------------------
    // 7. TEST REJECTION WORKFLOW (MEMBER G)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 7: Testing Administrative Rejection Flow (Member G) ---');
    const authG = await login(memberG.email, password);
    const reqG = await submitReq(authG, 'BASIC_ACTIVATION', `REJ-G-${testSuffix}`);

    const rejectRes = await fetch(`${API_URL}/packages/admin/requests/${reqG.request.id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminAuth.tokens.accessToken}`,
      },
      body: JSON.stringify({ adminNotes: 'Test rejection: Incomplete verification documents' }),
    });
    const rejectData = await rejectRes.json();
    if (!rejectRes.ok) throw new Error(`Reject failed: ${JSON.stringify(rejectData)}`);

    const userG = await prisma.user.findUnique({ where: { id: memberG.id } });
    if (userG.currentPackage !== 'FREE') {
      throw new Error('User G should have remained FREE after rejection');
    }
    console.log('✓ Member G request rejected: Member remains FREE, notes recorded');

    // -------------------------------------------------------------------------
    // 8. VERIFY DOUBLE-ENTRY JOURNAL BALANCE
    // -------------------------------------------------------------------------
    console.log('\n--- Step 8: Double-Entry Journal Audit ---');
    const allTestUserIds = [
      sponsorA.id,
      memberB.id,
      memberC.id,
      memberD.id,
      memberE.id,
      memberF.id,
      memberG.id,
    ];

    const journalEntries = await prisma.journalEntry.findMany({
      where: {
        lines: {
          some: {
            userId: { in: allTestUserIds },
          },
        },
      },
      include: { lines: true },
    });

    console.log(`Auditing ${journalEntries.length} journal transactions recorded during test:`);
    for (const entry of journalEntries) {
      const totalDebit = entry.lines.reduce((s, l) => s + l.debitPaise, 0n);
      const totalCredit = entry.lines.reduce((s, l) => s + l.creditPaise, 0n);
      console.log(`  [${entry.eventType}] ${entry.referenceId}: Debit ₹${Number(totalDebit)/100} === Credit ₹${Number(totalCredit)/100}`);
      if (totalDebit !== totalCredit) {
        throw new Error(`Unbalanced Journal Entry: ${entry.referenceId}! Debit: ${totalDebit}, Credit: ${totalCredit}`);
      }
    }
    if (journalEntries.length === 0) {
      throw new Error('Expected journal entries to be recorded during activation and settlement!');
    }
    console.log(`✓ ALL ${journalEntries.length} journal entries are strictly balanced (Debit === Credit)`);

    console.log('\n=================================================================');
    console.log('   ✓ PHASE 3A & 3B ALL DATABASE INTEGRATION TESTS PASSED!');
    console.log('=================================================================\n');
  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP TEST USERS
    // -------------------------------------------------------------------------
    console.log('Cleaning up isolated test users...');
    const testUserIds = [
      sponsorA?.id,
      memberB?.id,
      memberC?.id,
      memberD?.id,
      memberE?.id,
      memberF?.id,
      memberG?.id,
    ].filter(Boolean);

    if (testUserIds.length > 0) {
      // Delete test journal entries first
      const testJournalIds = (
        await prisma.journalEntry.findMany({
          where: {
            lines: {
              some: {
                userId: { in: testUserIds },
              },
            },
          },
          select: { id: true },
        })
      ).map((j) => j.id);

      if (testJournalIds.length > 0) {
        await prisma.journalLine.deleteMany({ where: { journalEntryId: { in: testJournalIds } } });
        await prisma.journalEntry.deleteMany({ where: { id: { in: testJournalIds } } });
      }

      await prisma.qualificationEvent.deleteMany({ where: { memberId: { in: testUserIds } } });
      await prisma.commissionHold.deleteMany({ where: { sponsorId: { in: testUserIds } } });
      await prisma.pendingRecovery.deleteMany({ where: { sponsorId: { in: testUserIds } } });
      await prisma.membershipRequest.deleteMany({ where: { userId: { in: testUserIds } } });
      await prisma.shoppingVoucher.deleteMany({ where: { userId: { in: testUserIds } } });
      await prisma.walletAccount.deleteMany({ where: { userId: { in: testUserIds } } });
      await prisma.auditLog.deleteMany({ where: { actorId: { in: testUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: testUserIds } } });
      console.log('✓ Cleanup complete. Development database remains clean.');
    }
  }
}

runTest()
  .catch((err) => {
    console.error('\n❌ TEST FAILED:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

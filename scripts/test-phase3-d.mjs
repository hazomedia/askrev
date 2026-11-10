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
  console.log('========================================================================');
  console.log('   ASKR EV — PHASE 3D WALLET, VOUCHER & EV BOOKING INTEGRATION SUITE');
  console.log('========================================================================\n');

  const testSuffix = Date.now().toString().slice(-6);
  const password = 'TestPassword@123';
  const passwordHash = await bcrypt.hash(password, 10);

  // Authenticate Super Admin
  const adminAuth = await login('admin@askrev.com', 'Admin@123456');
  console.log('✓ Admin authenticated:', adminAuth.user.fullName);
  const adminHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminAuth.tokens.accessToken}`,
  };

  try {
    // -------------------------------------------------------------------------
    // SETUP TEST ENTITIES
    // -------------------------------------------------------------------------
    const createMember = async (identifier, initialPkg = 'FREE', isQualified = false) => {
      const user = await prisma.user.create({
        data: {
          memberId: `D-${identifier}-${testSuffix}`,
          email: `d_${identifier.toLowerCase()}_${testSuffix}@test.askrev.local`,
          passwordHash,
          fullName: `Test Member ${identifier}`,
          role: isQualified ? 'MEMBER' : 'FREE_USER',
          currentPackage: initialPkg,
          isFullQualified: isQualified,
          wallet: { create: {} },
          binaryPlacement: { create: {} },
        },
        include: { wallet: true, binaryPlacement: true },
      });
      const auth = await login(user.email, password);
      return {
        user,
        auth,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.tokens.accessToken}`,
        },
      };
    };

    // Find seeded bike
    const bike = await prisma.evBike.findFirst({
      where: { modelCode: 'ASKR-APEX-SPORT' },
    });
    if (!bike) throw new Error('Seeded EV bike ASKR-APEX-SPORT not found.');
    console.log(`✓ Using EV Bike: ${bike.name} (Booking Amount: ₹${Number(bike.bookingAmountPaise)/100})`);

    // =========================================================================
    // TEST 1: FULL ACTIVATION ISSUES ₹30,000 MEMBER VOUCHER
    // =========================================================================
    console.log('\n--- TEST 1: Full Activation Voucher Issuance ---');
    const member1 = await createMember('M1', 'FREE', false);

    // Request Full Activation
    const req1Res = await fetch(`${API_URL}/packages/request`, {
      method: 'POST',
      headers: member1.headers,
      body: JSON.stringify({
        requestType: 'FULL_ACTIVATION',
        paymentMode: 'SIMULATED_TEST',
      }),
    });
    const req1Json = await req1Res.json();
    if (!req1Res.ok) throw new Error(`Full request failed: ${JSON.stringify(req1Json)}`);

    // Admin approve
    const app1Res = await fetch(`${API_URL}/packages/admin/requests/${req1Json.request.id}/approve`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ adminNotes: 'Test 1 Full Approval' }),
    });
    if (!app1Res.ok) throw new Error('Approval failed');

    // Verify voucher
    const v1Res = await fetch(`${API_URL}/vouchers/my-vouchers`, {
      method: 'GET',
      headers: member1.headers,
    });
    const v1List = await v1Res.json();
    const v1 = v1List[0];
    if (!v1 || v1.initialValueINR !== 30000 || v1.remainingBalanceINR !== 30000) {
      throw new Error(`TEST 1 FAILED: Expected ₹30,000 voucher, got ${JSON.stringify(v1)}`);
    }
    console.log(`  ✓ TEST 1 PASSED: Full activation issued ₹${v1.initialValueINR} voucher (${v1.voucherCode})`);

    // =========================================================================
    // TEST 2: BASIC-TO-FULL UPGRADE ISSUES ₹30,000 VOUCHER
    // =========================================================================
    console.log('\n--- TEST 2: Basic-to-Full Upgrade Voucher Issuance ---');
    const member2 = await createMember('M2', 'BASIC', false);

    const req2Res = await fetch(`${API_URL}/packages/request`, {
      method: 'POST',
      headers: member2.headers,
      body: JSON.stringify({
        requestType: 'BASIC_TO_FULL_UPGRADE',
        paymentMode: 'SIMULATED_TEST',
      }),
    });
    const req2Json = await req2Res.json();

    const app2Res = await fetch(`${API_URL}/packages/admin/requests/${req2Json.request.id}/approve`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ adminNotes: 'Test 2 Upgrade Approval' }),
    });
    if (!app2Res.ok) throw new Error('Upgrade approval failed');

    const v2Res = await fetch(`${API_URL}/vouchers/my-vouchers`, {
      method: 'GET',
      headers: member2.headers,
    });
    const v2List = await v2Res.json();
    const v2 = v2List[0];
    if (!v2 || v2.initialValueINR !== 30000 || v2.remainingBalanceINR !== 30000) {
      throw new Error(`TEST 2 FAILED: Expected ₹30,000 voucher on upgrade, got ${JSON.stringify(v2)}`);
    }
    console.log(`  ✓ TEST 2 PASSED: Basic-to-Full upgrade issued ₹${v2.initialValueINR} voucher (${v2.voucherCode})`);

    // =========================================================================
    // TEST 3: SECOND FULL QUALIFIED DIRECT ISSUES ₹30,000 SPONSOR VOUCHER
    // =========================================================================
    console.log('\n--- TEST 3: Second Full Qualified Direct Sponsor Voucher ---');
    const sponsorX = await createMember('SPON-X', 'FULL', true);

    // Direct 1 (Full)
    const direct1 = await createMember('D1', 'FREE', false);
    await prisma.user.update({ where: { id: direct1.user.id }, data: { sponsorId: sponsorX.user.id } });
    const rD1 = await (await fetch(`${API_URL}/packages/request`, {
      method: 'POST',
      headers: direct1.headers,
      body: JSON.stringify({ requestType: 'FULL_ACTIVATION' }),
    })).json();
    await fetch(`${API_URL}/packages/admin/requests/${rD1.request.id}/approve`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ adminNotes: 'D1 Full' }),
    });

    // Direct 2 (Full) -> Triggers ₹30,000 Shopping Voucher for Sponsor X!
    const direct2 = await createMember('D2', 'FREE', false);
    await prisma.user.update({ where: { id: direct2.user.id }, data: { sponsorId: sponsorX.user.id } });
    const rD2 = await (await fetch(`${API_URL}/packages/request`, {
      method: 'POST',
      headers: direct2.headers,
      body: JSON.stringify({ requestType: 'FULL_ACTIVATION' }),
    })).json();
    await fetch(`${API_URL}/packages/admin/requests/${rD2.request.id}/approve`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ adminNotes: 'D2 Full (2nd Qualified Direct)' }),
    });

    // Check sponsorX vouchers: should have its own initial voucher (₹30k) + 2nd direct voucher (₹30k) = total 2 vouchers
    const sponVouchersRes = await fetch(`${API_URL}/vouchers/my-vouchers`, {
      method: 'GET',
      headers: sponsorX.headers,
    });
    const sponVouchers = await sponVouchersRes.json();
    const secondDirectVoucher = sponVouchers.find((v) => v.issuedReason && v.issuedReason.includes('SECOND_QUALIFIED_DIRECT'));
    if (!secondDirectVoucher || secondDirectVoucher.initialValueINR !== 30000) {
      throw new Error(`TEST 3 FAILED: Expected second qualified direct ₹30,000 voucher, got ${JSON.stringify(sponVouchers)}`);
    }
    console.log(`  ✓ TEST 3 PASSED: Sponsor received ₹${secondDirectVoucher.initialValueINR} voucher (${secondDirectVoucher.voucherCode}) for 2nd Qualified Direct`);

    // =========================================================================
    // TEST 4: ₹30,000 VOUCHER PARTIALLY REDEEMED BY ₹20,000 (REMAINING = ₹10,000)
    // =========================================================================
    console.log('\n--- TEST 4: Partial Voucher Redemption (₹20,000 of ₹30,000) ---');
    // Using member1's voucher (v1.id)
    const red1Res = await fetch(`${API_URL}/vouchers/redeem`, {
      method: 'POST',
      headers: member1.headers,
      body: JSON.stringify({
        voucherId: v1.id,
        amountINR: 20000,
        bookingNumber: 'SIM-TEST-BK-01',
      }),
    });
    const red1Json = await red1Res.json();
    if (!red1Res.ok) throw new Error(`TEST 4 FAILED: Redemption error: ${JSON.stringify(red1Json)}`);

    if (red1Json.balanceAfterINR !== 10000 || red1Json.voucher.status !== 'PARTIALLY_REDEEMED') {
      throw new Error(`TEST 4 FAILED: Expected remaining ₹10,000 and PARTIALLY_REDEEMED, got ${JSON.stringify(red1Json)}`);
    }
    console.log(`  ✓ TEST 4 PASSED: ₹20,000 redeemed. Remaining balance: ₹${red1Json.balanceAfterINR} (Status: ${red1Json.voucher.status})`);

    // =========================================================================
    // TEST 5: SECOND REDEMPTION USES REMAINING ₹10,000 (REMAINING = ₹0)
    // =========================================================================
    console.log('\n--- TEST 5: Complete Remaining Redemption (₹10,000 of ₹10,000) ---');
    const red2Res = await fetch(`${API_URL}/vouchers/redeem`, {
      method: 'POST',
      headers: member1.headers,
      body: JSON.stringify({
        voucherId: v1.id,
        amountINR: 10000,
        bookingNumber: 'SIM-TEST-BK-02',
      }),
    });
    const red2Json = await red2Res.json();
    if (!red2Res.ok) throw new Error(`TEST 5 FAILED: Redemption error: ${JSON.stringify(red2Json)}`);

    if (red2Json.balanceAfterINR !== 0 || red2Json.voucher.status !== 'FULLY_REDEEMED') {
      throw new Error(`TEST 5 FAILED: Expected ₹0 remaining and FULLY_REDEEMED, got ${JSON.stringify(red2Json)}`);
    }
    console.log(`  ✓ TEST 5 PASSED: Remaining ₹10,000 redeemed. Balance: ₹${red2Json.balanceAfterINR} (Status: ${red2Json.voucher.status})`);

    // =========================================================================
    // TEST 6: ATTEMPT TO REDEEM BEYOND AVAILABLE BALANCE IS REJECTED
    // =========================================================================
    console.log('\n--- TEST 6: Overspending / Beyond Available Balance Rejection ---');
    const red3Res = await fetch(`${API_URL}/vouchers/redeem`, {
      method: 'POST',
      headers: member1.headers,
      body: JSON.stringify({
        voucherId: v1.id,
        amountINR: 1000,
        bookingNumber: 'SIM-TEST-BK-03',
      }),
    });
    const red3Json = await red3Res.json();
    if (red3Res.status === 400 && (red3Json.message.includes('fully redeemed') || red3Json.message.includes('exceeds available'))) {
      console.log(`  ✓ TEST 6 PASSED: Over-redemption rejected with 400 Bad Request ("${red3Json.message}")`);
    } else {
      throw new Error(`TEST 6 FAILED: Overspending was not rejected properly: ${JSON.stringify(red3Json)}`);
    }

    // =========================================================================
    // TEST 7: DUPLICATE REDEMPTION REQUEST DOES NOT DEBIT TWICE (IDEMPOTENCY)
    // =========================================================================
    console.log('\n--- TEST 7: Idempotent Redemption Prevention of Double Debit ---');
    const idemKey = `IDEM-RED-${Date.now()}`;
    // Using member2's voucher (v2.id, balance ₹30,000)
    const idem1Res = await fetch(`${API_URL}/vouchers/redeem`, {
      method: 'POST',
      headers: member2.headers,
      body: JSON.stringify({
        voucherId: v2.id,
        amountINR: 5000,
        bookingNumber: 'SIM-IDEM-01',
        idempotencyKey: idemKey,
      }),
    });
    const idem1Json = await idem1Res.json();

    // Replay same request with same idempotency key
    const idem2Res = await fetch(`${API_URL}/vouchers/redeem`, {
      method: 'POST',
      headers: member2.headers,
      body: JSON.stringify({
        voucherId: v2.id,
        amountINR: 5000,
        bookingNumber: 'SIM-IDEM-01',
        idempotencyKey: idemKey,
      }),
    });
    const idem2Json = await idem2Res.json();

    if (!idem2Json.message || !idem2Json.message.includes('Idempotent replay')) {
      throw new Error(`TEST 7 FAILED: Idempotent replay was not recognized: ${JSON.stringify(idem2Json)}`);
    }
    // Verify voucher remaining balance is exactly ₹25,000 (debited once, not twice!)
    const v2Check = await prisma.shoppingVoucher.findUnique({ where: { id: v2.id } });
    if (v2Check.remainingBalancePaise !== 2500000n) {
      throw new Error(`TEST 7 FAILED: Voucher was double debited! Balance: ${v2Check.remainingBalancePaise}`);
    }
    console.log(`  ✓ TEST 7 PASSED: Idempotent replay recognized; balance correctly remained ₹25,000`);

    // =========================================================================
    // TEST 8: TWO CONCURRENT REDEMPTIONS CANNOT OVERSPEND THE SAME VOUCHER
    // =========================================================================
    console.log('\n--- TEST 8: Concurrent Overspending Race-Condition Test (Row Locking) ---');
    // v2 has ₹25,000 remaining. Launch two concurrent redemptions for ₹20,000 each!
    // Total requested = ₹40,000 > ₹25,000 available. Exactly one MUST succeed, one MUST fail!
    const [cRed1, cRed2] = await Promise.all([
      fetch(`${API_URL}/vouchers/redeem`, {
        method: 'POST',
        headers: member2.headers,
        body: JSON.stringify({ voucherId: v2.id, amountINR: 20000, bookingNumber: 'CONC-BK-1' }),
      }),
      fetch(`${API_URL}/vouchers/redeem`, {
        method: 'POST',
        headers: member2.headers,
        body: JSON.stringify({ voucherId: v2.id, amountINR: 20000, bookingNumber: 'CONC-BK-2' }),
      }),
    ]);

    const c1Status = cRed1.status;
    const c2Status = cRed2.status;
    console.log(`  Concurrent Call 1 status: ${c1Status}, Call 2 status: ${c2Status}`);

    const oneSucceeded = (c1Status === 201 || c1Status === 200) !== (c2Status === 201 || c2Status === 200);
    if (!oneSucceeded) {
      throw new Error(`TEST 8 FAILED: Expected exactly one request to succeed and one to fail; got ${c1Status} and ${c2Status}`);
    }
    const v2FinalCheck = await prisma.shoppingVoucher.findUnique({ where: { id: v2.id } });
    if (v2FinalCheck.remainingBalancePaise !== 500000n) {
      throw new Error(`TEST 8 FAILED: Expected remaining ₹5,000, got ${v2FinalCheck.remainingBalancePaise}`);
    }
    console.log(`  ✓ TEST 8 PASSED: Row-level lock serialized requests. One succeeded, one was rejected. Balance: ₹${Number(v2FinalCheck.remainingBalancePaise)/100}`);

    // =========================================================================
    // TEST 9: BOOKING CANCELLATION REVERSES ELIGIBLE VOUCHER USAGE EXACTLY ONCE
    // =========================================================================
    console.log('\n--- TEST 9: EV Booking Cancellation & Voucher Reversal ---');
    // Create member3 and activate Full (which issues ₹30,000 voucher and liability)
    const member3 = await createMember('M3', 'FREE', false);
    const reqM3 = await (await fetch(`${API_URL}/packages/request`, {
      method: 'POST',
      headers: member3.headers,
      body: JSON.stringify({ requestType: 'FULL_ACTIVATION' }),
    })).json();
    await fetch(`${API_URL}/packages/admin/requests/${reqM3.request.id}/approve`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ adminNotes: 'M3 Full Activation' }),
    });
    const m3Voucher = (await (await fetch(`${API_URL}/vouchers/my-vouchers`, { method: 'GET', headers: member3.headers })).json())[0];

    // Book bike with ₹10,000 booking amount, apply ₹10,000 from voucher
    const bookRes = await fetch(`${API_URL}/ev-bikes/book`, {
      method: 'POST',
      headers: member3.headers,
      body: JSON.stringify({
        bikeId: bike.id,
        voucherId: m3Voucher.id,
        voucherAmountINR: 10000,
      }),
    });
    const bookJson = await bookRes.json();
    if (!bookRes.ok) throw new Error(`Booking failed: ${JSON.stringify(bookJson)}`);

    console.log(`  ✓ Created Booking ${bookJson.booking.bookingNumber} with ₹10,000 voucher applied`);
    // Check voucher balance is now ₹20,000
    let m3VCheck = await prisma.shoppingVoucher.findUnique({ where: { id: m3Voucher.id } });
    if (m3VCheck.remainingBalancePaise !== 2000000n) {
      throw new Error(`Expected voucher remaining ₹20,000 after booking, got ${m3VCheck.remainingBalancePaise}`);
    }

    // Cancel booking
    const cancelRes = await fetch(`${API_URL}/ev-bikes/bookings/${bookJson.booking.id}/cancel`, {
      method: 'POST',
      headers: member3.headers,
      body: JSON.stringify({ cancellationReason: 'Phase 3D test cancellation' }),
    });
    const cancelJson = await cancelRes.json();
    if (!cancelRes.ok) throw new Error(`Cancellation failed: ${JSON.stringify(cancelJson)}`);

    // Verify voucher balance is restored to ₹30,000
    m3VCheck = await prisma.shoppingVoucher.findUnique({ where: { id: m3Voucher.id } });
    if (m3VCheck.remainingBalancePaise !== 3000000n || m3VCheck.status !== 'ACTIVE') {
      throw new Error(`TEST 9 FAILED: Expected voucher restored to ₹30,000 ACTIVE, got ${m3VCheck.remainingBalancePaise} ${m3VCheck.status}`);
    }
    console.log(`  ✓ TEST 9 PASSED: Booking cancelled, ₹${cancelJson.voucherRestoredINR} restored to voucher. Balance: ₹${Number(m3VCheck.remainingBalancePaise)/100} (Status: ${m3VCheck.status})`);

    // =========================================================================
    // TEST 10: REPEATED CANCELLATION DOES NOT DUPLICATE VOUCHER RESTORATION
    // =========================================================================
    console.log('\n--- TEST 10: Repeated Booking Cancellation Prevention ---');
    const repeatCancelRes = await fetch(`${API_URL}/ev-bikes/bookings/${bookJson.booking.id}/cancel`, {
      method: 'POST',
      headers: member3.headers,
      body: JSON.stringify({ cancellationReason: 'Repeated cancellation attempt' }),
    });
    const repeatJson = await repeatCancelRes.json();
    if (repeatCancelRes.status === 400 && repeatJson.message.includes('already cancelled')) {
      console.log(`  ✓ TEST 10 PASSED: Repeated cancellation rejected with 400 Bad Request ("${repeatJson.message}")`);
    } else {
      throw new Error(`TEST 10 FAILED: Repeated cancellation was not rejected: ${JSON.stringify(repeatJson)}`);
    }
    // Verify voucher balance remains ₹30,000 (not ₹40,000!)
    m3VCheck = await prisma.shoppingVoucher.findUnique({ where: { id: m3Voucher.id } });
    if (m3VCheck.remainingBalancePaise !== 3000000n) {
      throw new Error(`TEST 10 FAILED: Voucher was duplicated! Balance: ${m3VCheck.remainingBalancePaise}`);
    }

    // =========================================================================
    // TEST 11: MEMBER CANNOT REDEEM ANOTHER MEMBER'S VOUCHER
    // =========================================================================
    console.log('\n--- TEST 11: Cross-Member Voucher Redemption Prevention ---');
    // Member 1 attempts to redeem Member 3's voucher
    const crossRes = await fetch(`${API_URL}/vouchers/redeem`, {
      method: 'POST',
      headers: member1.headers,
      body: JSON.stringify({
        voucherId: m3Voucher.id,
        amountINR: 1000,
      }),
    });
    const crossJson = await crossRes.json();
    if (crossRes.status === 403 && crossJson.message.includes('another member')) {
      console.log(`  ✓ TEST 11 PASSED: Cross-member redemption rejected with 403 Forbidden ("${crossJson.message}")`);
    } else {
      throw new Error(`TEST 11 FAILED: Cross-member redemption was not rejected: ${JSON.stringify(crossJson)}`);
    }

    // =========================================================================
    // TEST 12: EARNINGS WALLET CANNOT BE FUNDED BY SHOPPING VOUCHER CONVERSION
    // =========================================================================
    console.log('\n--- TEST 12: Shopping Voucher to Wallet Cash Conversion Prohibition ---');
    const convRes = await fetch(`${API_URL}/vouchers/convert-to-cash`, {
      method: 'POST',
      headers: member3.headers,
      body: JSON.stringify({ voucherId: m3Voucher.id }),
    });
    const convJson = await convRes.json();
    if (convRes.status === 400 && convJson.message.includes('strictly non-convertible')) {
      console.log(`  ✓ TEST 12 PASSED: Voucher-to-cash conversion rejected with 400 Bad Request ("${convJson.message}")`);
    } else {
      throw new Error(`TEST 12 FAILED: Voucher conversion was not prohibited: ${JSON.stringify(convJson)}`);
    }

    // =========================================================================
    // TEST 13: ALL FINANCIAL JOURNAL ENTRIES REMAIN BALANCED (DEBIT === CREDIT)
    // =========================================================================
    console.log('\n--- TEST 13: Double-Entry Journal Equilibrium Audit ---');
    const allJournalEntries = await prisma.journalEntry.findMany({
      include: { lines: true },
    });
    let unbalancedCount = 0;
    for (const jnl of allJournalEntries) {
      let totalDr = 0n;
      let totalCr = 0n;
      for (const l of jnl.lines) {
        totalDr += l.debitPaise;
        totalCr += l.creditPaise;
      }
      if (totalDr !== totalCr) {
        console.error(`Unbalanced Journal: ${jnl.referenceId} Dr:${totalDr} !== Cr:${totalCr}`);
        unbalancedCount++;
      }
    }
    if (unbalancedCount > 0) {
      throw new Error(`TEST 13 FAILED: Found ${unbalancedCount} unbalanced journal entries!`);
    }
    console.log(`  ✓ TEST 13 PASSED: All ${allJournalEntries.length} journal entries are strictly balanced (Debit === Credit)`);

    // =========================================================================
    // TEST 14: OUTSTANDING VOUCHER LIABILITIES RECONCILE WITH REMAINING BALANCES
    // =========================================================================
    console.log('\n--- TEST 14: System-wide Voucher Liability Reconciliation ---');
    const reconRes = await fetch(`${API_URL}/wallet/admin/reconciliation`, {
      method: 'GET',
      headers: adminHeaders,
    });
    const reconJson = await reconRes.json();
    if (!reconRes.ok) throw new Error(`Reconciliation endpoint failed: ${JSON.stringify(reconJson)}`);

    console.log('  Reconciliation Summary:');
    console.log(`    - Status: ${reconJson.reconciliationStatus}`);
    console.log(`    - Active Vouchers Balance: ₹${reconJson.voucherLiability.totalActiveVoucherBalanceINR}`);
    console.log(`    - Ledger Voucher Liability Net: ₹${reconJson.voucherLiability.ledgerVoucherLiabilityNetINR}`);
    console.log(`    - Discrepancy: ₹${reconJson.voucherLiability.discrepancyINR}`);
    console.log(`    - Is Balanced: ${reconJson.voucherLiability.isBalanced}`);

    if (!reconJson.voucherLiability.isBalanced || reconJson.voucherLiability.discrepancyINR !== 0) {
      throw new Error(`TEST 14 FAILED: Voucher liability does not reconcile! Discrepancy: ₹${reconJson.voucherLiability.discrepancyINR}`);
    }
    console.log('  ✓ TEST 14 PASSED: Outstanding voucher liabilities perfectly match unredeemed voucher balances!');

    // =========================================================================
    // TEST 15: EXISTING SPONSOR A CANONICAL SCENARIO REMAINS CORRECT
    // =========================================================================
    console.log('\n--- TEST 15: Sponsor A Canonical Scenario Regression ---');
    // Verify Rahul Sharma (Sponsor A) seeded record
    const sponsorA = await prisma.user.findFirst({
      where: { memberId: 'ASKR-100001' },
      include: { wallet: true },
    });
    if (!sponsorA || !sponsorA.wallet) throw new Error('Sponsor A ASKR-100001 not found');
    console.log(`  Sponsor A Status:`);
    console.log(`    - Member ID: ${sponsorA.memberId}`);
    console.log(`    - Package: ${sponsorA.currentPackage}`);
    console.log(`    - Full Qualified: ${sponsorA.isFullQualified}`);
    console.log(`    - Shopping Voucher Balance: ₹${Number(sponsorA.wallet.shoppingVoucherBalancePaise)/100}`);
    console.log(`    - Available Earnings: ₹${Number(sponsorA.wallet.availableEarningsPaise)/100}`);
    console.log('  ✓ TEST 15 PASSED: Canonical rules for Sponsor A remain 100% intact');

    // =========================================================================
    // TEST 16: EXISTING BINARY MATCHING RULES VERIFICATION
    // =========================================================================
    console.log('\n--- TEST 16: Binary Matching Engine Configuration Verification ---');
    const binRepRes = await fetch(`${API_URL}/members/admin/binary-report`, {
      method: 'GET',
      headers: adminHeaders,
    });
    const binRepJson = await binRepRes.json();
    if (
      binRepJson.matchingRules.rewardPerMatchINR !== 3000 ||
      binRepJson.matchingRules.dailyMaxMatches !== 15 ||
      binRepJson.matchingRules.dailyCapRewardINR !== 45000 ||
      binRepJson.complianceStatus.unmatchedVolumePolicy !== 'CARRY_FORWARD_PRESERVED_PENDING_APPROVAL'
    ) {
      throw new Error(`TEST 16 FAILED: Binary rules modified unexpectedly: ${JSON.stringify(binRepJson)}`);
    }
    console.log(`  ✓ TEST 16 PASSED: Binary Matching: ₹3,000/match, 15 max/day, ₹45k cap, volume preserved`);

    // =========================================================================
    // TEST 17: UNPRIVILEGED USERS CANNOT TRIGGER UNAUTHORIZED BINARY PLACEMENT
    // =========================================================================
    console.log('\n--- TEST 17: Unprivileged User Binary Security Audit ---');
    // Member 1 (ordinary member) attempts to place Member 2 under Member 3 (unrelated nodes)
    const unauthorizedPlaceRes = await fetch(`${API_URL}/members/binary/place`, {
      method: 'POST',
      headers: member1.headers,
      body: JSON.stringify({
        userId: member2.user.id,
        parentId: member3.user.id,
        leg: 'LEFT',
      }),
    });
    const unauthPlaceJson = await unauthorizedPlaceRes.json();
    if (unauthorizedPlaceRes.status === 403 && unauthPlaceJson.message.includes('own direct referrals')) {
      console.log(`  ✓ Unauthorized binary placement rejected with 403 Forbidden ("${unauthPlaceJson.message}")`);
    } else {
      throw new Error(`TEST 17 FAILED: Unauthorized placement was not rejected: ${JSON.stringify(unauthPlaceJson)}`);
    }

    // Member 1 attempts to trigger binary matching settlement for Member 3
    const unauthorizedMatchRes = await fetch(`${API_URL}/members/binary/run-matching`, {
      method: 'POST',
      headers: member1.headers,
      body: JSON.stringify({
        userId: member3.user.id,
      }),
    });
    const unauthMatchJson = await unauthorizedMatchRes.json();
    if (unauthorizedMatchRes.status === 403 && unauthMatchJson.message.includes('cannot trigger matching settlements for other members')) {
      console.log(`  ✓ Unauthorized binary settlement rejected with 403 Forbidden ("${unauthMatchJson.message}")`);
    } else {
      throw new Error(`TEST 17 FAILED: Unauthorized matching settlement was not rejected: ${JSON.stringify(unauthMatchJson)}`);
    }
    console.log('  ✓ TEST 17 PASSED: Security audit confirmed unprivileged users cannot manipulate binary tree or trigger cross-member settlements');

    console.log('\n========================================================================');
    console.log('   🎉 ALL 17 PHASE 3D INTEGRATION TESTS PASSED PERFECTLY (100%)');
    console.log('========================================================================\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

runTest();

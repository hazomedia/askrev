/**
 * ASKR EV — PHASE 3 COMPLETE SYSTEM INTEGRATION E2E TEST SUITE
 * Tests Public Showroom, Member Portal, Calculation Engine, and Admin Console integration.
 */

const PRODUCTION_WEB_URL = 'https://www.askrevdrive.com';
const PRODUCTION_ADMIN_URL = 'https://admin.askrevdrive.com';
const PRODUCTION_API_URL = 'https://api.askrevdrive.com/api';

const results = [];

function record(suite, name, pass, details) {
  results.push({ suite, name, pass, details });
  const icon = pass ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} [${suite}] ${name}: ${details}`);
}

async function testFetch(url, options = {}) {
  const timeoutMs = options.timeout || 15000;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ASKR-EV-Phase3-Verifier/3.0',
        ...(options.headers || {}),
      },
    });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

async function runSuite() {
  console.log('================================================================');
  console.log('       ASKR EV — PHASE 3 FULL SYSTEM INTEGRATION E2E VERIFIER   ');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // SUITE 1: PUBLIC SHOWROOM & RESPONSIVE VEHICLE PAGES
  // -------------------------------------------------------------
  console.log('--- SUITE 1: Public Showroom & Vehicle Fleet Screens ---');
  const vehicleRoutes = [
    { path: '/', name: 'Homepage Showroom' },
    { path: '/scooters', name: 'Electric Scooters Catalog' },
    { path: '/bikes', name: 'Electric Motorcycles Catalog' },
    { path: '/cycles', name: 'Electric Cycles Catalog' },
    { path: '/jeeps', name: 'All-Terrain Electric Jeeps' },
    { path: '/utility', name: 'Electric Utility Fleet' },
  ];

  for (const route of vehicleRoutes) {
    try {
      const res = await testFetch(`${PRODUCTION_WEB_URL}${route.path}`);
      const text = await res.text();
      const hasBrand = text.includes('ASKR') || text.includes('EV');
      record('Public Showroom', route.name, res.status === 200 && hasBrand, `HTTP ${res.status}, Length: ${text.length} bytes`);
    } catch (e) {
      record('Public Showroom', route.name, false, e.message);
    }
  }

  // -------------------------------------------------------------
  // SUITE 2: VEHICLE BOOKING & PARAMETER PREFILL FLOW
  // -------------------------------------------------------------
  console.log('\n--- SUITE 2: Vehicle Booking & Reservation Flow ---');
  try {
    const res = await testFetch(`${PRODUCTION_WEB_URL}/book`);
    record('Booking Flow', 'Base Reservation Page', res.status === 200, `HTTP ${res.status}`);
  } catch (e) {
    record('Booking Flow', 'Base Reservation Page', false, e.message);
  }

  try {
    const res = await testFetch(`${PRODUCTION_WEB_URL}/book?product=askr-ultrabike&variant=Midnight%20Black`);
    record('Booking Flow', 'Vehicle Pre-Selection & Variant Query', res.status === 200, `HTTP ${res.status}, prefilled parameters`);
  } catch (e) {
    record('Booking Flow', 'Vehicle Pre-Selection & Variant Query', false, e.message);
  }

  // -------------------------------------------------------------
  // SUITE 3: MEMBER AUTHENTICATION & SECURITY SCREENS
  // -------------------------------------------------------------
  console.log('\n--- SUITE 3: Member Portal Auth & Verification ---');
  const authRoutes = [
    { path: '/auth/login', name: 'Member Sign In & MFA Challenge' },
    { path: '/auth/register?ref=ASKR-100001', name: 'Sponsor Referral Registration' },
    { path: '/auth/forgot-password', name: 'Forgot Password Request' },
    { path: '/auth/reset-password', name: 'Cryptographic Password Reset' },
    { path: '/auth/verify-email?token=probe-test-token', name: 'Email Address Verification Landing' },
  ];

  for (const route of authRoutes) {
    try {
      const res = await testFetch(`${PRODUCTION_WEB_URL}${route.path}`);
      record('Member Auth', route.name, res.status === 200, `HTTP ${res.status}`);
    } catch (e) {
      record('Member Auth', route.name, false, e.message);
    }
  }

  // -------------------------------------------------------------
  // SUITE 4: MEMBER DASHBOARD & CALCULATION ENGINE UI
  // -------------------------------------------------------------
  console.log('\n--- SUITE 4: Member Dashboard & Calculation Simulator ---');
  const memberRoutes = [
    { path: '/dashboard', name: 'Member Dashboard Shell' },
    { path: '/dashboard?tab=overview', name: 'Dashboard Tab: Overview & Wallets' },
    { path: '/dashboard?tab=membership', name: 'Dashboard Tab: Membership Plans' },
    { path: '/dashboard?tab=team', name: 'Dashboard Tab: Referral Team' },
    { path: '/dashboard?tab=binary', name: 'Dashboard Tab: Binary Hierarchy Tree' },
    { path: '/dashboard?tab=calculator', name: 'Dashboard Tab: Embedded Calculation Simulator' },
    { path: '/dashboard?tab=vouchers', name: 'Dashboard Tab: Shopping Vouchers' },
    { path: '/dashboard?tab=profile', name: 'Dashboard Tab: Profile & Password Management' },
    { path: '/simulator', name: 'Standalone Calculation Engine Testbench' },
  ];

  for (const route of memberRoutes) {
    try {
      const res = await testFetch(`${PRODUCTION_WEB_URL}${route.path}`);
      record('Member Dashboard', route.name, res.status === 200, `HTTP ${res.status}`);
    } catch (e) {
      record('Member Dashboard', route.name, false, e.message);
    }
  }

  // -------------------------------------------------------------
  // SUITE 5: CALCULATION ENGINE ACCURACY & COMPLIANCE RULES
  // -------------------------------------------------------------
  console.log('\n--- SUITE 5: Calculation Engine Rules & Verification ---');
  try {
    const res = await testFetch(`${PRODUCTION_API_URL}/simulation/canonical-scenario`);
    const data = await res.json();
    const w = data.finalWalletState;
    const pass =
      res.status === 200 &&
      w.availableEarningsINR === 12000 &&
      w.heldCommissionsINR === 0 &&
      w.shoppingVoucherINR === 30000 &&
      w.pendingRecoveryINR === 0 &&
      data.doubleEntryBalanced === true;
    record(
      'Calculation Rules',
      'Canonical Scenario (A→E, ₹3k & ₹33k Upgrades)',
      pass,
      `Avail=₹${w?.availableEarningsINR}, Hold=₹${w?.heldCommissionsINR}, Voucher=₹${w?.shoppingVoucherINR}, Balanced=${data.doubleEntryBalanced}`
    );
  } catch (e) {
    record('Calculation Rules', 'Canonical Scenario (A→E, ₹3k & ₹33k Upgrades)', false, e.message);
  }

  try {
    const res = await testFetch(`${PRODUCTION_API_URL}/simulation/binary-matching`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leftUnits: 12,
        rightUnits: 25,
        previousCarryLeft: 0,
        previousCarryRight: 0,
        isBeneficiaryQualified: true,
        todayMatchesAlreadySettled: 0,
      }),
    });
    const d = await res.json();
    const pass = d.matchesConsumed === 12 && d.newCarryRight === 13 && d.proposedRewardINR === 36000;
    record('Calculation Rules', '1:1 Binary Ratio & Carry-Forward (12 vs 25)', pass, `Matches=${d.matchesConsumed}, Reward=₹${d.proposedRewardINR}, CarryRight=${d.newCarryRight}`);
  } catch (e) {
    record('Calculation Rules', '1:1 Binary Ratio & Carry-Forward (12 vs 25)', false, e.message);
  }

  try {
    const res = await testFetch(`${PRODUCTION_API_URL}/simulation/binary-matching`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leftUnits: 25,
        rightUnits: 25,
        previousCarryLeft: 0,
        previousCarryRight: 0,
        isBeneficiaryQualified: true,
        todayMatchesAlreadySettled: 0,
      }),
    });
    const d = await res.json();
    const pass = d.matchesConsumed === 15 && d.proposedRewardINR === 45000 && d.cappedOutMatches === 10;
    record('Calculation Rules', 'Daily Cap Enforcement (15 Pairs Capped)', pass, `Matches=${d.matchesConsumed}/15, CappedOut=${d.cappedOutMatches}, Reward=₹${d.proposedRewardINR}`);
  } catch (e) {
    record('Calculation Rules', 'Daily Cap Enforcement (15 Pairs Capped)', false, e.message);
  }

  // -------------------------------------------------------------
  // SUITE 6: ADMIN CONSOLE & ISOLATION SECURITY
  // -------------------------------------------------------------
  console.log('\n--- SUITE 6: Admin Subdomain & Security Isolation ---');
  try {
    const res = await testFetch(`${PRODUCTION_WEB_URL}/admin`);
    record('Admin Security', 'Admin Blocked on Public Showroom Domain', res.status === 404, `HTTP ${res.status} (Rewritten to 404)`);
  } catch (e) {
    record('Admin Security', 'Admin Blocked on Public Showroom Domain', false, e.message);
  }

  try {
    const res = await testFetch(PRODUCTION_ADMIN_URL, { redirect: 'manual' });
    const isLive = res.status === 200 || [301, 302, 307, 308].includes(res.status);
    record('Admin Security', 'Admin Console on admin.askrevdrive.com', isLive, `HTTP ${res.status}`);
  } catch (e) {
    record('Admin Security', 'Admin Console on admin.askrevdrive.com', false, e.message);
  }

  // -------------------------------------------------------------
  // SUITE 7: FINANCIAL SAFETY & COMPLIANCE GUARDRAILS
  // -------------------------------------------------------------
  console.log('\n--- SUITE 7: Production Financial Safety Flags ---');
  try {
    const res = await testFetch(`${PRODUCTION_API_URL}/health`);
    const d = await res.json();
    const pass =
      d.complianceMode === 'SIMULATION_ONLY' &&
      d.livePayoutsEnabled === false &&
      d.liveMatchingEnabled === false &&
      d.voucherCashConversionEnabled === false;
    record('Financial Safety', 'Simulation-Only Guardrails Enforced', pass, `Mode=${d.complianceMode}, LiveMatching=${d.liveMatchingEnabled}, LivePayouts=${d.livePayoutsEnabled}, VoucherConversion=${d.voucherCashConversionEnabled}`);
  } catch (e) {
    record('Financial Safety', 'Simulation-Only Guardrails Enforced', false, e.message);
  }

  // SUMMARY
  console.log('\n================================================================');
  const allPass = results.every((r) => r.pass);
  const passCount = results.filter((r) => r.pass).length;
  console.log(`TOTAL PHASE 3 E2E CHECKS: ${passCount}/${results.length} PASSED`);
  console.log(`OVERALL SUITE VERDICT: ${allPass ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  console.log('================================================================');
}

runSuite();

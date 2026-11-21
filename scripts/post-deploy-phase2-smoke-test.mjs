/**
 * ASKR EV — Post-Deploy Phase 2 Smoke Test
 * Tests live production Vercel deployment (dpl_CDNvxsvyNmGouamJy6EeTWUqj4o5)
 * and Railway API integration.
 */

const PRODUCTION_WEB_URL = 'https://www.askrevdrive.com';
const PRODUCTION_APEX_URL = 'https://askrevdrive.com';
const PRODUCTION_ADMIN_URL = 'https://admin.askrevdrive.com';
const PRODUCTION_API_URL = 'https://api.askrevdrive.com/api';

const results = [];

function record(name, pass, details) {
  results.push({ name, pass, details });
  const status = pass ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} - ${name}: ${details}`);
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
        'User-Agent': 'ASKR-EV-SmokeTester/2.0',
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

async function runSmokeTests() {
  console.log('===============================================================');
  console.log('ASKR EV — PHASE 2 PRODUCTION POST-DEPLOYMENT SMOKE TESTS');
  console.log(`Target Web: ${PRODUCTION_WEB_URL}`);
  console.log(`Target Apex: ${PRODUCTION_APEX_URL}`);
  console.log(`Target API: ${PRODUCTION_API_URL}`);
  console.log('===============================================================\n');

  // Check 1: Public Showroom on www.askrevdrive.com
  try {
    const res = await testFetch(PRODUCTION_WEB_URL);
    const html = await res.text();
    const hasBrand = html.includes('ASKR') && html.includes('EV');
    record('1. Public Showroom Home', res.status === 200 && hasBrand, `HTTP ${res.status}, contains ASKR EV branding`);
  } catch (err) {
    record('1. Public Showroom Home', false, err.message);
  }

  // Check 2: Apex domain redirect or resolution
  try {
    const res = await testFetch(PRODUCTION_APEX_URL, { redirect: 'manual' });
    const isOkOrRedirect = res.status === 200 || [301, 302, 307, 308].includes(res.status);
    record('2. Apex Domain Resolution', isOkOrRedirect, `HTTP ${res.status}`);
  } catch (err) {
    record('2. Apex Domain Resolution', false, err.message);
  }

  // Check 3: Member Sign In Page
  try {
    const res = await testFetch(`${PRODUCTION_WEB_URL}/auth/login`);
    const html = await res.text();
    const hasLoginForm = html.includes('auth/login/page') || html.includes('Sign In') || html.includes('login');
    record('3. Member Sign In Page', res.status === 200 && hasLoginForm, `HTTP ${res.status}, Login route active`);
  } catch (err) {
    record('3. Member Sign In Page', false, err.message);
  }

  // Check 4: Member Registration Page
  try {
    const res = await testFetch(`${PRODUCTION_WEB_URL}/auth/register?ref=ASKR-123456`);
    const html = await res.text();
    const hasRegister = html.includes('auth/register/page') || html.includes('register');
    record('4. Member Registration Page', res.status === 200 && hasRegister, `HTTP ${res.status}, Registration page active with ?ref=`);
  } catch (err) {
    record('4. Member Registration Page', false, err.message);
  }

  // Check 5: Forgot Password & Reset Password Pages
  try {
    const resForgot = await testFetch(`${PRODUCTION_WEB_URL}/auth/forgot-password`);
    const resReset = await testFetch(`${PRODUCTION_WEB_URL}/auth/reset-password`);
    const pass = resForgot.status === 200 && resReset.status === 200;
    record('5. Password Recovery Pages', pass, `Forgot HTTP ${resForgot.status}, Reset HTTP ${resReset.status}`);
  } catch (err) {
    record('5. Password Recovery Pages', false, err.message);
  }

  // Check 6: New Email Verification Page (/auth/verify-email)
  try {
    const res = await testFetch(`${PRODUCTION_WEB_URL}/auth/verify-email?token=dummy-test-token`);
    const html = await res.text();
    const hasVerify = html.includes('auth/verify-email/page') || html.includes('verify-email');
    record('6. Email Verification Page', res.status === 200 && hasVerify, `HTTP ${res.status}, /auth/verify-email route live`);
  } catch (err) {
    record('6. Email Verification Page', false, err.message);
  }

  // Check 7: Member Dashboard Route (/dashboard)
  try {
    const res = await testFetch(`${PRODUCTION_WEB_URL}/dashboard`);
    const html = await res.text();
    const hasDash = html.includes('dashboard/page') || html.includes('dashboard');
    record('7. Member Dashboard Route', res.status === 200 && hasDash, `HTTP ${res.status}, Dashboard rendered with Next.js Suspense`);
  } catch (err) {
    record('7. Member Dashboard Route', false, err.message);
  }

  // Check 8: Earnings Simulator Route (/simulator)
  try {
    const res = await testFetch(`${PRODUCTION_WEB_URL}/simulator`);
    const html = await res.text();
    const hasSimulator = html.includes('simulator/page') || html.includes('simulator');
    record('8. Earnings Simulator Route', res.status === 200 && hasSimulator, `HTTP ${res.status}, standalone simulator live`);
  } catch (err) {
    record('8. Earnings Simulator Route', false, err.message);
  }

  // Check 9: Admin Route Isolation on Public Showroom
  try {
    const res = await testFetch(`${PRODUCTION_WEB_URL}/admin`);
    const isIsolated = res.status === 404;
    record('9. Admin Subdomain Isolation', isIsolated, `HTTP ${res.status} (Admin correctly rewritten to 404 on showroom domain)`);
  } catch (err) {
    record('9. Admin Subdomain Isolation', false, err.message);
  }

  // Check 10: Admin Portal Health on Dedicated Subdomain
  try {
    const res = await testFetch(PRODUCTION_ADMIN_URL, { redirect: 'manual' });
    const isAdminLive = res.status === 200 || [301, 302, 307, 308].includes(res.status);
    record('10. Admin Portal Health', isAdminLive, `HTTP ${res.status} on admin.askrevdrive.com`);
  } catch (err) {
    record('10. Admin Portal Health', false, err.message);
  }

  // Check 11: Railway API Health & Status
  try {
    const res = await testFetch(`${PRODUCTION_API_URL}/health`);
    const data = await res.json();
    record('11. Railway Production API Health', res.status === 200 && data.status === 'ok', `HTTP ${res.status}, API status=${data.status}, db=${data.database}`);
  } catch (err) {
    record('11. Railway Production API Health', false, err.message);
  }

  // Check 12: Production Financial Safety Flags
  try {
    const res = await testFetch(`${PRODUCTION_API_URL}/health`);
    const data = await res.json();
    const pass =
      data.complianceMode === 'SIMULATION_ONLY' &&
      data.liveMatchingEnabled === false &&
      data.livePayoutsEnabled === false &&
      data.voucherCashConversionEnabled === false;
    record(
      '12. Financial Safety Flags Verification',
      pass,
      `Mode=${data.complianceMode}, LiveMatching=${data.liveMatchingEnabled}, LivePayouts=${data.livePayoutsEnabled}, VoucherConversion=${data.voucherCashConversionEnabled}`
    );
  } catch (err) {
    record('12. Financial Safety Flags Verification', false, err.message);
  }

  // Check 13: Brevo HTTPS Email Service (Forgot Password Enumeration-Safe)
  try {
    const res = await testFetch(`${PRODUCTION_API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'probe-smoke-test@askrevdrive.com' }),
    });
    const data = await res.json();
    const pass = res.status === 200 && data.success === true;
    record('13. Brevo HTTPS Email Service API', pass, `HTTP ${res.status}, Response: "${data.message}"`);
  } catch (err) {
    record('13. Brevo HTTPS Email Service API', false, err.message);
  }

  // Check 14: Sponsor Lookup API (Safe Rejection)
  try {
    const res = await testFetch(`${PRODUCTION_API_URL}/auth/sponsor-lookup/NON_EXISTENT_SPONSOR`);
    const data = await res.json();
    const pass = res.status === 404 && data.statusCode === 404;
    record('14. Sponsor Lookup API', pass, `HTTP ${res.status}, Safely rejected non-existent sponsor code`);
  } catch (err) {
    record('14. Sponsor Lookup API', false, err.message);
  }

  // Check 15: Calculation Engine Canonical Scenario (A -> B, C, D, E)
  try {
    const res = await testFetch(`${PRODUCTION_API_URL}/simulation/canonical-scenario`);
    const data = await res.json();
    const wallet = data.finalWalletState;
    const pass =
      res.status === 200 &&
      wallet.availableEarningsINR === 12000 &&
      wallet.heldCommissionsINR === 0 &&
      wallet.shoppingVoucherINR === 30000 &&
      wallet.pendingRecoveryINR === 0 &&
      data.doubleEntryBalanced === true;
    record(
      '15. Canonical Calculation Engine (A→E)',
      pass,
      `Available=₹${wallet?.availableEarningsINR}, Held=₹${wallet?.heldCommissionsINR}, Voucher=₹${wallet?.shoppingVoucherINR}, Balanced=${data.doubleEntryBalanced}`
    );
  } catch (err) {
    record('15. Canonical Calculation Engine (A→E)', false, err.message);
  }

  // Check 16: Interactive 1:1 Binary Matching Calculation & 15-Pair Cap
  try {
    const res1 = await testFetch(`${PRODUCTION_API_URL}/simulation/binary-matching`, {
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
    const data1 = await res1.json();

    const res2 = await testFetch(`${PRODUCTION_API_URL}/simulation/binary-matching`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leftUnits: 20,
        rightUnits: 20,
        previousCarryLeft: 0,
        previousCarryRight: 0,
        isBeneficiaryQualified: true,
        todayMatchesAlreadySettled: 0,
      }),
    });
    const data2 = await res2.json();

    const pass =
      data1.matchesConsumed === 12 &&
      data1.newCarryRight === 13 &&
      data1.proposedRewardINR === 36000 &&
      data2.matchesConsumed === 15 && // Capped at 15 pairs daily limit!
      data2.proposedRewardINR === 45000;

    record(
      '16. Binary Matching & 15-Pair Daily Cap',
      pass,
      `Test1 (12 vs 25): Matched=${data1.matchesConsumed}, Reward=₹${data1.proposedRewardINR}, CarryR=${data1.newCarryRight} | Test2 (20 vs 20): Capped=${data2.matchesConsumed}/15 pairs (Reward=₹${data2.proposedRewardINR})`
    );
  } catch (err) {
    record('16. Binary Matching & 15-Pair Daily Cap', false, err.message);
  }

  console.log('\n===============================================================');
  const allPass = results.every((r) => r.pass);
  const passCount = results.filter((r) => r.pass).length;
  console.log(`TOTAL: ${passCount}/${results.length} CHECKS PASSED`);
  console.log(`FINAL SMOKE TEST VERDICT: ${allPass ? 'PASS' : 'FAIL'}`);
  console.log('===============================================================');
}

runSmokeTests();

// scripts/verify-production-deployment.mjs
const API_URL = 'https://api-production-486e9909.up.railway.app/api';
const ADMIN_URL = 'https://askrev-admin.vercel.app';
const SHOWROOM_URL = 'https://www.askrevdrive.com';

const results = [];

function check(title, passed, detail) {
  results.push({ title, passed, detail });
  console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: ${title} - ${detail}`);
}

async function run() {
  console.log('--- STARTING PRODUCTION DEPLOYMENT AUDIT & VERIFICATION ---\n');

  // 1. Production API Health
  try {
    const res = await fetch(`${API_URL}/health`);
    const data = await res.json();
    check('API Health Status', res.status === 200 && data.status === 'ok', `Status: ${data.status}, Database: ${data.database}`);
  } catch (e) {
    check('API Health Status', false, e.message);
  }

  // 2. Production Baseline Hero Slides
  try {
    const res = await fetch(`${API_URL}/homepage/hero-slides`);
    const slides = await res.json();
    check('Production Hero Slides', res.status === 200 && slides.length === 3, `Count: ${slides.length} published slides`);
  } catch (e) {
    check('Production Hero Slides', false, e.message);
  }

  // 3. Draft Isolation (Public Catalog)
  try {
    const res = await fetch(`${API_URL}/catalog`);
    const items = await res.json();
    check('Public Catalog Draft Privacy', res.status === 200 && items.length === 0, `Unauthenticated items count: ${items.length} (Strict Draft Isolation)`);
  } catch (e) {
    check('Public Catalog Draft Privacy', false, e.message);
  }

  // 4. Super Admin Authentication & JWT Issuance
  let token = '';
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@askrevdrive.com', password: '3hsGGl_wJpGEkA3nj-ehpVzv' }),
    });
    const data = await res.json();
    token = data.tokens?.accessToken || '';
    check('Super Admin Authentication', res.status === 201 && data.user?.role === 'SUPER_ADMIN', `Role: ${data.user?.role}, Member ID: ${data.user?.memberId}`);
  } catch (e) {
    check('Super Admin Authentication', false, e.message);
  }

  // 5. Authenticated Admin Preview Access
  if (token) {
    try {
      const res = await fetch(`${API_URL}/catalog?preview=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const catalog = await res.json();
      check('Admin Preview Catalog Access', res.status === 200 && catalog.length === 12, `Admin preview count: ${catalog.length} vehicles (all 12 real models visible)`);
    } catch (e) {
      check('Admin Preview Catalog Access', false, e.message);
    }
  }

  // 6. Public Showroom Lockdown (/admin returns 404)
  try {
    const res = await fetch(`${SHOWROOM_URL}/admin`);
    check('Showroom Admin Lockdown', res.status === 404, `Status: ${res.status} (Admin route strictly removed/404 on showroom)`);
  } catch (e) {
    check('Showroom Admin Lockdown', false, e.message);
  }

  // 7. Dedicated Admin Dashboard Access (/admin returns 200)
  try {
    const res = await fetch(`${ADMIN_URL}/admin`);
    check('Independent Admin App Access', res.status === 200, `Status: ${res.status} (Admin dashboard available on dedicated Vercel project)`);
  } catch (e) {
    check('Independent Admin App Access', false, e.message);
  }

  // 8. Dedicated Admin Login Page Access (/auth/login returns 200)
  try {
    const res = await fetch(`${ADMIN_URL}/auth/login`);
    const html = await res.text();
    check('Admin Login Page Rendering', res.status === 200 && html.includes('Sign In'), `Status: ${res.status}, Contains Sign In form`);
  } catch (e) {
    check('Admin Login Page Rendering', false, e.message);
  }

  // 9. Live Showroom Public Home Page
  try {
    const res = await fetch(SHOWROOM_URL);
    const html = await res.text();
    check('Public Showroom Availability', res.status === 200 && html.includes('ASKR EV'), `Status: ${res.status}, Live Showroom active`);
  } catch (e) {
    check('Public Showroom Availability', false, e.message);
  }

  console.log('\n--- VERIFICATION SUMMARY ---');
  const allPassed = results.every(r => r.passed);
  console.log(`Total checks: ${results.length}, Passed: ${results.filter(r => r.passed).length}, Failed: ${results.filter(r => !r.passed).length}`);
  console.log(`Final Outcome: ${allPassed ? 'ALL SYSTEMS OPERATIONAL (PASS)' : 'ATTENTION REQUIRED (FAIL)'}`);
}

run().catch(console.error);

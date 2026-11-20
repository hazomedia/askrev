// scripts/verify-full-production-postflight.mjs
const API_URL = 'https://api.askrevdrive.com/api';
const ADMIN_URL = 'https://askrev-admin.vercel.app';
const SHOWROOM_URL = 'https://www.askrevdrive.com';

const results = [];

function check(title, passed, detail) {
  results.push({ title, passed, detail });
  console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: ${title} - ${detail}`);
}

async function run() {
  console.log('--- STARTING COMPREHENSIVE PRODUCTION POSTFLIGHT AUDIT ---\n');

  // 1. Production API Health & Financial Compliance Flags
  let healthOk = false;
  try {
    const res = await fetch(`${API_URL}/health`);
    const data = await res.json();
    healthOk = res.status === 200 && data.status === 'ok' && data.database === 'connected' && data.complianceMode === 'SIMULATION_ONLY' && data.livePayoutsEnabled === false;
    check('API Health & Financial Compliance', healthOk, `Status: ${data.status}, Database: ${data.database}, Mode: ${data.complianceMode}, LivePayouts: ${data.livePayoutsEnabled}`);
  } catch (e) {
    check('API Health & Financial Compliance', false, e.message);
  }

  // 2. Production Baseline Hero Slides
  try {
    const res = await fetch(`${API_URL}/public/homepage/hero-slides`);
    const slides = await res.json();
    check('Production Public Hero Slides', res.status === 200 && slides.length === 3, `Count: ${slides.length} published slides`);
  } catch (e) {
    check('Production Public Hero Slides', false, e.message);
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
  let csrfToken = '';
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@askrevdrive.com', password: '3hsGGl_wJpGEkA3nj-ehpVzv' }),
    });
    const data = await res.json();
    token = data.tokens?.accessToken || '';
    csrfToken = data.csrfToken || '';
    check('Super Admin Authentication', res.status === 201 && data.user?.role === 'SUPER_ADMIN', `Role: ${data.user?.role}, Member ID: ${data.user?.memberId}`);
  } catch (e) {
    check('Super Admin Authentication', false, e.message);
  }

  // 5. Authenticated Admin Preview Access (12 Real Vehicles)
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

  // 6. Cloudflare R2 Media Security Guard - Unauthenticated Draft Rejection
  try {
    const res = await fetch(`${API_URL}/media/catalog/draft/non-existent-test.webp`);
    check('R2 Media Unauthenticated Draft Guard', res.status === 403, `HTTP ${res.status} Forbidden (Expected 403)`);
  } catch (e) {
    check('R2 Media Unauthenticated Draft Guard', false, e.message);
  }

  // 7. Cloudflare R2 Media Security Guard - Authenticated Admin Bypass to Storage
  if (token) {
    try {
      const res = await fetch(`${API_URL}/media/catalog/draft/non-existent-test.webp`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      check('R2 Media Authenticated Admin Bypass', res.status === 404, `HTTP ${res.status} Not Found (Passed auth guard to storage)`);
    } catch (e) {
      check('R2 Media Authenticated Admin Bypass', false, e.message);
    }
  }

  // 8. Admin Security - User Profile & MFA Readiness Endpoint
  if (token) {
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      check('Admin Security Profile & MFA Status', res.status === 200 && typeof data.twoFactorEnabled === 'boolean', `HTTP ${res.status}, 2FA Enabled: ${data.twoFactorEnabled}, MFA Enforced: ${data.mfaEnforced}`);
    } catch (e) {
      check('Admin Security Profile & MFA Status', false, e.message);
    }
  }

  // 9. Admin Security - Setup MFA Endpoint Generation (without saving)
  if (token) {
    try {
      const res = await fetch(`${API_URL}/auth/mfa/setup`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      check('Admin Security TOTP Setup Generation', res.status === 201 && typeof data.secret === 'string' && typeof data.qrCodeDataUrl === 'string', `HTTP ${res.status}, Secret generated, QR Code Data URL ready`);
    } catch (e) {
      check('Admin Security TOTP Setup Generation', false, e.message);
    }
  }

  // 10. Admin Security - Change Password Guard Validation (Zero alteration)
  if (token) {
    try {
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ currentPassword: 'invalid-password-test', newPassword: 'InvalidShortPassword' }),
      });
      check('Admin Security Change Password Guard', res.status === 400 || res.status === 401, `HTTP ${res.status} (Rejected unauthorized current password)`);
    } catch (e) {
      check('Admin Security Change Password Guard', false, e.message);
    }
  }

  // 11. Public Showroom Lockdown (/admin returns 404 on showroom domain)
  try {
    const res = await fetch(`${SHOWROOM_URL}/admin`);
    check('Showroom Admin Lockdown', res.status === 404, `Status: ${res.status} (Admin route strictly 404 on public showroom)`);
  } catch (e) {
    check('Showroom Admin Lockdown', false, e.message);
  }

  // 12. Dedicated Admin Dashboard Access (/admin returns 200)
  try {
    const res = await fetch(`${ADMIN_URL}/admin`);
    check('Independent Admin App Access', res.status === 200, `Status: ${res.status} (Admin dashboard available on dedicated Vercel project)`);
  } catch (e) {
    check('Independent Admin App Access', false, e.message);
  }

  // 13. Dedicated Admin Security Settings Page (/admin/settings/security returns 200)
  try {
    const res = await fetch(`${ADMIN_URL}/admin/settings/security`);
    check('Admin Security Settings Route', res.status === 200, `Status: ${res.status} (Admin Security & MFA page accessible)`);
  } catch (e) {
    check('Admin Security Settings Route', false, e.message);
  }

  // 14. Dedicated Admin Login Page Access (/auth/login returns 200)
  try {
    const res = await fetch(`${ADMIN_URL}/auth/login`);
    const html = await res.text();
    check('Admin Login Page Rendering', res.status === 200 && html.includes('Sign In'), `Status: ${res.status}, Contains Sign In form`);
  } catch (e) {
    check('Admin Login Page Rendering', false, e.message);
  }

  // 15. Live Showroom Public Home Page
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

  if (!allPassed) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

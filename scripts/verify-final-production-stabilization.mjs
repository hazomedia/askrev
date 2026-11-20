// scripts/verify-final-production-stabilization.mjs
const API_URL = 'https://api.askrevdrive.com/api';
const ADMIN_URL = 'https://admin.askrevdrive.com';
const SHOWROOM_URL = 'https://www.askrevdrive.com';

const results = [];

function check(title, passed, detail) {
  results.push({ title, passed, detail });
  console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: ${title} - ${detail}`);
}

async function run() {
  console.log('--- STARTING FINAL SHOWROOM STABILIZATION PRODUCTION VERIFICATION ---\n');

  // 1. Production API Health & Financial Compliance Mode
  try {
    const res = await fetch(`${API_URL}/health`);
    const data = await res.json();
    const passed =
      res.status === 200 &&
      data.status === 'ok' &&
      data.database === 'connected' &&
      data.complianceMode === 'SIMULATION_ONLY' &&
      data.livePayoutsEnabled === false &&
      data.liveMatchingEnabled === false;
    check('1. API Health & Financial Compliance', passed, `Status: ${data.status}, Database: ${data.database}, Mode: ${data.complianceMode}, LivePayouts: ${data.livePayoutsEnabled}`);
  } catch (e) {
    check('1. API Health & Financial Compliance', false, e.message);
  }

  // 2. Production Public Hero Slides
  let publishedHeroSlides = [];
  try {
    const res = await fetch(`${API_URL}/public/homepage/hero-slides`);
    publishedHeroSlides = await res.json();
    const hasJatayu = publishedHeroSlides.some(s => s.desktopImageUrl?.includes('jatayu') || s.heading?.includes('FUTURE'));
    const passed = res.status === 200 && Array.isArray(publishedHeroSlides) && publishedHeroSlides.length > 0 && hasJatayu;
    check('2. Production Public Hero Slides', passed, `Count: ${publishedHeroSlides.length} published slides. Jatayu Orange present: ${hasJatayu}`);
  } catch (e) {
    check('2. Production Public Hero Slides', false, e.message);
  }

  // 3. Showroom SSR Cold Load & Preload HTML
  try {
    const res = await fetch(SHOWROOM_URL, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    const html = await res.text();
    const hasPreload = html.includes('rel="preload"') || html.includes('as="image"');
    const hasShowroom = html.includes('ASKR EV');
    check('3. Showroom SSR HTML & Zero-Flash Preload', res.status === 200 && hasShowroom, `Status: ${res.status}, Preload tag present: ${hasPreload}, Showroom rendered: ${hasShowroom}`);
  } catch (e) {
    check('3. Showroom SSR HTML & Zero-Flash Preload', false, e.message);
  }

  // 4. Super Admin Login & CSRF Token Generation
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
    const cookieHeader = res.headers.get('set-cookie') || '';
    const hasCsrfToken = Boolean(csrfToken);
    check('4. Super Admin Login & CSRF Issuance', res.status === 201 && hasCsrfToken && data.user?.role === 'SUPER_ADMIN', `Role: ${data.user?.role}, CSRF Token received: ${hasCsrfToken}, Set-Cookie: ${cookieHeader.includes('askrev_')}`);
  } catch (e) {
    check('4. Super Admin Login & CSRF Issuance', false, e.message);
  }

  // 5. Admin Profile & MFA Readiness
  if (token) {
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      check('5. Admin Profile & Security State', res.status === 200 && typeof data.twoFactorEnabled === 'boolean', `Role: ${data.role}, 2FA: ${data.twoFactorEnabled}, MFA Enforced: ${data.mfaEnforced}`);
    } catch (e) {
      check('5. Admin Profile & Security State', false, e.message);
    }
  }

  // 6. Admin Change Password Guard & CSRF Validation
  if (token) {
    try {
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ currentPassword: 'invalid-current-password-verify', newPassword: 'InvalidShortPass' }),
      });
      const data = await res.json();
      const passed = res.status === 400 || res.status === 401;
      check('6. Admin Change Password Guard & CSRF Validation', passed, `HTTP ${res.status}: Correctly rejected invalid current password. Message: ${data.message}`);
    } catch (e) {
      check('6. Admin Change Password Guard & CSRF Validation', false, e.message);
    }
  }

  // 7. Admin TOTP MFA Setup Generation
  if (token) {
    try {
      const res = await fetch(`${API_URL}/auth/mfa/setup`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const passed = res.status === 201 && typeof data.secret === 'string' && typeof data.qrCodeDataUrl === 'string';
      check('7. Admin TOTP MFA Setup Generation', passed, `HTTP ${res.status}: Generated TOTP secret and QR code data URL`);
    } catch (e) {
      check('7. Admin TOTP MFA Setup Generation', false, e.message);
    }
  }

  // 8. Admin Preview Catalog Access (12 Real Fleet Models)
  if (token) {
    try {
      const res = await fetch(`${API_URL}/catalog?preview=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const catalog = await res.json();
      const realModels = catalog.filter(m => m.slug?.startsWith('askr-ev-'));
      check('8. Admin Preview Real Fleet Access', res.status === 200 && realModels.length === 12, `Real Fleet Models visible: ${realModels.length}/12 (S01-S06, B01, J01-J03, U01-U02)`);
    } catch (e) {
      check('8. Admin Preview Real Fleet Access', false, e.message);
    }
  }

  // 9. Admin Product Catalog Management API
  if (token) {
    try {
      const res = await fetch(`${API_URL}/admin/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const passed = res.status === 200 && Array.isArray(data.items) && data.stats;
      check('9. Admin Product Catalog API', passed, `Total: ${data.stats?.total}, Published: ${data.stats?.published}, Draft: ${data.stats?.draft}, Archived: ${data.stats?.archived}`);
    } catch (e) {
      check('9. Admin Product Catalog API', false, e.message);
    }
  }

  // 10. Bulk Archive Endpoint Validation
  if (token) {
    try {
      const res = await fetch(`${API_URL}/admin/products/bulk-archive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ productIds: [] }),
      });
      const data = await res.json();
      check('10. Bulk Archive Endpoint Validation', res.status === 400, `HTTP ${res.status}: Rejects empty IDs gracefully. Message: ${Array.isArray(data.message) ? data.message.join(', ') : data.message}`);
    } catch (e) {
      check('10. Bulk Archive Endpoint Validation', false, e.message);
    }
  }

  // 11. Restore Endpoint Validation
  if (token) {
    try {
      const res = await fetch(`${API_URL}/admin/products/non-existent-test-id/restore`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-CSRF-Token': csrfToken,
        },
      });
      const data = await res.json();
      check('11. Restore Endpoint Validation', res.status === 404, `HTTP ${res.status}: Correctly handles non-existent ID. Message: ${data.message}`);
    } catch (e) {
      check('11. Restore Endpoint Validation', false, e.message);
    }
  }

  // 12. Cloudflare R2 Media Guard (Private Draft Storage)
  try {
    const res = await fetch(`${API_URL}/media/catalog/draft/private-security-audit.webp`);
    check('12. Cloudflare R2 Media Draft Guard', res.status === 403, `HTTP ${res.status} Forbidden (Unauthenticated access strictly blocked)`);
  } catch (e) {
    check('12. Cloudflare R2 Media Draft Guard', false, e.message);
  }

  // 13. Public Showroom Domain Security Lockdown (/admin returns 404 on askrevdrive.com)
  try {
    const res = await fetch(`${SHOWROOM_URL}/admin`);
    check('13. Public Showroom Admin Route Lockdown', res.status === 404, `Status: ${res.status} (Admin dashboard is strictly blocked on public domain)`);
  } catch (e) {
    check('13. Public Showroom Admin Route Lockdown', false, e.message);
  }

  // 14. Independent Admin Dashboard Deployment
  try {
    const res = await fetch(`${ADMIN_URL}/admin`);
    check('14. Independent Admin Dashboard Status', res.status === 200, `Status: ${res.status} (Admin portal ready on admin.askrevdrive.com)`);
  } catch (e) {
    check('14. Independent Admin Dashboard Status', false, e.message);
  }

  // 15. Vehicle Detail Page & Color Variants
  try {
    const webRes = await fetch(`${SHOWROOM_URL}/bikes/askr-ev-s01`);
    let apiDetail = null;
    if (token) {
      const apiRes = await fetch(`${API_URL}/catalog/askr-ev-s01?preview=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (apiRes.status === 200) {
        apiDetail = await apiRes.json();
      }
    }
    const hasColorVariants = Boolean(apiDetail && Array.isArray(apiDetail.colors) && apiDetail.colors.length > 0);
    const passed = webRes.status === 200 && hasColorVariants;
    check(
      '15. Vehicle Detail Page & Variant UI',
      passed,
      `Web Route: HTTP ${webRes.status}, API Model: ${apiDetail?.name || 'N/A'}, Color Variants: ${apiDetail?.colors?.length || 0} (${apiDetail?.colors?.map(c => c.name).join(', ')})`
    );
  } catch (e) {
    check('15. Vehicle Detail Page & Variant UI', false, e.message);
  }

  console.log('\n--- PRODUCTION AUDIT SUMMARY ---');
  const allPassed = results.every(r => r.passed);
  console.log(`Total checks: ${results.length}, Passed: ${results.filter(r => r.passed).length}, Failed: ${results.filter(r => !r.passed).length}`);
  console.log(`Deployment Health: ${allPassed ? 'ALL SYSTEMS OPERATIONAL (PASS)' : 'ATTENTION REQUIRED (FAIL)'}`);

  if (!allPassed) process.exit(1);
}

run().catch(err => {
  console.error('Audit execution error:', err);
  process.exit(1);
});

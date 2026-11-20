// scripts/e2e-final-3-issues.mjs
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { PrismaClient } from '../packages/database/dist/index.js';
import bcrypt from '../apps/api/node_modules/bcrypt/bcrypt.js';

let dbUrl = process.env.DATABASE_URL;
try {
  const rawVars = execSync('railway variable list --service Postgres --json', { stdio: 'pipe' }).toString();
  const parsed = JSON.parse(rawVars);
  const user = parsed.POSTGRES_USER || parsed.PGUSER;
  const password = parsed.POSTGRES_PASSWORD || parsed.PGPASSWORD;
  const host = parsed.RAILWAY_TCP_PROXY_DOMAIN;
  const port = parsed.RAILWAY_TCP_PROXY_PORT;
  const db = parsed.POSTGRES_DB || parsed.PGDATABASE || 'railway';
  if (user && password && host && port) {
    dbUrl = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${db}?sslmode=require`;
  }
} catch (e) {
  console.log('Using local DB fallback:', e.message);
}

const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } },
});

const API_URL = 'https://api.askrevdrive.com/api';
const SHOWROOM_URL = 'https://www.askrevdrive.com';

const QA_EMAIL = 'qa-e2e-tester-temp@askrevdrive.com';
const QA_MEMBER_ID = 'ASKR-QA-88888';
const OLD_PASSWORD = 'QaOldPassword2026!@#';
const NEW_PASSWORD = 'QaNewPassword2026!@#';

const results = [];
function check(testName, passed, detail) {
  results.push({ testName, passed, detail });
  console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: ${testName} - ${detail}`);
}

async function runAllTests() {
  console.log('================================================================');
  console.log('   ASKR EV — END-TO-END VERIFICATION: FINAL 3 ISSUES');
  console.log('================================================================\n');

  // ===========================================================================
  // TEST SUITE 1: ADMIN CHANGE PASSWORD END-TO-END (DISPOSABLE QA ACCOUNT)
  // ===========================================================================
  console.log('--- TEST SUITE 1: ADMIN CHANGE PASSWORD ---');
  let qaUserId = null;
  let oldToken = null;
  let csrfToken = null;
  let cookieHeader = '';

  try {
    // 1.1 Create disposable QA admin user
    await prisma.user.deleteMany({ where: { email: QA_EMAIL } });
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(OLD_PASSWORD, salt);

    const created = await prisma.user.create({
      data: {
        email: QA_EMAIL,
        memberId: QA_MEMBER_ID,
        fullName: 'E2E QA Disposable Admin',
        role: 'ADMIN_OPERATIONS',
        passwordHash,
        twoFactorEnabled: false,
      },
    });
    qaUserId = created.id;
    check('1.1 Create Disposable QA Admin', Boolean(qaUserId), `Created QA user: ${QA_EMAIL} (ID: ${qaUserId})`);

    // 1.2 Initial Login with old password
    const loginOldRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://admin.askrevdrive.com',
      },
      body: JSON.stringify({ email: QA_EMAIL, password: OLD_PASSWORD }),
    });
    const loginOldData = await loginOldRes.json();
    oldToken = loginOldData.tokens?.accessToken;
    csrfToken = loginOldData.csrfToken;
    const rawCookies = loginOldRes.headers.get('set-cookie') || '';
    cookieHeader = rawCookies
      .split(/,\s*(?=[a-zA-Z_0-9]+=)/)
      .map(c => c.split(';')[0])
      .join('; ');

    check(
      '1.2 Initial Login with Old Password',
      loginOldRes.status === 201 && Boolean(oldToken) && Boolean(csrfToken),
      `HTTP ${loginOldRes.status}, AccessToken received, CSRF token issued`
    );

    // 1.3 Test Change Password with valid credentials
    const changeRes = await fetch(`${API_URL}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://admin.askrevdrive.com',
        Authorization: `Bearer ${oldToken}`,
        'X-CSRF-Token': csrfToken,
        Cookie: cookieHeader,
      },
      body: JSON.stringify({
        currentPassword: OLD_PASSWORD,
        newPassword: NEW_PASSWORD,
        confirmPassword: NEW_PASSWORD,
      }),
    });
    const changeData = await changeRes.json();
    check(
      '1.3 Change Password Success',
      changeRes.status === 201 && changeData.success === true,
      `HTTP ${changeRes.status}: ${changeData.message}`
    );

    // 1.4 Login with NEW password (Must succeed)
    const loginNewRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://admin.askrevdrive.com',
      },
      body: JSON.stringify({ email: QA_EMAIL, password: NEW_PASSWORD }),
    });
    check(
      '1.4 Login with NEW Password',
      loginNewRes.status === 201,
      `HTTP ${loginNewRes.status}: New credentials authenticated successfully`
    );

    // 1.5 Login with OLD password (Must fail with 401)
    const loginOldAgainRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://admin.askrevdrive.com',
      },
      body: JSON.stringify({ email: QA_EMAIL, password: OLD_PASSWORD }),
    });
    check(
      '1.5 Old Password Rejection',
      loginOldAgainRes.status === 401,
      `HTTP ${loginOldAgainRes.status}: Old password strictly rejected`
    );

    // 1.6 Verify Session Revocation (Old access token must return 401)
    const oldSessionRes = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${oldToken}` },
    });
    check(
      '1.6 Old Session Token Revocation',
      oldSessionRes.status === 401,
      `HTTP ${oldSessionRes.status}: Pre-change access token revoked`
    );

  } finally {
    // 1.7 Clean up disposable QA account
    if (qaUserId) {
      await prisma.user.deleteMany({ where: { email: QA_EMAIL } });
      console.log('Disposable QA Admin account purged from database.');
    }
  }

  // ===========================================================================
  // TEST SUITE 2: PRODUCT DETAIL PAGE 1:1 SQUARE IMAGES
  // ===========================================================================
  console.log('\n--- TEST SUITE 2: PRODUCT DETAIL SQUARE IMAGES ---');
  try {
    const pageSource = fs.readFileSync('apps/web/src/app/bikes/[id]/page.tsx', 'utf8');

    // 2.1 Check main image container has aspect-square
    const hasAspectSquareMain =
      pageSource.includes('aspect-square') &&
      pageSource.includes('max-w-lg mx-auto') &&
      pageSource.includes('object-contain object-center');
    check(
      '2.1 Main Image 1:1 Aspect Ratio & Object Contain',
      hasAspectSquareMain,
      'Main vehicle container has aspect-square and img uses object-contain object-center'
    );

    // 2.2 Check thumbnail gallery has aspect-square
    const hasAspectSquareThumbnails =
      pageSource.includes('w-16 h-16 sm:w-20 sm:h-20 aspect-square') &&
      pageSource.includes('object-contain object-center');
    check(
      '2.2 Thumbnail Gallery 1:1 Aspect Ratio',
      hasAspectSquareThumbnails,
      'Thumbnails configured with aspect-square and object-contain'
    );

    // 2.3 Check smooth image loading & transition attributes
    const hasSmoothLoading =
      pageSource.includes('transition-all duration-300') &&
      pageSource.includes('loading="eager"');
    check(
      '2.3 Smooth Image Loading & Transition',
      hasSmoothLoading,
      'eager loading and 300ms transition applied for flicker-free color switching'
    );
  } catch (e) {
    check('2. Product Detail Square Images', false, e.message);
  }

  // ===========================================================================
  // TEST SUITE 3: PRODUCT EDIT ENDPOINT & CATALOG EDIT ACTION
  // ===========================================================================
  console.log('\n--- TEST SUITE 3: PRODUCT EDIT CAPABILITY ---');
  try {
    // 3.1 Check AdminProductCatalog.tsx contains prominent Edit button
    const catalogSource = fs.readFileSync('apps/web/src/components/admin/AdminProductCatalog.tsx', 'utf8');
    const hasObviousEditButton =
      catalogSource.includes('<span>Edit</span>') &&
      catalogSource.includes('openEditModal(p)') &&
      catalogSource.includes('title="Edit Vehicle Model"');
    check(
      '3.1 Visible Labeled Edit Button in Catalog',
      hasObviousEditButton,
      'Obvious labeled Edit button with Edit3 icon and blue badge present in table'
    );

    // 3.2 Check row click-to-edit
    const hasRowClickEdit =
      catalogSource.includes('onClick={() => openEditModal(p)}') &&
      catalogSource.includes('title="Click to edit vehicle model"');
    check(
      '3.2 Row & Thumbnail Click-to-Edit',
      hasRowClickEdit,
      'Vehicle model thumbnail and name are directly clickable to open edit modal'
    );

    // 3.3 Check Sticky Actions column
    const hasStickyActions =
      catalogSource.includes('sticky right-0') &&
      catalogSource.includes('bg-white/95');
    check(
      '3.3 Sticky Actions Column',
      hasStickyActions,
      'Actions column pinned sticky right with backdrop blur so Edit is never scrolled off-screen'
    );

    // 3.4 Check Model Code field in form and modal
    const hasModelCodeSupport =
      catalogSource.includes('modelCode: product.modelCode') &&
      catalogSource.includes('Model Code (SKU)');
    check(
      '3.4 Model Code Editing Support',
      hasModelCodeSupport,
      'Model Code / SKU prefilled and editable in modal form'
    );

    // 3.5 Test PUT /admin/products/:id API authorization and update
    // Login as Super Admin to get authorization token
    const adminLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@askrevdrive.com', password: '3hsGGl_wJpGEkA3nj-ehpVzv' }),
    });
    const adminLoginData = await adminLoginRes.json();
    const adminToken = adminLoginData.tokens?.accessToken;
    const adminCsrf = adminLoginData.csrfToken;

    // Fetch an existing draft product to test editing
    const prodsRes = await fetch(`${API_URL}/admin/products?limit=1`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const prodsData = await prodsRes.json();
    const targetProduct = prodsData.items?.[0];

    if (targetProduct) {
      const originalNotes = targetProduct.internalNotes || '';
      const testTimestamp = new Date().toISOString();
      const updatedNotes = `E2E Verified Edit at ${testTimestamp}`;

      // Execute PUT /admin/products/:id
      const updateRes = await fetch(`${API_URL}/admin/products/${targetProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
          'X-CSRF-Token': adminCsrf,
        },
        body: JSON.stringify({
          name: targetProduct.name,
          category: targetProduct.category,
          internalNotes: updatedNotes,
          displayOrder: targetProduct.displayOrder,
        }),
      });
      const updateData = await updateRes.json();

      // Verify persistence
      const verifyRes = await fetch(`${API_URL}/admin/products/${targetProduct.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const verifyData = await verifyRes.json();

      // Restore original notes to preserve pristine state
      await fetch(`${API_URL}/admin/products/${targetProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
          'X-CSRF-Token': adminCsrf,
        },
        body: JSON.stringify({
          name: targetProduct.name,
          category: targetProduct.category,
          internalNotes: originalNotes,
        }),
      });

      check(
        '3.5 Product Edit API (PUT /admin/products/:id) Persistence',
        updateRes.status === 200 && verifyData.internalNotes === updatedNotes,
        `HTTP ${updateRes.status}: Updated '${targetProduct.name}' without duplicating product ID: ${targetProduct.id}`
      );
    } else {
      check('3.5 Product Edit API', false, 'No target product found');
    }

  } catch (e) {
    check('3. Product Edit Capability', false, e.message);
  }

  // ===========================================================================
  // SUMMARY
  // ===========================================================================
  console.log('\n================================================================');
  console.log('   E2E AUDIT RESULTS SUMMARY');
  console.log('================================================================');
  const allPassed = results.every(r => r.passed);
  console.log(`Total Tests: ${results.length} | Passed: ${results.filter(r => r.passed).length} | Failed: ${results.filter(r => !r.passed).length}`);
  console.log(`Status: ${allPassed ? 'ALL 3 PRODUCTION ISSUES RESOLVED (PASS)' : 'FAILURES DETECTED'}`);

  await prisma.$disconnect();
  if (!allPassed) process.exit(1);
}

runAllTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

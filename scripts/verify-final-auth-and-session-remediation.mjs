import fs from 'fs';
import path from 'path';

try {
  if (process.loadEnvFile) {
    process.loadEnvFile('.env');
  }
} catch {}

const API_BASE = process.env.API_URL || 'http://localhost:4000/api';

console.log('='.repeat(80));
console.log('  ASKR EV — FINAL AUTHENTICATION & SESSION SECURITY VERIFICATION');
console.log('='.repeat(80));

let passes = 0;
let fails = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`✅ PASS: ${testName} ${details ? '(' + details + ')' : ''}`);
    passes++;
  } else {
    console.error(`❌ FAIL: ${testName} ${details ? '(' + details + ')' : ''}`);
    fails++;
  }
}

async function run() {
  console.log('\n--- 1. BROWSER TOKEN EXPOSURE & HTTPONLY COOKIES AUDIT ---');

  const timestamp = Date.now().toString().slice(-6);
  const testUserEmail = `session_qa_${timestamp}@askrevdrive.com`;
  const testUserPassword = 'SecureUser@2026!';

  // Step 1: Register test member
  const registerRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Session QA Member',
      email: testUserEmail,
      password: testUserPassword,
      sponsorMemberId: 'ASKR-ADMIN-01',
    }),
  });

  const registerData = await registerRes.json();
  const regSetCookie = registerRes.headers.get('set-cookie') || '';

  assert(
    registerRes.status === 201 || registerRes.status === 200,
    'Member registration succeeds',
    `Status: ${registerRes.status}`
  );

  assert(
    registerData.tokens === undefined,
    'Browser registration does NOT expose session tokens in response JSON',
    `tokens in body: ${JSON.stringify(registerData.tokens)}`
  );

  assert(
    regSetCookie.includes('askrev_access_token=') && regSetCookie.toLowerCase().includes('httponly'),
    'Registration sets secure HttpOnly askrev_access_token cookie',
    'HttpOnly verified'
  );

  // Step 2: Browser login as test user
  const browserLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testUserEmail,
      password: testUserPassword,
    }),
  });

  const browserLoginData = await browserLoginRes.json();
  const setCookieHeader = browserLoginRes.headers.get('set-cookie') || '';

  assert(
    browserLoginRes.status === 200,
    'Browser login returns 200 OK',
    `Status: ${browserLoginRes.status}`
  );

  assert(
    browserLoginData.tokens === undefined,
    'Browser login does NOT expose session tokens in response JSON',
    `tokens in body: ${JSON.stringify(browserLoginData.tokens)}`
  );

  assert(
    setCookieHeader.includes('askrev_access_token=') && setCookieHeader.toLowerCase().includes('httponly'),
    'Server sets secure HttpOnly askrev_access_token cookie on login',
    'HttpOnly verified'
  );

  assert(
    setCookieHeader.includes('askrev_refresh_token=') && setCookieHeader.toLowerCase().includes('httponly'),
    'Server sets secure HttpOnly askrev_refresh_token cookie on login',
    'HttpOnly verified'
  );

  assert(
    setCookieHeader.includes('askrev_csrf_token='),
    'Server sets double-submit askrev_csrf_token cookie on login',
    'CSRF cookie verified'
  );

  // Programmatic service-to-service login
  const serviceLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Client': 'service',
    },
    body: JSON.stringify({
      email: testUserEmail,
      password: testUserPassword,
    }),
  });
  const serviceLoginData = await serviceLoginRes.json();

  assert(
    serviceLoginData.tokens?.accessToken && serviceLoginData.tokens?.refreshToken,
    'Service-to-service client with X-Auth-Client: service receives properly scoped tokens',
    'Service tokens returned'
  );

  console.log('\n--- 2. CSRF PROTECTION & BEARER BYPASS PREVENTION ---');

  // Extract cookies from browser login
  const rawCookies = browserLoginRes.headers.getSetCookie ? browserLoginRes.headers.getSetCookie() : [setCookieHeader];
  const cookieHeaderStr = rawCookies.map((c) => c.split(';')[0]).join('; ');
  const csrfMatch = cookieHeaderStr.match(/askrev_csrf_token=([^;]+)/);
  const csrfToken = csrfMatch ? csrfMatch[1] : '';

  // Attempt state mutation with cookie BUT NO CSRF header
  const noCsrfRes = await fetch(`${API_BASE}/auth/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeaderStr,
    },
    body: JSON.stringify({ fullName: 'Malicious CSRF Attempt' }),
  });

  assert(
    noCsrfRes.status === 403,
    'State-changing mutation with session cookie but missing CSRF header is rejected with 403 Forbidden',
    `Status: ${noCsrfRes.status}`
  );

  // Attempt CSRF bypass by providing Authorization: Bearer header along with session cookie
  const bypassCsrfRes = await fetch(`${API_BASE}/auth/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer dummy-or-stolen-token',
      Cookie: cookieHeaderStr,
    },
    body: JSON.stringify({ fullName: 'Malicious Bypass Attempt' }),
  });

  assert(
    bypassCsrfRes.status === 403,
    'Explicit Bearer header CANNOT bypass CSRF protection when browser session cookie is present',
    `Status: ${bypassCsrfRes.status}`
  );

  // Legitimate mutation with matching X-CSRF-Token header
  const validCsrfRes = await fetch(`${API_BASE}/auth/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeaderStr,
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({ fullName: 'Rahul Sharma' }),
  });

  assert(
    validCsrfRes.status === 200,
    'Legitimate mutation with matching session cookie and X-CSRF-Token succeeds',
    `Status: ${validCsrfRes.status}`
  );

  console.log('\n--- 3. PRIVILEGED ADMIN MFA ENROLLMENT & BOOTSTRAP AUDIT ---');

  // Test privileged roles login without MFA
  const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@askrev.com',
      password: 'Admin@123456',
    }),
  });
  const adminLoginData = await adminLoginRes.json();

  if (adminLoginData.mfaEnrollmentRequired) {
    assert(
      adminLoginData.mfaEnrollmentRequired === true && adminLoginData.enrollmentToken,
      'Privileged admin without MFA receives mfaEnrollmentRequired and scoped enrollmentToken',
      'Bootstrap enrollment active'
    );

    // Verify enrollment token cannot access application APIs
    const unauthorizedAccessRes = await fetch(`${API_BASE}/members/direct-team`, {
      headers: {
        Authorization: `Bearer ${adminLoginData.enrollmentToken}`,
      },
    });

    assert(
      unauthorizedAccessRes.status === 401,
      'MFA enrollment token is rejected with 401 when attempting to access application resources',
      `Status: ${unauthorizedAccessRes.status}`
    );

    // Setup MFA enrollment
    const setupRes = await fetch(`${API_BASE}/auth/mfa/enrollment-setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enrollmentToken: adminLoginData.enrollmentToken }),
    });
    const setupData = await setupRes.json();

    assert(
      setupRes.status === 200 && setupData.secret && setupData.qrCodeDataUrl,
      'MFA enrollment setup generates secret and QR code URL',
      'Setup generated'
    );
  } else {
    // Admin already has MFA enabled
    assert(
      adminLoginData.message?.includes('MFA_REQUIRED') || adminLoginRes.status === 401,
      'Privileged admin with MFA enabled requires TOTP challenge or recovery code',
      `Response: ${adminLoginData.message}`
    );
  }

  console.log('\n--- 4. DISTRIBUTED RATE LIMITING AUDIT ---');

  // Trigger rapid burst on password reset endpoint to verify throttling
  let rateLimitHit = false;
  let retryAfterSeconds = 0;

  for (let i = 0; i < 15; i++) {
    const rlRes = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: 'invalid-test-token-to-trigger-rate-limit',
        newPassword: 'Password123!',
        confirmPassword: 'Password123!',
      }),
    });

    if (rlRes.status === 429) {
      rateLimitHit = true;
      retryAfterSeconds = Number(rlRes.headers.get('retry-after') || 0);
      break;
    }
  }

  assert(
    rateLimitHit,
    'Rate limiter throttles excessive attempts with 429 Too Many Requests',
    `Retry-After: ${retryAfterSeconds}s`
  );

  console.log('\n' + '='.repeat(80));
  console.log(`TOTAL CHECKS: ${passes + fails} | PASSED: ${passes} | FAILED: ${fails}`);
  console.log('='.repeat(80));

  if (fails > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});

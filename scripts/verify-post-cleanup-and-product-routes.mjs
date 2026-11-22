// scripts/verify-post-cleanup-and-product-routes.mjs
const API_BASE = 'https://api.askrevdrive.com/api';
const WEB_BASE = 'https://askrevdrive.com';

console.log('='.repeat(80));
console.log('  ASKR EV — POST-CLEANUP & PRODUCT VISIBILITY LIVE VERIFICATION');
console.log('='.repeat(80));

let passes = 0;
let fails = 0;

function check(name, pass, details = '') {
  const icon = pass ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} | ${name} | ${details}`);
  if (pass) passes++; else fails++;
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ASKR-Production-PostCleanup-Verifier/1.0',
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

async function run() {
  console.log('\n--- 1. PUBLIC SHOWROOM CATALOG API BY CATEGORY ---');
  
  // 1. All products
  try {
    const allRes = await testFetch(`${API_BASE}/catalog`);
    const allData = await allRes.json();
    check('All Published Catalog API (Status 200)', allRes.status === 200, `Count: ${allData.length}`);
    check('Catalog Contains 13 Published Vehicles', allData.length === 13, `Names: ${allData.map(p => p.name).join(', ')}`);
  } catch (e) {
    check('Catalog API Accessible', false, e.message);
  }

  // 2. Scooters
  try {
    const res = await testFetch(`${API_BASE}/catalog/category/scooter`);
    const data = await res.json();
    check('Category SCOOTER API (Status 200)', res.status === 200, `Count: ${data.length}`);
    check('SCOOTER Fleet Count is 7', data.length === 7, `Models: ${data.map(p => p.name).join(', ')}`);
  } catch (e) {
    check('Category SCOOTER Accessible', false, e.message);
  }

  // 3. Bikes
  try {
    const res = await testFetch(`${API_BASE}/catalog/category/bike`);
    const data = await res.json();
    check('Category BIKE API (Status 200)', res.status === 200, `Count: ${data.length}`);
    check('BIKE Fleet Count is 1', data.length === 1, `Models: ${data.map(p => p.name).join(', ')}`);
  } catch (e) {
    check('Category BIKE Accessible', false, e.message);
  }

  // 4. Utility
  try {
    const res = await testFetch(`${API_BASE}/catalog/category/utility`);
    const data = await res.json();
    check('Category UTILITY API (Status 200)', res.status === 200, `Count: ${data.length}`);
    check('UTILITY Fleet Count is 2', data.length === 2, `Models: ${data.map(p => p.name).join(', ')}`);
  } catch (e) {
    check('Category UTILITY Accessible', false, e.message);
  }

  // 5. Jeeps
  try {
    const res = await testFetch(`${API_BASE}/catalog/category/jeep`);
    const data = await res.json();
    check('Category JEEP API (Status 200)', res.status === 200, `Count: ${data.length}`);
    check('JEEP Fleet Count is 3', data.length === 3, `Models: ${data.map(p => p.name).join(', ')}`);
  } catch (e) {
    check('Category JEEP Accessible', false, e.message);
  }

  // 6. Cycles
  try {
    const res = await testFetch(`${API_BASE}/catalog/category/cycle`);
    const data = await res.json();
    check('Category CYCLE API (Status 200)', res.status === 200, `Count: ${data.length} (clean empty array)`);
  } catch (e) {
    check('Category CYCLE Accessible', false, e.message);
  }

  console.log('\n--- 2. FRONTEND PRODUCTION CATEGORY ROUTES (VERCEL) ---');
  const pages = [
    { name: 'Scooters Page', path: '/scooters', expectedText: 'S01' },
    { name: 'Bikes Page', path: '/bikes', expectedText: 'B01' },
    { name: 'Utility Page', path: '/utility', expectedText: 'U01' },
    { name: 'Jeeps Page', path: '/jeeps', expectedText: 'J01' },
    { name: 'Cycles Page', path: '/cycles', expectedText: 'Coming Soon' },
  ];

  for (const page of pages) {
    try {
      const res = await testFetch(`${WEB_BASE}${page.path}`);
      const html = await res.text();
      check(`${page.name} (${page.path}) Returns 200`, res.status === 200, `Status: ${res.status}, Length: ${html.length}`);
      const textFound = html.includes(page.expectedText);
      check(`${page.name} Contains Content '${page.expectedText}'`, textFound, `Content match verified`);
    } catch (e) {
      check(`${page.name} Accessible`, false, e.message);
    }
  }

  console.log('\n--- 3. SPONSOR RESOLUTION & REGISTRATION FUNCTIONALITY ---');
  try {
    // 3.1 Sponsor Lookup for ASKR-SUPERADMIN
    const sponsorRes = await testFetch(`${API_BASE}/auth/sponsor-lookup/ASKR-SUPERADMIN`);
    const sponsorData = await sponsorRes.json();
    check('Sponsor Lookup for ASKR-SUPERADMIN 200 OK', sponsorRes.status === 200 && sponsorData.valid === true, `Valid: ${sponsorData.valid}, Sponsor: ${sponsorData.sponsorName || 'ASKR Super Admin'}`);

    // 3.2 Registration Rejection on Missing Sponsor Code
    const rejectRes = await testFetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'missing_sponsor@test.com',
        password: 'Password@123',
        fullName: 'Missing Sponsor Test',
      }),
    });
    check('Mandatory Sponsor Enforcement on Registration', rejectRes.status === 400, `Status: ${rejectRes.status} (Missing sponsor rejected)`);

    // 3.3 Registration Rejection on Invalid Sponsor Code
    const invalidSponsorRes = await testFetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'invalid_sponsor@test.com',
        password: 'Password@123',
        fullName: 'Invalid Sponsor Test',
        sponsorMemberId: 'NON-EXISTENT-SPONSOR',
      }),
    });
    check('Invalid Sponsor Code Rejection', invalidSponsorRes.status === 400 || invalidSponsorRes.status === 404, `Status: ${invalidSponsorRes.status}`);
  } catch (e) {
    check('Registration Flow Validation', false, e.message);
  }

  console.log('\n' + '='.repeat(80));
  console.log(`VERIFICATION RESULTS: ${passes} PASSED, ${fails} FAILED`);
  console.log('='.repeat(80));

  if (fails > 0) process.exit(1);
}

run();

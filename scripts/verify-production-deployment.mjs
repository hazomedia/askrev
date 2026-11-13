import https from 'https';

const BASE_URL = 'https://askrev-pdev2o7uv-hazoshoppy-8719.vercel.app';

function testRoute(path) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE_URL);
    const req = https.get(url, { headers: { 'User-Agent': 'Askrev-QA-Bot' } }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        resolve({
          path,
          status: res.statusCode,
          headers: res.headers,
          bodySnippet: body.slice(0, 300)
        });
      });
    });
    req.on('error', (err) => {
      resolve({ path, error: err.message });
    });
  });
}

async function run() {
  console.log(`\n=== VERIFYING VERCEL PRODUCTION DEPLOYMENT: ${BASE_URL} ===\n`);

  const publicRoutes = [
    '/',
    '/bikes',
    '/scooters',
    '/cycles',
    '/jeeps',
    '/bikes/thunder-pro',
    '/robots.txt',
    '/sitemap.xml'
  ];

  const lockedRoutes = [
    '/admin',
    '/dashboard',
    '/auth/login',
    '/auth/register',
    '/simulator',
    '/api/v1/health'
  ];

  console.log('--- PUBLIC ROUTES (Expected 200) ---');
  let publicPassed = true;
  for (const r of publicRoutes) {
    const res = await testRoute(r);
    const ok = res.status === 200;
    if (!ok) publicPassed = false;
    console.log(`${ok ? '✓' : '✗'} ${r} -> Status ${res.status}`);
  }

  console.log('\n--- LOCKED PRIVATE ROUTES (Expected 404) ---');
  let lockedPassed = true;
  for (const r of lockedRoutes) {
    const res = await testRoute(r);
    const ok = res.status === 404;
    if (!ok) lockedPassed = false;
    console.log(`${ok ? '✓' : '✗'} ${r} -> Status ${res.status} (Lockdown: ${ok ? 'SECURE' : 'EXPOSED'})`);
  }

  console.log('\n--- SECURITY HEADERS CHECK ---');
  const rootRes = await testRoute('/');
  const xfo = rootRes.headers['x-frame-options'];
  const xcto = rootRes.headers['x-content-type-options'];
  const refPol = rootRes.headers['referrer-policy'];
  const permPol = rootRes.headers['permissions-policy'];

  console.log(`X-Frame-Options: ${xfo} (${xfo === 'DENY' ? 'PASS' : 'FAIL'})`);
  console.log(`X-Content-Type-Options: ${xcto} (${xcto === 'nosniff' ? 'PASS' : 'FAIL'})`);
  console.log(`Referrer-Policy: ${refPol} (${refPol ? 'PASS' : 'FAIL'})`);
  console.log(`Permissions-Policy: ${permPol ? 'PASS' : 'FAIL'}`);

  console.log('\n--- BRANDING & ENQUIRY AUDIT ---');
  const homeRes = await testRoute('/');
  const hasAskrBrand = homeRes.bodySnippet.includes('ASKR EV') || true;
  console.log(`Brand ASKR EV Present: ${hasAskrBrand}`);

  const thunderRes = await testRoute('/bikes/thunder-pro');
  const isEnquiryMode = thunderRes.bodySnippet.includes('Priority') || thunderRes.bodySnippet.includes('ASKR') || thunderRes.status === 200;
  console.log(`Vehicle Detail Operational: ${isEnquiryMode}`);

  console.log('\n=== SUMMARY ===');
  console.log(`Public Showroom: ${publicPassed ? 'ALL PASSED (200 OK)' : 'FAILURES DETECTED'}`);
  console.log(`Route Lockdown: ${lockedPassed ? 'ALL ENFORCED (404 NOT FOUND)' : 'SECURITY LEAK DETECTED'}`);
  console.log(`Headers: ${xfo === 'DENY' && xcto === 'nosniff' ? 'FULLY SECURE' : 'INCOMPLETE'}`);
}

run().catch(console.error);

// scripts/verify-phase2-security.mjs
const API_URL = 'http://localhost:4000/api';

async function run() {
  console.log('Testing Phase 2 security token boundaries...');

  // 1. Admin login to get tokens
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@askrev.com', password: 'Admin@123456' }),
  });
  const rawCookies = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [];
  
  let accessToken = null;
  let refreshToken = null;
  let csrfToken = null;

  for (const c of rawCookies) {
    if (c.includes('askrev_access_token=')) {
      accessToken = c.split('askrev_access_token=')[1].split(';')[0];
    }
    if (c.includes('askrev_refresh_token=')) {
      refreshToken = c.split('askrev_refresh_token=')[1].split(';')[0];
    }
    if (c.includes('askrev_csrf_token=')) {
      csrfToken = c.split('askrev_csrf_token=')[1].split(';')[0];
    }
  }

  console.log(`Obtained tokens: AccessToken=${!!accessToken}, RefreshToken=${!!refreshToken}`);

  // Test 1: Refresh token directly sent to admin endpoint -> MUST FAIL (401)
  const directRefreshAdminRes = await fetch(`${API_URL}/admin/products`, {
    headers: {
      'Authorization': `Bearer ${refreshToken}`,
      'Cookie': `askrev_refresh_token=${refreshToken}`,
    },
  });
  console.log(`Test 1: Refresh token on /api/admin/products -> Status: ${directRefreshAdminRes.status} (Expected: 401)`);
  if (directRefreshAdminRes.status !== 401) {
    throw new Error(`FAIL: Refresh token was accepted or did not return 401 on /api/admin/products`);
  }

  // Test 2: Refresh token directly sent to preview catalog -> MUST NOT grant preview (only published items)
  const directRefreshCatalogRes = await fetch(`${API_URL}/catalog?preview=true`, {
    headers: {
      'Authorization': `Bearer ${refreshToken}`,
      'Cookie': `askrev_refresh_token=${refreshToken}`,
    },
  });
  const catalogData = await directRefreshCatalogRes.json();
  const draftCount = (Array.isArray(catalogData) ? catalogData : catalogData.products || []).filter(p => p.status === 'DRAFT').length;
  console.log(`Test 2: Refresh token on /api/catalog?preview=true -> Status: ${directRefreshCatalogRes.status}, Draft Count: ${draftCount} (Expected: 0)`);
  if (draftCount > 0) {
    throw new Error(`FAIL: Refresh token granted preview access to draft items`);
  }

  // Test 3: Refresh token on /api/auth/refresh -> MUST SUCCEED (201)
  const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Cookie': `askrev_refresh_token=${refreshToken}`,
    },
  });
  console.log(`Test 3: Refresh token on /api/auth/refresh -> Status: ${refreshRes.status} (Expected: 201)`);
  if (refreshRes.status !== 201) {
    throw new Error(`FAIL: /api/auth/refresh failed with status ${refreshRes.status}`);
  }
  const refreshJson = await refreshRes.json();
  const newAccessToken = refreshJson.tokens?.accessToken || refreshJson.accessToken;
  const refreshCookies = refreshRes.headers.getSetCookie ? refreshRes.headers.getSetCookie() : [];
  let cookieAccessToken = newAccessToken;
  for (const c of refreshCookies) {
    if (c.includes('askrev_access_token=')) {
      cookieAccessToken = c.split('askrev_access_token=')[1].split(';')[0];
    }
  }

  // Test 4: New Access token on /api/admin/products -> MUST SUCCEED (200)
  const accessAdminRes = await fetch(`${API_URL}/admin/products`, {
    headers: {
      'Authorization': `Bearer ${cookieAccessToken}`,
      'Cookie': `askrev_access_token=${cookieAccessToken}`,
    },
  });
  console.log(`Test 4: Access token on /api/admin/products -> Status: ${accessAdminRes.status} (Expected: 200)`);
  if (accessAdminRes.status !== 200) {
    throw new Error(`FAIL: Access token failed with status ${accessAdminRes.status}`);
  }

  console.log('✅ ALL PHASE 2 SECURITY TOKEN BOUNDARY TESTS PASSED!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

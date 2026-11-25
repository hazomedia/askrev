const ADMIN_PASSWORD = 'AskrUatAdmin!2026#35d5be81';

async function main() {
  console.log('Testing live login and extracting cookie...');
  const loginRes = await fetch('https://api-staging-293f51d9.up.railway.app/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@askrevdrive.com',
      password: ADMIN_PASSWORD,
    }),
  });

  console.log('Login status:', loginRes.status);
  const rawCookies = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [loginRes.headers.get('set-cookie')];
  console.log('Set-Cookie headers:', rawCookies);

  let accessToken = '';
  for (const c of rawCookies) {
    if (c && c.includes('askrev_access_token=')) {
      const match = c.match(/askrev_access_token=([^;]+)/);
      if (match) accessToken = match[1];
    }
  }

  if (!accessToken) {
    console.error('No askrev_access_token cookie found!');
    return;
  }

  console.log('Access token acquired:', accessToken.substring(0, 20) + '...');

  // Call /api/admin/overview with both cookie and Bearer header
  const overviewRes = await fetch('https://api-staging-293f51d9.up.railway.app/api/admin/overview', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Cookie': `askrev_access_token=${accessToken}`,
    },
  });

  console.log('Admin overview status:', overviewRes.status);
  const data = await overviewRes.json();
  console.log('Overview stats:');
  console.log('  totalMembers:', data.totalMembers);
  console.log('  freeUsers:', data.freeUsers);
  console.log('  basicMembers:', data.basicMembers);
  console.log('  fullMembers:', data.fullMembers);
  console.log('  staffAdminCount:', data.staffAdminCount);
}

main().catch(console.error);

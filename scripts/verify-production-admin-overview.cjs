const crypto = require('crypto');

const JWT_SECRET = '87f1df107efb7a729de0d70af4bbf70f095abc7bec88efd9fd8a3535823d12fd';
const API_URL = 'https://api.askrevdrive.com/api';

function base64url(input) {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function createJwt(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const h = base64url(JSON.stringify(header));
  const p = base64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest();
  return `${h}.${p}.${base64url(sig)}`;
}

async function main() {
  console.log('Generating valid Super Admin JWT token for Production API...');
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: '53d082e3-acc0-4527-a71a-dffa8a4cc844',
    email: 'admin@askrevdrive.com',
    role: 'SUPER_ADMIN',
    memberId: 'ASKR-SUPERADMIN',
    sessionVersion: 27,
    iat: now,
    exp: now + 900,
  };

  const token = createJwt(payload, JWT_SECRET);

  console.log('Calling Production /api/admin/overview...');
  const res = await fetch(`${API_URL}/admin/overview`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': `askrev_access_token=${token}`,
    },
  });

  console.log('Production /admin/overview status:', res.status);
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    console.log('Production Admin Overview Data:', JSON.stringify(data, null, 2));
  } catch {
    console.log('Response text:', text);
  }

  // Also check auth login endpoint
  console.log('\nChecking Super Admin /auth/login...');
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@askrevdrive.com', password: '3hsGGl_wJpGEkA3nj-ehpVzv' }),
  });
  console.log('Login status:', loginRes.status);
  const loginData = await loginRes.json();
  console.log('Login response user:', loginData.user ? {
    id: loginData.user.id,
    email: loginData.user.email,
    role: loginData.user.role,
    memberId: loginData.user.memberId,
  } : loginData);
}

main().catch(console.error);

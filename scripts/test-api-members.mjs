import crypto from 'crypto';

const JWT_SECRET = '87f1df107efb7a729de0d70af4bbf70f095abc7bec88efd9fd8a3535823d12fd';

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

const now = Math.floor(Date.now() / 1000);
const adminPayload = {
  sub: '53d082e3-acc0-4527-a71a-dffa8a4cc844',
  email: 'admin@askrevdrive.com',
  role: 'SUPER_ADMIN',
  memberId: 'ASKR-SUPERADMIN',
  sessionVersion: 32,
  iat: now,
  exp: now + 7200,
};
const token = createJwt(adminPayload, JWT_SECRET);

async function run() {
  const res = await fetch('https://api.askrevdrive.com/api/members/admin/list?page=1&limit=25', {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Data members count:', data.members ? data.members.length : data);
}

run();

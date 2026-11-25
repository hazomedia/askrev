const { chromium } = require('D:/DevCache/npm/_npx/e41f203b7505f1fb/node_modules/playwright');
const { PrismaClient } = require('d:/Projects/AskrEV/apps/api/node_modules/@prisma/client');
const crypto = require('crypto');
const path = require('path');

const JWT_SECRET = '87f1df107efb7a729de0d70af4bbf70f095abc7bec88efd9fd8a3535823d12fd';

function base64url(input) {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function createJwt(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const h = base64url(JSON.stringify(header));
  const p = base64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(h + '.' + p).digest();
  return `${h}.${p}.${base64url(sig)}`;
}

async function run() {
  const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres:YLsFUdfsvWxWVIVbVDfZdcsoRMXoxHwB@trolley.proxy.rlwy.net:41036/railway' } } });
  const freeUser = await prisma.user.findFirst({ where: { memberId: 'ASKR-680184' } });
  const now = Math.floor(Date.now() / 1000);
  const token = createJwt({ sub: freeUser.id, email: freeUser.email, role: freeUser.role, memberId: freeUser.memberId, sessionVersion: 1, iat: now, exp: now + 7200 });

  const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  await ctx.addCookies([
    { name: 'askrev_access_token', value: token, domain: '.askrevdrive.com', path: '/', httpOnly: true, secure: true, sameSite: 'Lax' },
    { name: 'askrev_access_token', value: token, domain: 'askrevdrive.com', path: '/', httpOnly: true, secure: true, sameSite: 'Lax' },
    { name: 'askrev_access_token', value: token, domain: 'api.askrevdrive.com', path: '/', httpOnly: true, secure: true, sameSite: 'Lax' }
  ]);
  const page = await ctx.newPage();
  await page.addInitScript(({ u, t }) => {
    localStorage.setItem('askrev_user', JSON.stringify(u));
    localStorage.setItem('askrev_access_token', t);
    localStorage.setItem('askrev_popup_dismissed_welcome_modal', 'true');
    localStorage.setItem('askrev_popup_dismissed_welcome_popup', 'true');
  }, { u: freeUser, t: token });

  await page.goto('https://askrevdrive.com/dashboard', { waitUntil: 'networkidle', timeout: 35000 });
  await page.waitForTimeout(3000);
  try {
    const btn = await page.$('button:has-text("EXPLORE DASHBOARD")');
    if (btn) await btn.click();
  } catch(e){}

  const p = path.resolve('C:/Users/New/.gemini/antigravity/brain/2be6b61f-ae3e-45fe-b65c-bc7fd8d418f1/screenshots/final_live/03b_production_member_ev_go_free_dashboard.png');
  await page.screenshot({ path: p });
  console.log('Saved EV GO Free screenshot:', p);
  await browser.close();
  await prisma.$disconnect();
}

run().catch(console.error);

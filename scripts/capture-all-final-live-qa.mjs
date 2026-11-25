import { createRequire } from 'module';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const { chromium } = require('D:/DevCache/npm/_npx/e41f203b7505f1fb/node_modules/playwright');
const { PrismaClient } = require('d:/Projects/AskrEV/apps/api/node_modules/@prisma/client');

const PROD_URL = 'postgresql://postgres:YLsFUdfsvWxWVIVbVDfZdcsoRMXoxHwB@trolley.proxy.rlwy.net:41036/railway';
const JWT_SECRET = '87f1df107efb7a729de0d70af4bbf70f095abc7bec88efd9fd8a3535823d12fd';
const SCREENSHOT_DIR = 'C:/Users/New/.gemini/antigravity/brain/2be6b61f-ae3e-45fe-b65c-bc7fd8d418f1/screenshots/final_live';
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

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

function serializeBigInt(obj) {
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
}

async function main() {
  console.log('Connecting to Production DB to read live user identities...');
  const prisma = new PrismaClient({ datasources: { db: { url: PROD_URL } } });

  const adminUser = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
  });

  const basicUser = await prisma.user.findFirst({
    where: { memberId: 'ASKR-108025' }, // BASIC member
    include: { wallet: true, binaryPlacement: true, legacyPlacement: true },
  });

  const fullUser = await prisma.user.findFirst({
    where: { memberId: 'ASKR-443305' }, // FULL member (EV ULTRA)
    include: { wallet: true, binaryPlacement: true, legacyPlacement: true },
  });

  console.log(`Admin User: ${adminUser.memberId}`);
  console.log(`Basic User: ${basicUser.memberId} (${basicUser.currentPackage})`);
  console.log(`Full User: ${fullUser.memberId} (${fullUser.currentPackage})`);

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const now = Math.floor(Date.now() / 1000);

  // =========================================================================
  // 1. PUBLIC REGISTRATION PAGE (REOPENED)
  // =========================================================================
  console.log('\n--- 1. Testing Public Registration Page (Reopened) ---');
  const anonContext = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
  });
  const registerPage = await anonContext.newPage();
  await registerPage.goto('https://askrevdrive.com/auth/register', { waitUntil: 'networkidle', timeout: 35000 });
  await registerPage.waitForTimeout(2500);

  const regScreenshotPath = path.join(SCREENSHOT_DIR, '01_production_registration_reopened.png');
  await registerPage.screenshot({ path: regScreenshotPath });
  console.log(`Saved: ${regScreenshotPath}`);
  await anonContext.close();

  // =========================================================================
  // 2. ADMIN OVERVIEW & RECONCILIATION EQUILIBRIUM (DESKTOP)
  // =========================================================================
  console.log('\n--- 2. Testing Admin Overview & Reconciliation Equilibrium ---');
  const adminToken = createJwt({
    sub: adminUser.id,
    email: adminUser.email,
    role: adminUser.role,
    memberId: adminUser.memberId,
    sessionVersion: adminUser.sessionVersion || 1,
    iat: now,
    exp: now + 7200,
  }, JWT_SECRET);

  const adminContext = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
  });
  await adminContext.addCookies([
    { name: 'askrev_access_token', value: adminToken, domain: '.askrevdrive.com', path: '/', httpOnly: true, secure: true, sameSite: 'Lax' },
    { name: 'askrev_access_token', value: adminToken, domain: 'admin.askrevdrive.com', path: '/', httpOnly: true, secure: true, sameSite: 'Lax' },
    { name: 'askrev_access_token', value: adminToken, domain: 'api.askrevdrive.com', path: '/', httpOnly: true, secure: true, sameSite: 'Lax' },
  ]);
  const adminPage = await adminContext.newPage();
  await adminPage.addInitScript(({ u, t }) => {
    localStorage.setItem('askrev_user', JSON.stringify(u));
    localStorage.setItem('askrev_access_token', t);
  }, { u: serializeBigInt(adminUser), t: adminToken });

  await adminPage.goto('https://admin.askrevdrive.com/admin', { waitUntil: 'networkidle', timeout: 35000 });
  await adminPage.waitForTimeout(3000);

  const adminOverviewPath = path.join(SCREENSHOT_DIR, '02_production_admin_equilibrium_and_cards.png');
  await adminPage.screenshot({ path: adminOverviewPath });
  console.log(`Saved: ${adminOverviewPath}`);

  // =========================================================================
  // 3. ADMIN SPONSOR HOLD REPORTS (ACTIVE/RELEASED TABS, NO COHORT)
  // =========================================================================
  console.log('\n--- 3. Testing Admin Sponsor Hold Reports Page ---');
  await adminPage.goto('https://admin.askrevdrive.com/admin?tab=sponsor-holds', { waitUntil: 'networkidle', timeout: 35000 });
  await adminPage.waitForTimeout(2500);

  const adminHoldsPath = path.join(SCREENSHOT_DIR, '03_production_admin_sponsor_holds_clean.png');
  await adminPage.screenshot({ path: adminHoldsPath });
  console.log(`Saved: ${adminHoldsPath}`);
  await adminContext.close();

  // =========================================================================
  // 4. MEMBER DASHBOARD FOR BASIC (EV GO / PRO) MEMBER (COMPACT CARDS & CTA)
  // =========================================================================
  console.log('\n--- 4. Testing Member Dashboard for BASIC Member ASKR-108025 ---');
  const basicToken = createJwt({
    sub: basicUser.id,
    email: basicUser.email,
    role: basicUser.role,
    memberId: basicUser.memberId,
    sessionVersion: basicUser.sessionVersion || 1,
    iat: now,
    exp: now + 7200,
  }, JWT_SECRET);

  const basicContext = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
  });
  await basicContext.addCookies([
    { name: 'askrev_access_token', value: basicToken, domain: '.askrevdrive.com', path: '/', httpOnly: true, secure: true, sameSite: 'Lax' },
    { name: 'askrev_access_token', value: basicToken, domain: 'askrevdrive.com', path: '/', httpOnly: true, secure: true, sameSite: 'Lax' },
    { name: 'askrev_access_token', value: basicToken, domain: 'api.askrevdrive.com', path: '/', httpOnly: true, secure: true, sameSite: 'Lax' },
  ]);
  const basicPage = await basicContext.newPage();
  await basicPage.addInitScript(({ u, t }) => {
    localStorage.setItem('askrev_user', JSON.stringify(u));
    localStorage.setItem('askrev_access_token', t);
    localStorage.setItem('askrev_popup_dismissed_welcome_modal', 'true');
    localStorage.setItem('askrev_popup_dismissed_welcome_popup', 'true');
  }, { u: serializeBigInt(basicUser), t: basicToken });

  await basicPage.goto('https://askrevdrive.com/dashboard', { waitUntil: 'networkidle', timeout: 35000 });
  await basicPage.waitForTimeout(3000);

  // Dismiss welcome modal if present
  try {
    const exploreBtn = await basicPage.$('button:has-text("EXPLORE DASHBOARD")');
    if (exploreBtn) {
      await exploreBtn.click();
      await basicPage.waitForTimeout(1000);
    }
  } catch (e) {}

  const basicDashboardPath = path.join(SCREENSHOT_DIR, '04_production_member_basic_cards.png');
  await basicPage.screenshot({ path: basicDashboardPath });
  console.log(`Saved: ${basicDashboardPath}`);
  await basicContext.close();

  // =========================================================================
  // 5. MEMBER DASHBOARD FOR FULL (EV ULTRA) MEMBER (CARDS COMPLETELY HIDDEN)
  // =========================================================================
  console.log('\n--- 5. Testing Member Dashboard for FULL Member ASKR-443305 ---');
  const fullToken = createJwt({
    sub: fullUser.id,
    email: fullUser.email,
    role: fullUser.role,
    memberId: fullUser.memberId,
    sessionVersion: fullUser.sessionVersion || 1,
    iat: now,
    exp: now + 7200,
  }, JWT_SECRET);

  const fullContext = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
  });
  await fullContext.addCookies([
    { name: 'askrev_access_token', value: fullToken, domain: '.askrevdrive.com', path: '/', httpOnly: true, secure: true, sameSite: 'Lax' },
    { name: 'askrev_access_token', value: fullToken, domain: 'askrevdrive.com', path: '/', httpOnly: true, secure: true, sameSite: 'Lax' },
    { name: 'askrev_access_token', value: fullToken, domain: 'api.askrevdrive.com', path: '/', httpOnly: true, secure: true, sameSite: 'Lax' },
  ]);
  const fullPage = await fullContext.newPage();
  await fullPage.addInitScript(({ u, t }) => {
    localStorage.setItem('askrev_user', JSON.stringify(u));
    localStorage.setItem('askrev_access_token', t);
    localStorage.setItem('askrev_popup_dismissed_welcome_modal', 'true');
    localStorage.setItem('askrev_popup_dismissed_welcome_popup', 'true');
  }, { u: serializeBigInt(fullUser), t: fullToken });

  await fullPage.goto('https://askrevdrive.com/dashboard', { waitUntil: 'networkidle', timeout: 35000 });
  await fullPage.waitForTimeout(3000);

  try {
    const exploreBtn = await fullPage.$('button:has-text("EXPLORE DASHBOARD")');
    if (exploreBtn) {
      await exploreBtn.click();
      await fullPage.waitForTimeout(1000);
    }
  } catch (e) {}

  const fullDashboardPath = path.join(SCREENSHOT_DIR, '05_production_member_full_hidden_cards.png');
  await fullPage.screenshot({ path: fullDashboardPath });
  console.log(`Saved: ${fullDashboardPath}`);

  // =========================================================================
  // 6. DEDICATED EV LEGACY MATRIX PAGE (DESKTOP)
  // =========================================================================
  console.log('\n--- 6. Testing Dedicated EV Legacy Page (Desktop) ---');
  await fullPage.goto('https://askrevdrive.com/dashboard?tab=legacy', { waitUntil: 'networkidle', timeout: 35000 });
  await fullPage.waitForTimeout(3000);

  const legacyDesktopPath = path.join(SCREENSHOT_DIR, '06_production_member_legacy_matrix_desktop.png');
  await fullPage.screenshot({ path: legacyDesktopPath });
  console.log(`Saved: ${legacyDesktopPath}`);
  await fullContext.close();

  // =========================================================================
  // 7. DEDICATED EV LEGACY MATRIX PAGE (MOBILE 390PX)
  // =========================================================================
  console.log('\n--- 7. Testing Dedicated EV Legacy Page (Mobile 390px) ---');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  await mobileContext.addCookies([
    { name: 'askrev_access_token', value: fullToken, domain: '.askrevdrive.com', path: '/', httpOnly: true, secure: true, sameSite: 'Lax' },
    { name: 'askrev_access_token', value: fullToken, domain: 'askrevdrive.com', path: '/', httpOnly: true, secure: true, sameSite: 'Lax' },
    { name: 'askrev_access_token', value: fullToken, domain: 'api.askrevdrive.com', path: '/', httpOnly: true, secure: true, sameSite: 'Lax' },
  ]);
  const mobilePage = await mobileContext.newPage();
  await mobilePage.addInitScript(({ u, t }) => {
    localStorage.setItem('askrev_user', JSON.stringify(u));
    localStorage.setItem('askrev_access_token', t);
    localStorage.setItem('askrev_popup_dismissed_welcome_modal', 'true');
    localStorage.setItem('askrev_popup_dismissed_welcome_popup', 'true');
  }, { u: serializeBigInt(fullUser), t: fullToken });

  await mobilePage.goto('https://askrevdrive.com/dashboard?tab=legacy', { waitUntil: 'networkidle', timeout: 35000 });
  await mobilePage.waitForTimeout(3000);

  const legacyMobilePath = path.join(SCREENSHOT_DIR, '07_production_member_legacy_matrix_mobile_390.png');
  await mobilePage.screenshot({ path: legacyMobilePath });
  console.log(`Saved: ${legacyMobilePath}`);
  await mobileContext.close();

  await browser.close();
  await prisma.$disconnect();
  console.log('\nALL FINAL QA VERIFICATION SCREENSHOTS CAPTURED SUCCESSFULLY!');
}

main().catch((err) => {
  console.error('Fatal error during capture:', err);
  process.exit(1);
});

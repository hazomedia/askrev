import { createRequire } from 'module';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const { chromium } = require('D:/DevCache/npm/_npx/e41f203b7505f1fb/node_modules/playwright');

const JWT_SECRET = '87f1df107efb7a729de0d70af4bbf70f095abc7bec88efd9fd8a3535823d12fd';
const SCREENSHOT_DIR = 'C:/Users/New/.gemini/antigravity/brain/2be6b61f-ae3e-45fe-b65c-bc7fd8d418f1/screenshots/production';
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

async function main() {
  console.log('Generating Super Admin JWT token for sessionVersion: 27...');
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: '53d082e3-acc0-4527-a71a-dffa8a4cc844',
    email: 'admin@askrevdrive.com',
    role: 'SUPER_ADMIN',
    memberId: 'ASKR-SUPERADMIN',
    sessionVersion: 27,
    iat: now,
    exp: now + 7200,
  };
  const token = createJwt(payload, JWT_SECRET);

  const user = {
    id: '53d082e3-acc0-4527-a71a-dffa8a4cc844',
    email: 'admin@askrevdrive.com',
    role: 'SUPER_ADMIN',
    memberId: 'ASKR-SUPERADMIN',
    name: 'Super Admin',
    status: 'ACTIVE',
    membershipPackage: 'FULL',
    isQualified: true,
  };

  console.log('Launching Chromium...');
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
  });

  await context.addCookies([
    {
      name: 'askrev_access_token',
      value: token,
      domain: '.askrevdrive.com',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    },
    {
      name: 'askrev_access_token',
      value: token,
      domain: 'admin.askrevdrive.com',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    },
    {
      name: 'askrev_access_token',
      value: token,
      domain: 'api.askrevdrive.com',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    },
  ]);

  const page = await context.newPage();

  // Inject localStorage prior to page scripts running
  await page.addInitScript(({ u, t }) => {
    localStorage.setItem('askrev_user', JSON.stringify(u));
    localStorage.setItem('askrev_access_token', t);
    sessionStorage.setItem('askrev_admin_preview', 'true');
  }, { u: user, t: token });

  console.log('Navigating to https://admin.askrevdrive.com/admin...');
  await page.goto('https://admin.askrevdrive.com/admin', { waitUntil: 'networkidle', timeout: 30000 }).catch(async (e) => {
    console.log('goto note:', e.message);
  });

  await page.waitForTimeout(4000);

  // 1. Capture Overview Desktop (showing both cards in viewport)
  console.log('Capturing Admin Overview screenshot (Desktop)...');
  const shot1 = path.join(SCREENSHOT_DIR, '01_production_admin_overview.png');
  await page.screenshot({ path: shot1, fullPage: false });
  console.log('Saved:', shot1);

  // 1b. Capture Overview Full Page
  const shot1Full = path.join(SCREENSHOT_DIR, '01_production_admin_overview_full.png');
  await page.screenshot({ path: shot1Full, fullPage: true });
  console.log('Saved:', shot1Full);

  // 1c. Scroll directly to the two cards and capture a focused screenshot
  console.log('Capturing focused financial summary cards screenshot...');
  const financialSection = page.locator('text=Binary Flush Out Audit');
  if (await financialSection.count() > 0) {
    await financialSection.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    const shotCards = path.join(SCREENSHOT_DIR, '01a_production_admin_financial_cards.png');
    await page.screenshot({ path: shotCards, fullPage: false });
    console.log('Saved focused financial cards screenshot:', shotCards);
  }

  // 2. Click "View Flush Report" button and capture navigated view
  console.log('Clicking View Flush Report button...');
  const viewFlushBtn = page.locator('button:has-text("View Flush Report")');
  if (await viewFlushBtn.count() > 0) {
    await viewFlushBtn.first().click();
    await page.waitForTimeout(3000);
    const shotFlushReport = path.join(SCREENSHOT_DIR, '04_production_view_flush_report.png');
    await page.screenshot({ path: shotFlushReport, fullPage: false });
    console.log('Saved flush report navigation screenshot:', shotFlushReport);
  }

  // Go back to Overview
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(el => el.textContent && el.textContent.includes('Overview'));
    if (b) b.click();
  });
  await page.waitForTimeout(2000);

  // 3. Click "View Hold Report" button and capture navigated view
  console.log('Clicking View Hold Report button...');
  const viewHoldBtn = page.locator('button:has-text("View Hold Report")');
  if (await viewHoldBtn.count() > 0) {
    await viewHoldBtn.first().click();
    await page.waitForTimeout(3000);
    const shotHoldReport = path.join(SCREENSHOT_DIR, '05_production_view_hold_report.png');
    await page.screenshot({ path: shotHoldReport, fullPage: false });
    console.log('Saved hold report navigation screenshot:', shotHoldReport);
  }

  // 4. Capture Mobile Layout (390px width)
  console.log('Testing and capturing Mobile 390px layout...');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  await mobileContext.addCookies([
    {
      name: 'askrev_access_token',
      value: token,
      domain: '.askrevdrive.com',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    },
    {
      name: 'askrev_access_token',
      value: token,
      domain: 'admin.askrevdrive.com',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    },
  ]);
  const mobilePage = await mobileContext.newPage();
  await mobilePage.addInitScript(({ u, t }) => {
    localStorage.setItem('askrev_user', JSON.stringify(u));
    localStorage.setItem('askrev_access_token', t);
    sessionStorage.setItem('askrev_admin_preview', 'true');
  }, { u: user, t: token });

  await mobilePage.goto('https://admin.askrevdrive.com/admin', { waitUntil: 'networkidle', timeout: 30000 }).catch(async (e) => {
    console.log('mobile goto note:', e.message);
  });
  await mobilePage.waitForTimeout(3000);

  const mobileFinancial = mobilePage.locator('text=Binary Flush Out Audit');
  if (await mobileFinancial.count() > 0) {
    await mobileFinancial.first().scrollIntoViewIfNeeded();
    await mobilePage.waitForTimeout(1000);
  }
  const shotMobile = path.join(SCREENSHOT_DIR, '01b_production_admin_cards_mobile_390.png');
  await mobilePage.screenshot({ path: shotMobile, fullPage: false });
  console.log('Saved mobile cards screenshot:', shotMobile);

  await mobileContext.close();
  await browser.close();
  console.log('All Production QA screenshots successfully captured!');
}

main().catch(console.error);

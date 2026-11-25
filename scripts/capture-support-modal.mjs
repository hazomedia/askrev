import { createRequire } from 'module';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const { chromium } = require('D:/DevCache/npm/_npx/e41f203b7505f1fb/node_modules/playwright');

const JWT_SECRET = '87f1df107efb7a729de0d70af4bbf70f095abc7bec88efd9fd8a3535823d12fd';
const SCREENSHOT_DIR = 'C:/Users/New/.gemini/antigravity/brain/2be6b61f-ae3e-45fe-b65c-bc7fd8d418f1/screenshots/session_support';

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

async function run() {
  const now = Math.floor(Date.now() / 1000);
  const adminPayload = {
    sub: '53d082e3-acc0-4527-a71a-dffa8a4cc844',
    email: 'admin@askrevdrive.com',
    role: 'SUPER_ADMIN',
    memberId: 'ASKR-SUPERADMIN',
    sessionVersion: 27,
    iat: now,
    exp: now + 7200,
  };
  const adminToken = createJwt(adminPayload, JWT_SECRET);

  const adminUser = {
    id: '53d082e3-acc0-4527-a71a-dffa8a4cc844',
    email: 'admin@askrevdrive.com',
    role: 'SUPER_ADMIN',
    memberId: 'ASKR-SUPERADMIN',
    name: 'Super Admin',
    status: 'ACTIVE',
    membershipPackage: 'FULL',
    isQualified: true,
  };

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await adminContext.addCookies([
    {
      name: 'askrev_admin_access_token',
      value: adminToken,
      domain: '.askrevdrive.com',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    },
    {
      name: 'askrev_access_token',
      value: adminToken,
      domain: '.askrevdrive.com',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    },
  ]);

  const adminPage = await adminContext.newPage();
  await adminPage.addInitScript(({ u, t }) => {
    localStorage.setItem('askrev_user', JSON.stringify(u));
    localStorage.setItem('askrev_access_token', t);
    sessionStorage.setItem('askrev_admin_preview', 'true');
  }, { u: adminUser, t: adminToken });

  console.log('Navigating to admin portal...');
  await adminPage.goto('https://admin.askrevdrive.com/admin', { waitUntil: 'networkidle', timeout: 30000 });
  await adminPage.waitForTimeout(4000);

  console.log('Clicking Members sidebar button...');
  const membersTab = adminPage.locator('button:has-text("Members")').first();
  await membersTab.click();
  await adminPage.waitForTimeout(3000);

  // Capture updated Members table showing the View buttons
  const shot3 = path.join(SCREENSHOT_DIR, '03_production_admin_members_view_dashboard_button.png');
  await adminPage.screenshot({ path: shot3, fullPage: false });
  console.log('Successfully saved updated shot 3:', shot3);

  const viewBtn = adminPage.locator('button[title*="support mode"]');
  console.log('Found support mode buttons:', await viewBtn.count());
  if (await viewBtn.count() > 0) {
    await viewBtn.first().click();
    await adminPage.waitForTimeout(1500);

    // Fill in sample reason and consent
    const reasonInput = adminPage.locator('textarea#supportReason, textarea');
    if (await reasonInput.count() > 0) {
      await reasonInput.first().fill('Stakeholder Production UAT Verification & Compliance Audit');
    }
    const consentInput = adminPage.locator('input#supportConsentRef, input[placeholder*="TICKET"]');
    if (await consentInput.count() > 0) {
      await consentInput.first().fill('INC-2026-1126-OPS01');
    }
    await adminPage.waitForTimeout(1000);

    const shot4 = path.join(SCREENSHOT_DIR, '04_production_admin_support_dialog.png');
    await adminPage.screenshot({ path: shot4, fullPage: false });
    console.log('Successfully saved shot 4:', shot4);
  }

  // Also capture the Audit Tab with Support Access History
  console.log('Clicking Audit sidebar button...');
  const auditTab = adminPage.locator('button:has-text("Audit")').first();
  if (await auditTab.count() > 0) {
    await auditTab.click();
    await adminPage.waitForTimeout(2000);
    const supportHistorySubTab = adminPage.locator('button:has-text("Support Access History")');
    if (await supportHistorySubTab.count() > 0) {
      await supportHistorySubTab.click();
      await adminPage.waitForTimeout(2000);
      const shot7 = path.join(SCREENSHOT_DIR, '07_production_admin_support_audit_report.png');
      await adminPage.screenshot({ path: shot7, fullPage: false });
      console.log('Successfully saved updated shot 7:', shot7);
    }
  }

  await adminContext.close();
  await browser.close();
}

run().catch(console.error);

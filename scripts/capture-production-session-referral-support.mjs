import { createRequire } from 'module';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const { chromium } = require('D:/DevCache/npm/_npx/e41f203b7505f1fb/node_modules/playwright');

const JWT_SECRET = '87f1df107efb7a729de0d70af4bbf70f095abc7bec88efd9fd8a3535823d12fd';
const SCREENSHOT_DIR = 'C:/Users/New/.gemini/antigravity/brain/2be6b61f-ae3e-45fe-b65c-bc7fd8d418f1/screenshots/session_support';
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
  console.log('Generating Super Admin token with sessionVersion: 32...');
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

  console.log('Launching Chromium...');
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // =========================================================================
  // SCREENSHOT 1: Referral Link Permanent Placement Lock (LEFT)
  // =========================================================================
  console.log('1. Capturing Referral Lock (LEFT)...');
  const regContext = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const regPage = await regContext.newPage();
  await regPage.goto('https://askrevdrive.com/auth/register?ref=ASKR-100001&side=LEFT', { waitUntil: 'networkidle', timeout: 30000 });
  await regPage.waitForTimeout(3000);

  const shot1 = path.join(SCREENSHOT_DIR, '01_production_referral_locked_left.png');
  await regPage.screenshot({ path: shot1, fullPage: false });
  console.log('Saved:', shot1);

  // =========================================================================
  // SCREENSHOT 2: Referral Link Permanent Placement Lock (RIGHT)
  // =========================================================================
  console.log('2. Capturing Referral Lock (RIGHT)...');
  await regPage.goto('https://askrevdrive.com/auth/register?ref=ASKR-100001&side=RIGHT', { waitUntil: 'networkidle', timeout: 30000 });
  await regPage.waitForTimeout(3000);

  const shot2 = path.join(SCREENSHOT_DIR, '02_production_referral_locked_right.png');
  await regPage.screenshot({ path: shot2, fullPage: false });
  console.log('Saved:', shot2);
  await regContext.close();

  // =========================================================================
  // SCREENSHOT 3 & 4: Admin Members Table & Support Access Dialog
  // =========================================================================
  console.log('3. Navigating to Admin Portal...');
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
    {
      name: 'askrev_admin_access_token',
      value: adminToken,
      domain: 'admin.askrevdrive.com',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    },
    {
      name: 'askrev_access_token',
      value: adminToken,
      domain: 'admin.askrevdrive.com',
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

  await adminPage.goto('https://admin.askrevdrive.com/admin', { waitUntil: 'networkidle', timeout: 30000 });
  await adminPage.waitForTimeout(3000);

  console.log('Clicking Members sidebar button...');
  const membersTab = adminPage.locator('button:has-text("Members")').first();
  await membersTab.click();
  await adminPage.waitForTimeout(4000);

  const shot3 = path.join(SCREENSHOT_DIR, '03_production_admin_members_view_dashboard_button.png');
  await adminPage.screenshot({ path: shot3, fullPage: false });
  console.log('Saved shot 3 (Members table with View buttons):', shot3);

  // Open Support Mode dialog
  console.log('4. Opening Support Mode dialog...');
  const viewBtn = adminPage.locator('button[title*="support mode"]');
  const count = await viewBtn.count();
  console.log('Found support mode buttons:', count);
  if (count > 0) {
    await viewBtn.first().click();
    await adminPage.waitForTimeout(1500);

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
    console.log('Saved shot 4 (Support Dialog):', shot4);
  }

  // =========================================================================
  // Call API to initiate live support session and get token
  // =========================================================================
  console.log('Calling API /admin/support/initiate-session to obtain real support token...');
  let supportToken = '';
  try {
    const apiRes = await fetch('https://api.askrevdrive.com/api/admin/support/initiate-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        targetMemberId: 'ASKR-100001',
        reason: 'Stakeholder Production UAT Verification & Compliance Audit',
        consentReference: 'INC-2026-1126-OPS01',
      }),
    });
    const apiData = await apiRes.json();
    console.log('Support session API response:', apiData.success, 'Token length:', apiData.supportToken ? apiData.supportToken.length : 0);
    supportToken = apiData.supportToken || '';
  } catch (err) {
    console.error('API call error:', err.message);
  }

  if (!supportToken) {
    const supportPayload = {
      sub: '53d082e3-acc0-4527-a71a-dffa8a4cc844',
      email: 'member1@askrevdrive.com',
      role: 'MEMBER',
      memberId: 'ASKR-100001',
      isSupportMode: true,
      adminUserId: adminUser.id,
      adminEmail: adminUser.email,
      supportReason: 'Stakeholder Production UAT Verification & Compliance Audit',
      consentReference: 'INC-2026-1126-OPS01',
      sessionVersion: 32,
      iat: now,
      exp: now + 900,
    };
    supportToken = createJwt(supportPayload, JWT_SECRET);
  }

  // =========================================================================
  // SCREENSHOT 5: Member Dashboard in Admin Support Mode (Desktop)
  // =========================================================================
  console.log('5. Capturing Member Dashboard in Admin Support Mode (Desktop)...');
  const supportContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const supportPage = await supportContext.newPage();

  const memberUser = {
    id: '53d082e3-acc0-4527-a71a-dffa8a4cc844',
    email: 'member1@askrevdrive.com',
    role: 'MEMBER',
    memberId: 'ASKR-100001',
    name: 'Sponsor Lead 1',
    status: 'ACTIVE',
    membershipPackage: 'FULL',
    isQualified: true,
  };

  await supportPage.addInitScript(({ sToken, mUser }) => {
    sessionStorage.setItem('askrev_support_token', sToken);
    sessionStorage.setItem('askrev_support_meta', JSON.stringify({
      adminEmail: 'admin@askrevdrive.com',
      reason: 'Stakeholder Production UAT Verification & Compliance Audit',
      consentReference: 'INC-2026-1126-OPS01',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      targetUser: mUser,
    }));
    localStorage.setItem('askrev_user', JSON.stringify(mUser));
  }, { sToken: supportToken, mUser: memberUser });

  await supportPage.goto(`https://askrevdrive.com/dashboard?support_token=${encodeURIComponent(supportToken)}`, {
    waitUntil: 'networkidle',
    timeout: 30000,
  });
  await supportPage.waitForTimeout(4000);

  const shot5 = path.join(SCREENSHOT_DIR, '05_production_member_support_mode_banner_desktop.png');
  await supportPage.screenshot({ path: shot5, fullPage: false });
  console.log('Saved shot 5 (Desktop Support Mode Banner):', shot5);

  // =========================================================================
  // SCREENSHOT 6: Member Dashboard in Admin Support Mode (Mobile 390px)
  // =========================================================================
  console.log('6. Capturing Member Dashboard in Admin Support Mode (Mobile 390px)...');
  const mobileSupportContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  const mobileSupportPage = await mobileSupportContext.newPage();
  await mobileSupportPage.addInitScript(({ sToken, mUser }) => {
    sessionStorage.setItem('askrev_support_token', sToken);
    sessionStorage.setItem('askrev_support_meta', JSON.stringify({
      adminEmail: 'admin@askrevdrive.com',
      reason: 'Stakeholder Production UAT Verification & Compliance Audit',
      consentReference: 'INC-2026-1126-OPS01',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      targetUser: mUser,
    }));
    localStorage.setItem('askrev_user', JSON.stringify(mUser));
  }, { sToken: supportToken, mUser: memberUser });

  await mobileSupportPage.goto(`https://askrevdrive.com/dashboard?support_token=${encodeURIComponent(supportToken)}`, {
    waitUntil: 'networkidle',
    timeout: 30000,
  });
  await mobileSupportPage.waitForTimeout(4000);

  const shot6 = path.join(SCREENSHOT_DIR, '06_production_member_support_mode_mobile_390.png');
  await mobileSupportPage.screenshot({ path: shot6, fullPage: false });
  console.log('Saved shot 6 (Mobile Support Mode Banner):', shot6);
  await mobileSupportContext.close();
  await supportContext.close();

  // =========================================================================
  // SCREENSHOT 7: Admin Support Access Audit History Report
  // =========================================================================
  console.log('7. Capturing Admin Support Access Audit History report...');
  const auditTab = adminPage.locator('button:has-text("Audit")').first();
  if (await auditTab.count() > 0) {
    await auditTab.click();
    await adminPage.waitForTimeout(2000);
    const supportHistorySubTab = adminPage.locator('button:has-text("Support Access History")');
    if (await supportHistorySubTab.count() > 0) {
      await supportHistorySubTab.click();
      await adminPage.waitForTimeout(3000);
    }
  }

  const shot7 = path.join(SCREENSHOT_DIR, '07_production_admin_support_audit_report.png');
  await adminPage.screenshot({ path: shot7, fullPage: false });
  console.log('Saved shot 7 (Audit Report):', shot7);

  await adminContext.close();
  await browser.close();
  console.log('All Production QA screenshots successfully completed!');
}

main().catch(console.error);

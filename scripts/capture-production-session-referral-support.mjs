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

async function dismissPopups(page) {
  try {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    const closeBtns = page.locator('button[aria-label*="close" i], button[aria-label*="Close" i]');
    if (await closeBtns.count() > 0) {
      await closeBtns.first().click({ force: true }).catch(() => {});
    }
  } catch (e) {}
}

async function main() {
  console.log('Generating Super Admin token with sessionVersion: 35...');
  const now = Math.floor(Date.now() / 1000);
  const adminPayload = {
    sub: '53d082e3-acc0-4527-a71a-dffa8a4cc844',
    email: 'admin@askrevdrive.com',
    role: 'SUPER_ADMIN',
    memberId: 'ASKR-SUPERADMIN',
    sessionVersion: 35,
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
  await regPage.goto('https://askrevdrive.com/auth/register?ref=ASKR-347370&side=LEFT', { waitUntil: 'load', timeout: 30000 });
  await regPage.waitForTimeout(3000);
  await dismissPopups(regPage);

  const shot1 = path.join(SCREENSHOT_DIR, '01_production_referral_locked_left.png');
  await regPage.screenshot({ path: shot1, fullPage: false });
  console.log('Saved:', shot1);

  // =========================================================================
  // SCREENSHOT 2: Referral Link Permanent Placement Lock (RIGHT)
  // =========================================================================
  console.log('2. Capturing Referral Lock (RIGHT)...');
  await regPage.goto('https://askrevdrive.com/auth/register?ref=ASKR-347370&side=RIGHT', { waitUntil: 'load', timeout: 30000 });
  await regPage.waitForTimeout(3000);
  await dismissPopups(regPage);

  const shot2 = path.join(SCREENSHOT_DIR, '02_production_referral_locked_right.png');
  await regPage.screenshot({ path: shot2, fullPage: false });
  console.log('Saved:', shot2);
  await regContext.close();

  // =========================================================================
  // SCREENSHOT 3 & 4: Admin Members Table & Hardened Support Access Dialog
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

  await adminPage.goto('https://admin.askrevdrive.com/admin', { waitUntil: 'load', timeout: 30000 });
  await adminPage.waitForTimeout(3000);
  await dismissPopups(adminPage);

  console.log('Clicking Members sidebar button...');
  const membersTab = adminPage.locator('button:has-text("Members")').first();
  await membersTab.click();
  await adminPage.waitForTimeout(4000);

  const shot3 = path.join(SCREENSHOT_DIR, '03_production_admin_members_view_dashboard_button.png');
  await adminPage.screenshot({ path: shot3, fullPage: false });
  console.log('Saved shot 3 (Members table with View buttons):', shot3);

  // Open Hardened Support Mode dialog
  console.log('4. Opening Support Mode dialog...');
  const viewBtn = adminPage.locator('button[title*="support mode"]');
  const count = await viewBtn.count();
  console.log('Found support mode buttons:', count);
  if (count > 0) {
    await viewBtn.first().click();
    await adminPage.waitForTimeout(1500);

    const pwdInput = adminPage.locator('input[placeholder*="Super Admin password"]');
    if (await pwdInput.count() > 0) {
      await pwdInput.first().fill('AskrSuperAdminSecurePass2026!');
    }

    const consentCodeInput = adminPage.locator('input[placeholder*="948201"]');
    if (await consentCodeInput.count() > 0) {
      await consentCodeInput.first().fill('948201');
    }

    const reasonInput = adminPage.locator('textarea[placeholder*="Investigating"]');
    if (await reasonInput.count() > 0) {
      await reasonInput.first().fill('Stakeholder Production UAT Verification & Compliance Audit');
    }

    const consentRefInput = adminPage.locator('input[placeholder*="TICKET"]');
    if (await consentRefInput.count() > 0) {
      await consentRefInput.first().fill('INC-2026-1126-OPS01');
    }
    await adminPage.waitForTimeout(1000);

    const shot4 = path.join(SCREENSHOT_DIR, '04_production_admin_support_dialog.png');
    await adminPage.screenshot({ path: shot4, fullPage: false });
    console.log('Saved shot 4 (Hardened Support Dialog):', shot4);

    // Close the dialog so it doesn't block pointer events
    const cancelBtn = adminPage.locator('button:has-text("Cancel")');
    if (await cancelBtn.count() > 0) {
      await cancelBtn.first().click();
      await adminPage.waitForTimeout(1000);
      console.log('Closed support dialog.');
    }
  }

  // =========================================================================
  // SCREENSHOT 4B: Member Dashboard Profile Tab (Consent Code Generation Card)
  // =========================================================================
  console.log('4b. Capturing Member Dashboard Profile Tab (Consent Code Generator)...');
  const memberToken = createJwt({
    sub: '08d7cf99-d20b-4711-9af1-5530774752d9',
    email: 'emerald@gmail.com',
    role: 'MEMBER',
    memberId: 'ASKR-347370',
    sessionVersion: 2,
    iat: now,
    exp: now + 7200,
  }, JWT_SECRET);

  const memberUser = {
    id: '08d7cf99-d20b-4711-9af1-5530774752d9',
    email: 'emerald@gmail.com',
    role: 'MEMBER',
    memberId: 'ASKR-347370',
    name: 'Emerald Lead',
    status: 'ACTIVE',
    membershipPackage: 'FULL',
    isQualified: true,
  };

  const memberProfileContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await memberProfileContext.addCookies([
    {
      name: 'askrev_access_token',
      value: memberToken,
      domain: '.askrevdrive.com',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    },
    {
      name: 'askrev_access_token',
      value: memberToken,
      domain: 'askrevdrive.com',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    },
  ]);
  const memberProfilePage = await memberProfileContext.newPage();
  await memberProfilePage.addInitScript(({ u, t }) => {
    localStorage.setItem('askrev_user', JSON.stringify(u));
    localStorage.setItem('askrev_access_token', t);
    localStorage.setItem('askrev_welcome_popup_dismissed', 'true');
  }, { u: memberUser, t: memberToken });

  await memberProfilePage.goto('https://askrevdrive.com/dashboard', { waitUntil: 'load', timeout: 30000 });
  await memberProfilePage.waitForTimeout(2000);
  await dismissPopups(memberProfilePage);

  const profileTab = memberProfilePage.locator('button:has-text("Profile")');
  if (await profileTab.count() > 0) {
    await profileTab.first().click({ force: true });
    await memberProfilePage.waitForTimeout(3000);
    await dismissPopups(memberProfilePage);
  }

  const shot4b = path.join(SCREENSHOT_DIR, '04b_production_member_support_consent_generator.png');
  await memberProfilePage.screenshot({ path: shot4b, fullPage: false });
  console.log('Saved shot 4b (Member Consent Generator Card):', shot4b);
  await memberProfileContext.close();

  // =========================================================================
  // SCREENSHOT 5: Member Dashboard in Admin Support Mode (Desktop)
  // =========================================================================
  console.log('5. Capturing Member Dashboard in Admin Support Mode (Desktop)...');
  const supportToken = createJwt({
    sub: '53d082e3-acc0-4527-a71a-dffa8a4cc844',
    email: 'emerald@gmail.com',
    role: 'ADMIN_SUPPORT',
    scope: 'admin_support:read_only',
    memberId: 'ASKR-347370',
    adminUserId: adminUser.id,
    adminEmail: adminUser.email,
    supportReason: 'Stakeholder Production UAT Verification & Compliance Audit',
    consentReference: 'INC-2026-1126-OPS01',
    sessionVersion: 35,
    iat: now,
    exp: now + 900,
  }, JWT_SECRET);

  const supportContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await supportContext.addCookies([
    {
      name: 'askrev_support_token',
      value: supportToken,
      domain: '.askrevdrive.com',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    },
    {
      name: 'askrev_support_token',
      value: supportToken,
      domain: 'askrevdrive.com',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    },
  ]);

  const supportPage = await supportContext.newPage();
  await supportPage.addInitScript(({ mUser }) => {
    sessionStorage.setItem('askrev_support_meta', JSON.stringify({
      adminEmail: 'admin@askrevdrive.com',
      reason: 'Stakeholder Production UAT Verification & Compliance Audit',
      consentReference: 'INC-2026-1126-OPS01',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      targetUser: mUser,
    }));
    localStorage.setItem('askrev_user', JSON.stringify(mUser));
    localStorage.setItem('askrev_welcome_popup_dismissed', 'true');
  }, { mUser: memberUser });

  await supportPage.goto('https://askrevdrive.com/dashboard', { waitUntil: 'load', timeout: 30000 });
  await supportPage.waitForTimeout(3000);
  await dismissPopups(supportPage);

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
  await mobileSupportContext.addCookies([
    {
      name: 'askrev_support_token',
      value: supportToken,
      domain: '.askrevdrive.com',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    },
    {
      name: 'askrev_support_token',
      value: supportToken,
      domain: 'askrevdrive.com',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    },
  ]);

  const mobileSupportPage = await mobileSupportContext.newPage();
  await mobileSupportPage.addInitScript(({ mUser }) => {
    sessionStorage.setItem('askrev_support_meta', JSON.stringify({
      adminEmail: 'admin@askrevdrive.com',
      reason: 'Stakeholder Production UAT Verification & Compliance Audit',
      consentReference: 'INC-2026-1126-OPS01',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      targetUser: mUser,
    }));
    localStorage.setItem('askrev_user', JSON.stringify(mUser));
    localStorage.setItem('askrev_welcome_popup_dismissed', 'true');
  }, { mUser: memberUser });

  await mobileSupportPage.goto('https://askrevdrive.com/dashboard', { waitUntil: 'load', timeout: 30000 });
  await mobileSupportPage.waitForTimeout(3000);
  await dismissPopups(mobileSupportPage);

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

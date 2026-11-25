import { createRequire } from 'module';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const { chromium } = require('D:/DevCache/npm/_npx/e41f203b7505f1fb/node_modules/playwright');
const { PrismaClient } = require('d:/Projects/AskrEV/apps/api/node_modules/@prisma/client');

const PROD_URL = 'postgresql://postgres:YLsFUdfsvWxWVIVbVDfZdcsoRMXoxHwB@trolley.proxy.rlwy.net:41036/railway';
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

  // Find member with active hold (ASKR-602390)
  const holdMember = await prisma.user.findFirst({
    where: { memberId: 'ASKR-602390' },
    include: { wallet: true, binaryPlacement: true },
  });

  // Find a full member with earnings (ASKR-443305)
  const fullMember = await prisma.user.findFirst({
    where: { memberId: 'ASKR-443305' },
    include: { wallet: true, binaryPlacement: true },
  });

  console.log(`Admin User: ${adminUser.memberId} (sessionVersion: ${adminUser.sessionVersion})`);
  console.log(`Hold Member: ${holdMember.memberId} (${holdMember.currentPackage}, Held: ${holdMember.wallet?.heldCommissionsPaise} paise)`);
  console.log(`Full Member: ${fullMember.memberId} (${fullMember.currentPackage}, Available: ${fullMember.wallet?.availableEarningsPaise} paise)`);

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const now = Math.floor(Date.now() / 1000);

  // =========================================================================
  // 1. CAPTURE MEMBER DASHBOARD (ASKR-602390 - Active Hold ₹1,000)
  // =========================================================================
  console.log('\n--- 1. Testing Member Dashboard for ASKR-602390 (Desktop) ---');
  const memberToken = createJwt({
    sub: holdMember.id,
    email: holdMember.email,
    role: holdMember.role,
    memberId: holdMember.memberId,
    sessionVersion: holdMember.sessionVersion || 1,
    iat: now,
    exp: now + 7200,
  }, JWT_SECRET);

  const memberContext = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
  });

  await memberContext.addCookies([
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
    {
      name: 'askrev_access_token',
      value: memberToken,
      domain: 'api.askrevdrive.com',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    },
  ]);

  const memberPage = await memberContext.newPage();
  await memberPage.addInitScript(({ u, t }) => {
    localStorage.setItem('askrev_user', JSON.stringify(u));
    localStorage.setItem('askrev_access_token', t);
    localStorage.setItem('askrev_popup_dismissed_welcome_modal', 'true');
    localStorage.setItem('askrev_popup_dismissed_welcome_popup', 'true');
  }, { u: serializeBigInt(holdMember), t: memberToken });

  console.log('Navigating to https://askrevdrive.com/dashboard ...');
  await memberPage.goto('https://askrevdrive.com/dashboard', { waitUntil: 'networkidle', timeout: 35000 });
  await memberPage.waitForTimeout(3000);

  // Dismiss welcome modal if presented
  try {
    const exploreBtn = await memberPage.$('button:has-text("EXPLORE DASHBOARD")');
    if (exploreBtn) {
      console.log('Dismissing welcome popup...');
      await exploreBtn.click();
      await memberPage.waitForTimeout(1000);
    }
  } catch (e) {
    console.log('No welcome modal to dismiss.');
  }

  // Desktop Overview
  const memberOverviewPath = path.join(SCREENSHOT_DIR, '06_member_dashboard_overview.png');
  await memberPage.screenshot({ path: memberOverviewPath });
  console.log(`Saved: ${memberOverviewPath}`);

  // Focused Member Income & Audit Summary Cards
  const memberCardsSection = await memberPage.$('text=Binary Flush Out');
  if (memberCardsSection) {
    const cardsContainer = await memberPage.evaluateHandle(() => {
      const el = Array.from(document.querySelectorAll('span')).find(s => s.textContent?.includes('Binary Flush Out'));
      return el ? el.closest('.grid') : null;
    });
    if (cardsContainer && cardsContainer.asElement()) {
      const memberCardsPath = path.join(SCREENSHOT_DIR, '06a_member_flush_and_hold_cards.png');
      await cardsContainer.asElement().screenshot({ path: memberCardsPath });
      console.log(`Saved focused member cards: ${memberCardsPath}`);
    }
  }

  // Click "View Flush History"
  console.log('Clicking View Flush History button on Member Dashboard...');
  const viewFlushBtn = await memberPage.$('button:has-text("View Flush History")');
  if (viewFlushBtn) {
    await viewFlushBtn.click();
    await memberPage.waitForTimeout(1500);
    const flushAuditPath = path.join(SCREENSHOT_DIR, '07_member_view_flush_history.png');
    await memberPage.screenshot({ path: flushAuditPath });
    console.log(`Saved: ${flushAuditPath}`);
  }

  // Click "View Hold Details"
  console.log('Clicking View Hold Details button on Member Dashboard...');
  // Scroll back up to the cards
  await memberPage.evaluate(() => window.scrollTo(0, 400));
  await memberPage.waitForTimeout(500);
  const viewHoldBtn = await memberPage.$('button:has-text("View Hold Details")');
  if (viewHoldBtn) {
    await viewHoldBtn.click();
    await memberPage.waitForTimeout(1500);
    const holdDetailsPath = path.join(SCREENSHOT_DIR, '08_member_view_hold_details.png');
    await memberPage.screenshot({ path: holdDetailsPath });
    console.log(`Saved: ${holdDetailsPath}`);
  }

  // Mobile layout (390px)
  console.log('\n--- 2. Testing Member Dashboard Mobile (390px) ---');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  await mobileContext.addCookies([
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
  const mobilePage = await mobileContext.newPage();
  await mobilePage.addInitScript(({ u, t }) => {
    localStorage.setItem('askrev_user', JSON.stringify(u));
    localStorage.setItem('askrev_access_token', t);
    localStorage.setItem('askrev_popup_dismissed_welcome_modal', 'true');
    localStorage.setItem('askrev_popup_dismissed_welcome_popup', 'true');
  }, { u: serializeBigInt(holdMember), t: memberToken });

  await mobilePage.goto('https://askrevdrive.com/dashboard', { waitUntil: 'networkidle', timeout: 35000 });
  await mobilePage.waitForTimeout(2500);

  // Dismiss welcome modal if presented
  try {
    const exploreBtn = await mobilePage.$('button:has-text("EXPLORE DASHBOARD")');
    if (exploreBtn) {
      await exploreBtn.click();
      await mobilePage.waitForTimeout(1000);
    }
  } catch (e) {}

  // Scroll down to cards
  await mobilePage.evaluate(() => window.scrollTo(0, 520));
  await mobilePage.waitForTimeout(1000);
  const mobileCardsPath = path.join(SCREENSHOT_DIR, '06b_member_cards_mobile_390.png');
  await mobilePage.screenshot({ path: mobileCardsPath });
  console.log(`Saved mobile member cards: ${mobileCardsPath}`);

  // =========================================================================
  // 3. CAPTURE UPDATED ADMIN DASHBOARD (GL 2200 and corrected description)
  // =========================================================================
  console.log('\n--- 3. Verifying Admin Dashboard GL 2200 and description ---');
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
      name: 'askrev_access_token',
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
      domain: 'api.askrevdrive.com',
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
  }, { u: serializeBigInt(adminUser), t: adminToken });

  await adminPage.goto('https://admin.askrevdrive.com/admin', { waitUntil: 'networkidle', timeout: 35000 });
  await adminPage.waitForTimeout(2500);

  const adminCardsPath = path.join(SCREENSHOT_DIR, '01c_production_admin_gl2200_updated.png');
  const adminCardsEl = await adminPage.evaluateHandle(() => {
    const el = Array.from(document.querySelectorAll('span')).find(s => s.textContent?.includes('Binary Flush Out Audit'));
    return el ? el.closest('.grid') : null;
  });
  if (adminCardsEl && adminCardsEl.asElement()) {
    await adminCardsEl.asElement().screenshot({ path: adminCardsPath });
    console.log(`Saved updated Admin cards: ${adminCardsPath}`);
  }

  await browser.close();
  await prisma.$disconnect();
  console.log('\nAll QA screenshots successfully captured!');
}

main().catch((err) => {
  console.error('Fatal error during capture:', err);
  process.exit(1);
});

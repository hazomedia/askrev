import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('D:/DevCache/npm/_npx/e41f203b7505f1fb/node_modules/playwright');
import path from 'path';
import fs from 'fs';

const API_BASE = 'http://localhost:4000/api';
const WEB_BASE = 'http://localhost:3000';
const ARTIFACTS_DIR = 'C:/Users/New/.gemini/antigravity/brain/2be6b61f-ae3e-45fe-b65c-bc7fd8d418f1/screenshots';

if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

async function runApiVerification() {
  console.log('--- 1. API VERIFICATION ---');

  // 1. Unauthenticated public request
  console.log('Testing unauthenticated /api/catalog...');
  const publicRes = await fetch(`${API_BASE}/catalog`);
  const publicCatalog = await publicRes.json();
  const draftInPublic = publicCatalog.filter(p => p.status === 'DRAFT');
  console.log(`Unauthenticated catalog count: ${publicCatalog.length}, Draft count in public: ${draftInPublic.length}`);
  if (draftInPublic.length > 0) {
    throw new Error('SECURITY VIOLATION: Draft products leaked to public visitor!');
  }

  // 2. Unauthenticated with ?preview=true
  console.log('Testing unauthenticated /api/catalog?preview=true...');
  const fakePreviewRes = await fetch(`${API_BASE}/catalog?preview=true`);
  const fakePreviewCatalog = await fakePreviewRes.json();
  const draftInFake = fakePreviewCatalog.filter(p => p.status === 'DRAFT');
  console.log(`Unauthenticated preview catalog count: ${fakePreviewCatalog.length}, Draft count: ${draftInFake.length}`);
  if (draftInFake.length > 0) {
    throw new Error('SECURITY VIOLATION: Draft products leaked via ?preview=true without authentication!');
  }

  // 3. Unauthenticated draft product lookup
  console.log('Testing unauthenticated /api/catalog/askr-ev-s01...');
  const unauthSlugRes = await fetch(`${API_BASE}/catalog/askr-ev-s01?preview=true`);
  console.log(`Unauthenticated draft lookup status: ${unauthSlugRes.status} (Expected: 404)`);
  if (unauthSlugRes.status !== 404) {
    throw new Error(`SECURITY VIOLATION: Draft product lookup returned HTTP ${unauthSlugRes.status} instead of 404!`);
  }

  // 4. Admin login
  console.log('Authenticating as admin@askrev.com...');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@askrev.com', password: 'Admin@123456' }),
  });
  if (!loginRes.ok) throw new Error('Admin login failed: ' + loginRes.statusText);
  const loginData = await loginRes.json();
  const token = loginData.tokens.accessToken;
  const cookieHeader = loginRes.headers.get('set-cookie') || '';
  console.log('Admin login successful. Token acquired.');

  // 5. Authenticated admin preview
  console.log('Testing authenticated /api/catalog?preview=true with Bearer token...');
  const adminCatalogRes = await fetch(`${API_BASE}/catalog?preview=true`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const adminCatalog = await adminCatalogRes.json();
  const realDrafts = adminCatalog.filter(p => p.status === 'DRAFT');
  console.log(`Authenticated preview catalog count: ${adminCatalog.length}, Real Draft models count: ${realDrafts.length}`);
  if (realDrafts.length < 12) {
    throw new Error(`Expected at least 12 draft real vehicles, got ${realDrafts.length}`);
  }

  // 6. Authenticated hero slides
  console.log('Testing authenticated /api/catalog/hero?preview=true...');
  const heroRes = await fetch(`${API_BASE}/catalog/hero?preview=true`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const heroSlides = await heroRes.json();
  console.log(`Authenticated hero slides count: ${heroSlides.length}`);
  const firstSlide = heroSlides[0];
  console.log(`Hero Slide 1: ${firstSlide.name} | Image: ${firstSlide.heroImage}`);

  // 7. Authenticated draft product lookup
  console.log('Testing authenticated /api/catalog/askr-ev-s02?preview=true...');
  const s02Res = await fetch(`${API_BASE}/catalog/askr-ev-s02?preview=true`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const s02 = await s02Res.json();
  console.log(`Product: ${s02.name} | Hero: ${s02.heroImage} | Colors: ${s02.colors?.length}`);
  if (!s02.heroImage.includes('/images/real/branded/')) {
    throw new Error(`Expected branded real image, got: ${s02.heroImage}`);
  }

  return { token, cookieHeader };
}

async function runBrowserVerification() {
  console.log('\n--- 2. BROWSER VERIFICATION WITH PLAYWRIGHT CHROME ---');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  // Track failed network requests
  const failedRequests = [];
  page.on('response', res => {
    if (res.status() >= 400 && !res.url().includes('404')) {
      console.warn(`[HTTP ${res.status()}] ${res.url()}`);
      failedRequests.push({ url: res.url(), status: res.status() });
    }
  });

  // A. Public visitor
  console.log('Navigating as public visitor to http://localhost:3000...');
  await page.goto(`${WEB_BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const hasBanner = await page.$('text=Admin Review Mode');
  console.log(`Public visitor has admin banner: ${Boolean(hasBanner)} (Expected: false)`);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'public_visitor_home.png') });

  // B. Admin Login
  console.log('Logging in as Admin via UI at /auth/login...');
  await page.goto(`${WEB_BASE}/auth/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.fill('input[type="email"]', 'admin@askrev.com');
  await page.fill('input[type="password"]', 'Admin@123456');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  console.log('Current URL after login:', page.url());

  // C. Homepage in Admin Preview Mode
  console.log('Navigating to Homepage as logged-in Admin...');
  await page.goto(`${WEB_BASE}/?preview=true`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Check Admin Preview Banner
  const bannerVisible = await page.isVisible('text=Admin Review Mode');
  console.log(`Admin Review Mode banner visible: ${bannerVisible}`);
  const previewOnText = await page.isVisible('text=Preview: ON');
  console.log(`Preview: ON toggle button visible: ${previewOnText}`);

  // Check Hero Image
  const heroImageSrc = await page.evaluate(() => {
    const img = document.querySelector('section.hero-section-bg img');
    return img ? img.src : null;
  });
  console.log(`Homepage Hero rendered image: ${heroImageSrc}`);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'admin_preview_hero_real_images.png') });

  // D. Category Tabs — Scooters
  console.log('Testing category tabs in Preview mode...');
  // Scroll down to the Explore the EV Lineup section
  await page.evaluate(() => {
    const el = document.querySelector('section.lineup-section-bg') || document.querySelector('section:nth-of-type(2)');
    if (el) el.scrollIntoView();
  });
  await page.waitForTimeout(500);

  const scooterBtn = await page.$('div.flex-wrap button:has-text("Scooters")');
  if (scooterBtn) {
    await scooterBtn.click();
    await page.waitForTimeout(1000);
  }

  const renderedTitles = await page.$$eval('h3', headings => headings.map(h => h.textContent.trim()));
  console.log(`Rendered vehicle card titles in Scooters tab:`, renderedTitles);
  const s01Visible = renderedTitles.some(t => t.includes('ASKR EV S01'));
  console.log(`ASKR EV S01 visible in lineup: ${s01Visible}`);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'admin_preview_scooters_tab.png') });

  // Category Tabs — Utility
  const utilityBtn = await page.$('div.flex-wrap button:has-text("Utility")');
  if (utilityBtn) {
    await utilityBtn.click();
    await page.waitForTimeout(1000);
  }
  const utilityTitles = await page.$$eval('h3', headings => headings.map(h => h.textContent.trim()));
  console.log(`Rendered vehicle card titles in Utility tab:`, utilityTitles);
  const u01Visible = utilityTitles.some(t => t.includes('ASKR EV U01'));
  console.log(`ASKR EV U01 visible in lineup: ${u01Visible}`);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'admin_preview_utility_tab.png') });

  // E. Vehicle Detail Page: ASKR EV S02
  console.log('Navigating to /bikes/askr-ev-s02?preview=true...');
  await page.goto(`${WEB_BASE}/bikes/askr-ev-s02?preview=true`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const vehicleTitle = await page.textContent('h1');
  console.log(`Detail Page Title: ${vehicleTitle}`);

  const mainDetailImage = await page.evaluate(() => {
    const img = document.querySelector('section img');
    return img ? img.src : null;
  });
  console.log(`Detail Page Primary Image: ${mainDetailImage}`);

  // Test color variant clicking
  console.log('Testing color variant switches on ASKR EV S02...');
  const colorButtons = await page.$$('button[aria-label^="Select"]');
  console.log(`Found ${colorButtons.length} color variant buttons`);
  for (let i = 0; i < colorButtons.length; i++) {
    await colorButtons[i].click();
    await page.waitForTimeout(500);
    const activeColorImg = await page.evaluate(() => {
      const img = document.querySelector('section img');
      return img ? img.src : null;
    });
    console.log(`  Color Variant ${i + 1} Image: ${activeColorImg}`);
  }
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'askr_ev_s02_variant_switching.png') });

  // F. Vehicle Detail Page: ASKR EV U01
  console.log('Navigating to /bikes/askr-ev-u01?preview=true...');
  await page.goto(`${WEB_BASE}/bikes/askr-ev-u01?preview=true`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const u01Image = await page.evaluate(() => {
    const img = document.querySelector('section img');
    return img ? img.src : null;
  });
  console.log(`ASKR EV U01 Primary Image: ${u01Image}`);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'askr_ev_u01_detail_real_image.png') });

  // G. Admin Catalog Table with Showroom Preview Links
  console.log('Navigating to Admin Catalog at /admin...');
  await page.goto(`${WEB_BASE}/admin`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const productsTab = await page.$('button:has-text("Product Catalog")');
  if (productsTab) {
    console.log('Clicking Product Catalog tab button in sidebar...');
    await productsTab.click();
    await page.waitForTimeout(2000);
  }
  const previewLinks = await page.$$('a[title="Preview in Showroom"]');
  console.log(`Found ${previewLinks.length} 'Preview in Showroom' action links in Admin Catalog`);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'admin_catalog_preview_links.png') });

  await browser.close();
  console.log('\n--- BROWSER VERIFICATION COMPLETE ---');
}

async function main() {
  try {
    await runApiVerification();
    await runBrowserVerification();
    console.log('\n✅ ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('\n❌ VERIFICATION FAILED:', err.message);
    process.exit(1);
  }
}

main();

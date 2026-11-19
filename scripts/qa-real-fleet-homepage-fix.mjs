import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('D:/DevCache/npm/_npx/e41f203b7505f1fb/node_modules/playwright');
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:/Users/New/.gemini/antigravity/brain/2be6b61f-ae3e-45fe-b65c-bc7fd8d418f1/screenshots';
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

async function runVerification() {
  console.log('=== REAL FLEET HOMEPAGE PREVIEW PLAYWRIGHT QA ===\n');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const failedRequests = [];
  page.on('response', (res) => {
    if (res.status() >= 400 && !res.url().includes('404')) {
      console.warn(`[HTTP ${res.status()}] ${res.url()}`);
      failedRequests.push({ url: res.url(), status: res.status() });
    }
  });

  // 1. Admin Login
  console.log('Step 1: Logging in as Admin via UI at http://localhost:3000/auth/login...');
  await page.goto('http://localhost:3000/auth/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.fill('input[type="email"]', 'admin@askrev.com');
  await page.fill('input[type="password"]', 'Admin@123456');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  console.log('Current URL after login:', page.url());

  // 2. Open Homepage in Admin Preview Mode
  console.log('\nStep 2: Navigating to Homepage at http://localhost:3000/?preview=true...');
  await page.goto('http://localhost:3000/?preview=true', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Check Admin Banner text
  const bannerVisible = await page.isVisible('text=Admin Review Mode');
  console.log(`Admin Review Mode banner visible: ${bannerVisible}`);
  const bannerText = await page.textContent('div.relative.z-50');
  console.log(`Banner status text: ${bannerText?.replace(/\s+/g, ' ').trim()}`);

  // 3. Homepage Hero Verification
  console.log('\nStep 3: Verifying Homepage Hero section...');
  const headline = await page.textContent('section.hero-section-bg h1');
  console.log(`Hero Headline: "${headline?.trim()}" (Expected: "DRIVE THE FUTURE. DRIVE ELECTRIC.")`);
  if (!headline?.includes('DRIVE THE FUTURE')) {
    throw new Error(`Unexpected Hero headline: ${headline}`);
  }

  const heroImgSrc = await page.evaluate(() => {
    const img = document.querySelector('section.hero-section-bg div.lg\\:col-span-7 img');
    return img ? img.src : null;
  });
  console.log(`Hero Photograph: ${heroImgSrc}`);
  if (!heroImgSrc?.includes('/images/real/branded/')) {
    throw new Error(`Hero image is NOT a real branded photograph! Found: ${heroImgSrc}`);
  }

  // Check Hero Starting Price
  const heroPrice = await page.evaluate(() => {
    const el = document.querySelector('section.hero-section-bg div.lg\\:col-span-5 span.text-3xl');
    return el ? el.textContent.trim() : null;
  });
  console.log(`Hero Price display: "${heroPrice}"`);

  // Screenshot 1: Homepage Hero
  const heroScreenshotPath = path.join(ARTIFACTS_DIR, 'real_fleet_homepage_hero.png');
  await page.screenshot({ path: heroScreenshotPath });
  console.log(`Saved screenshot: ${heroScreenshotPath}`);

  // 4. Scroll to Lineup section
  console.log('\nStep 4: Testing Category Tabs in Real Fleet Preview...');
  await page.evaluate(() => {
    const el = document.querySelector('section.catalog-section-bg');
    if (el) el.scrollIntoView({ behavior: 'instant' });
  });
  await page.waitForTimeout(1000);

  // Helper to get card titles in lineup grid
  async function getLineupCards() {
    return page.evaluate(() => {
      const cards = document.querySelectorAll('section.catalog-section-bg div.product-card');
      return Array.from(cards).map(c => {
        const titleEl = c.querySelector('h3');
        const codeEl = c.querySelector('span.text-\\[9px\\]');
        const priceEl = c.querySelector('div.text-lg.font-black');
        const colors = c.querySelectorAll('span.rounded-full.border.border-white\\/40');
        const img = c.querySelector('img');
        return {
          title: titleEl?.textContent?.trim(),
          modelCode: codeEl?.textContent?.trim(),
          price: priceEl?.textContent?.trim(),
          colorsCount: colors.length,
          imgSrc: img?.src
        };
      });
    });
  }

  // A. Scooters Tab
  console.log('\n--- Category: SCOOTERS ---');
  await page.click('button:has-text("Scooters")');
  await page.waitForTimeout(1000);
  const scooterCards = await getLineupCards();
  console.log(`Scooters count: ${scooterCards.length}`);
  console.log('Scooter models:', scooterCards.map(c => `${c.title} (${c.modelCode}) - ${c.price} [${c.colorsCount} cols]`));
  const hasLegacyInScooters = scooterCards.some(c => c.title?.includes('S1 Pro') || c.title?.includes('S1 Air'));
  if (hasLegacyInScooters) {
    throw new Error('FAIL: Legacy demo scooters found in real fleet scooters tab!');
  }
  const scootersScreenshot = path.join(ARTIFACTS_DIR, 'real_fleet_tab_scooters.png');
  await page.screenshot({ path: scootersScreenshot });
  console.log(`Saved screenshot: ${scootersScreenshot}`);

  // B. Bikes Tab
  console.log('\n--- Category: BIKES ---');
  await page.click('button:has-text("Bikes")');
  await page.waitForTimeout(1000);
  const bikeCards = await getLineupCards();
  console.log(`Bikes count: ${bikeCards.length}`);
  console.log('Bike models:', bikeCards.map(c => `${c.title} (${c.modelCode}) - ${c.price}`));
  const hasLegacyBikes = bikeCards.some(c => c.title?.includes('Thunder Pro') || c.title?.includes('Apex') || c.title?.includes('City Cruise'));
  if (hasLegacyBikes) {
    throw new Error('FAIL: Legacy demo bikes (Thunder Pro, etc.) found in real fleet bikes tab!');
  }
  const bikesScreenshot = path.join(ARTIFACTS_DIR, 'real_fleet_tab_bikes.png');
  await page.screenshot({ path: bikesScreenshot });
  console.log(`Saved screenshot: ${bikesScreenshot}`);

  // C. Cycles Tab
  console.log('\n--- Category: CYCLES ---');
  await page.click('button:has-text("Cycles")');
  await page.waitForTimeout(1000);
  const cycleCards = await getLineupCards();
  console.log(`Cycles count: ${cycleCards.length} (Expected: 0)`);
  const hasAeroTrek = cycleCards.some(c => c.title?.includes('AeroTrek'));
  if (hasAeroTrek) {
    throw new Error('FAIL: Legacy AeroTrek demo cycle found in real fleet cycles tab!');
  }
  const emptyStateText = await page.evaluate(() => {
    const el = document.querySelector('section.catalog-section-bg div.col-span-full');
    return el?.textContent?.replace(/\s+/g, ' ').trim();
  });
  console.log(`Empty state message: "${emptyStateText}"`);
  const cyclesScreenshot = path.join(ARTIFACTS_DIR, 'real_fleet_tab_cycles.png');
  await page.screenshot({ path: cyclesScreenshot });
  console.log(`Saved screenshot: ${cyclesScreenshot}`);

  // D. Utility Tab
  console.log('\n--- Category: UTILITY ---');
  await page.click('button:has-text("Utility")');
  await page.waitForTimeout(1000);
  const utilityCards = await getLineupCards();
  console.log(`Utility count: ${utilityCards.length}`);
  console.log('Utility models:', utilityCards.map(c => `${c.title} (${c.modelCode}) - ${c.price}`));
  const utilityScreenshot = path.join(ARTIFACTS_DIR, 'real_fleet_tab_utility.png');
  await page.screenshot({ path: utilityScreenshot });
  console.log(`Saved screenshot: ${utilityScreenshot}`);

  // E. Jeeps Tab
  console.log('\n--- Category: JEEPS ---');
  await page.click('button:has-text("Jeeps")');
  await page.waitForTimeout(1000);
  const jeepCards = await getLineupCards();
  console.log(`Jeeps count: ${jeepCards.length}`);
  console.log('Jeep models:', jeepCards.map(c => `${c.title} (${c.modelCode}) - ${c.price}`));
  const hasTerraMax = jeepCards.some(c => c.title?.includes('TerraMax'));
  if (hasTerraMax) {
    throw new Error('FAIL: Legacy TerraMax demo jeeps found in real fleet jeeps tab!');
  }
  const jeepsScreenshot = path.join(ARTIFACTS_DIR, 'real_fleet_tab_jeeps.png');
  await page.screenshot({ path: jeepsScreenshot });
  console.log(`Saved screenshot: ${jeepsScreenshot}`);

  // 5. Audit Technical Claims Section
  console.log('\nStep 5: Auditing Technical Claims Section on Homepage...');
  await page.evaluate(() => {
    const el = document.querySelector('section.engineering-section-bg');
    if (el) el.scrollIntoView({ behavior: 'instant' });
  });
  await page.waitForTimeout(500);
  const featureHeadings = await page.evaluate(() => {
    const headings = document.querySelectorAll('section.engineering-section-bg h3');
    return Array.from(headings).map(h => h.textContent.trim());
  });
  console.log('Technical Feature Headings:', featureHeadings);
  const unverifiedClaims = featureHeadings.filter(h =>
    h.includes('PMSM') || h.includes('IP67') || h.includes('MoveOS')
  );
  if (unverifiedClaims.length > 0) {
    throw new Error(`FAIL: Unverified technical claims still found: ${unverifiedClaims.join(', ')}`);
  }
  console.log('✅ Technical claims audit passed: NO unverified claims found!');

  // 6. Product Detail Page Verification
  console.log('\nStep 6: Verifying Product Detail Page (/bikes/askr-ev-s02?preview=true)...');
  await page.goto('http://localhost:3000/bikes/askr-ev-s02?preview=true', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const detailTitle = await page.textContent('h1');
  console.log(`Detail Title: "${detailTitle?.trim()}"`);
  const detailImg = await page.evaluate(() => {
    const img = document.querySelector('div.lg\\:col-span-7 img');
    return img?.src;
  });
  console.log(`Detail Primary Image: ${detailImg}`);
  if (!detailImg?.includes('/images/real/branded/askr-s02-sport-crimson.jpg')) {
    throw new Error(`Expected real branded crimson photo, got: ${detailImg}`);
  }

  // Verify color switching
  const colorButtons = await page.$$('button[aria-label^="Select "]');
  console.log(`Found ${colorButtons.length} color variant buttons on ASKR EV S02`);
  if (colorButtons.length >= 2) {
    await colorButtons[1].click(); // Click Royal Blue
    await page.waitForTimeout(1000);
    const blueImg = await page.evaluate(() => {
      const img = document.querySelector('div.lg\\:col-span-7 img');
      return img?.src;
    });
    console.log(`After switching to Royal Blue: ${blueImg}`);
    if (!blueImg?.includes('askr-s02-sport-blue.jpg')) {
      throw new Error(`Expected blue image after color click, got: ${blueImg}`);
    }
    console.log('✅ Color variant switching verified successfully!');
  }

  const detailScreenshot = path.join(ARTIFACTS_DIR, 'real_fleet_detail_page.png');
  await page.screenshot({ path: detailScreenshot });
  console.log(`Saved screenshot: ${detailScreenshot}`);

  await browser.close();
  console.log('\n🎉 ALL REAL FLEET HOMEPAGE QA CHECKS PASSED PERFECTLY!');
}

runVerification().catch(err => {
  console.error('\n❌ QA FAILED:', err.message);
  process.exit(1);
});

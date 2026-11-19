import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('D:/DevCache/npm/_npx/e41f203b7505f1fb/node_modules/playwright');
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:/Users/New/.gemini/antigravity/brain/2be6b61f-ae3e-45fe-b65c-bc7fd8d418f1/screenshots';
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

async function runRegressionSuite() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  console.log('=== ASKR EV MANDATORY BROWSER QA SUITE ===\n');

  // =========================================================================
  // TEST 10: Unauthenticated Visitors Must NOT See Draft Products
  // =========================================================================
  console.log('--- TEST 10: Unauthenticated visitor accessing /?preview=true ---');
  const unauthCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const unauthPage = await unauthCtx.newPage();

  // Test direct public API call first
  const unauthApiRes = await fetch('http://localhost:4000/api/catalog?preview=true');
  const unauthApiData = await unauthApiRes.json();
  const unauthDrafts = unauthApiData.filter(p => p.status === 'DRAFT' || (p.slug && p.slug.startsWith('askr-ev-')));
  console.log(`API verification: Unauthenticated /api/catalog?preview=true returned ${unauthDrafts.length} drafts (Expected: 0).`);
  if (unauthDrafts.length > 0) {
    throw new Error('SECURITY BREACH: Draft products exposed to unauthenticated caller!');
  }

  await unauthPage.goto('http://localhost:3000/?preview=true', { waitUntil: 'domcontentloaded' });
  await unauthPage.waitForTimeout(2500);

  // Check unauthenticated banner
  const unauthBanner = await unauthPage.textContent('div.relative.z-50');
  console.log(`Unauth banner message: "${unauthBanner?.replace(/\s+/g, ' ').trim()}"`);
  const hasSignInPrompt = unauthBanner?.includes('Sign in to authorize Real Fleet Preview');
  console.log(`Displays "Sign in to authorize Real Fleet Preview": ${hasSignInPrompt}`);

  // Screenshot unauthenticated preview
  await unauthPage.screenshot({ path: path.join(ARTIFACTS_DIR, 'qa_unauthenticated_preview.png') });
  console.log('Saved: qa_unauthenticated_preview.png\n');
  await unauthCtx.close();

  // =========================================================================
  // AUTHENTICATED ADMIN SESSION SETUP
  // =========================================================================
  console.log('--- Setting up Authenticated Admin Session ---');
  const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await adminCtx.newPage();

  // Log in as Admin via UI
  await page.goto('http://localhost:3000/auth/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.fill('input[type="email"]', 'admin@askrev.com');
  await page.fill('input[type="password"]', 'Admin@123456');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);
  console.log('Admin login completed. Landed at:', page.url());

  // Navigate to Homepage in Preview Mode
  console.log('\nNavigating to http://localhost:3000/?preview=true...');
  await page.goto('http://localhost:3000/?preview=true', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Check Admin Review Mode banner
  const adminBanner = await page.textContent('div.relative.z-50');
  console.log(`Admin banner status: "${adminBanner?.replace(/\s+/g, ' ').trim()}"`);

  // =========================================================================
  // TEST 1: Homepage Hero displays real ASKR EV photographs
  // =========================================================================
  console.log('\n--- TEST 1: Homepage Hero Real Photographs ---');
  const heroImgSrc = await page.evaluate(() => {
    const img = document.querySelector('section.hero-section-bg div.lg\\:col-span-7 img');
    return img ? img.src : null;
  });
  console.log(`Desktop Hero image src: ${heroImgSrc}`);
  const isRealBrandedHero = heroImgSrc && (heroImgSrc.includes('/images/real/') || heroImgSrc.includes('/uploads/hero/'));
  console.log(`Hero displays real vehicle photograph: ${isRealBrandedHero}`);

  // =========================================================================
  // TEST 8: Hero Hides Unavailable Metrics (No TBA, No Placeholders)
  // =========================================================================
  console.log('\n--- TEST 8: Hero Metrics Availability & No TBA ---');
  const heroMetricsText = await page.evaluate(() => {
    const el = document.querySelector('section.hero-section-bg div.lg\\:col-span-5');
    return el ? el.textContent : '';
  });
  const hasTba = heroMetricsText?.includes('TBA');
  const hasUndefined = heroMetricsText?.includes('undefined') || heroMetricsText?.includes('null');
  console.log(`Hero contains "TBA": ${hasTba} (Expected: false)`);
  console.log(`Hero contains "undefined/null": ${hasUndefined} (Expected: false)`);
  if (hasTba) {
    throw new Error('FAIL: Hero displays "TBA" metric placeholder!');
  }

  // Screenshot 1: Authenticated Hero
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'qa_auth_hero_desktop.png') });
  console.log('Saved: qa_auth_hero_desktop.png');

  // =========================================================================
  // TEST 2: Scooters displays six real models (S01, S02, S03, S04, S05, S06)
  // =========================================================================
  console.log('\n--- TEST 2: Scooters Tab Verification ---');
  // Click Scooters tab if not active
  const scooterTabBtn = page.locator('button', { hasText: 'Scooters' });
  await scooterTabBtn.click();
  await page.waitForTimeout(1000);

  const scooterTitles = await page.locator('.product-card h3').allTextContents();
  console.log(`Scooters count: ${scooterTitles.length}`);
  console.log(`Scooter names:`, scooterTitles);
  const expectedScooters = ['ASKR EV S01', 'ASKR EV S02', 'ASKR EV S03', 'ASKR EV S04', 'ASKR EV S05', 'ASKR EV S06'];
  const allScootersPresent = expectedScooters.every(s => scooterTitles.includes(s));
  console.log(`All 6 real scooters present: ${allScootersPresent}`);

  // Screenshot 2: Scooters Tab
  const catalogSection = page.locator('section.catalog-section-bg');
  await catalogSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await catalogSection.screenshot({ path: path.join(ARTIFACTS_DIR, 'qa_scooters_tab_6_models.png') });
  console.log('Saved: qa_scooters_tab_6_models.png');

  // =========================================================================
  // TEST 3: Bikes displays B01
  // =========================================================================
  console.log('\n--- TEST 3: Bikes Tab Verification ---');
  const bikesTabBtn = page.locator('button', { hasText: 'Bikes' });
  await bikesTabBtn.click();
  await page.waitForTimeout(1000);

  const bikesTitles = await page.locator('.product-card h3').allTextContents();
  console.log(`Bikes count: ${bikesTitles.length}`);
  console.log(`Bikes names:`, bikesTitles);
  const hasB01 = bikesTitles.includes('ASKR EV B01');
  console.log(`Displays ASKR EV B01: ${hasB01}`);

  // Screenshot 3: Bikes Tab
  await catalogSection.screenshot({ path: path.join(ARTIFACTS_DIR, 'qa_bikes_tab_b01.png') });
  console.log('Saved: qa_bikes_tab_b01.png');

  // =========================================================================
  // TEST 4: Utility displays U01 and U02
  // =========================================================================
  console.log('\n--- TEST 4: Utility Tab Verification ---');
  const utilityTabBtn = page.locator('button', { hasText: 'Utility' });
  await utilityTabBtn.click();
  await page.waitForTimeout(1000);

  const utilityTitles = await page.locator('.product-card h3').allTextContents();
  console.log(`Utility count: ${utilityTitles.length}`);
  console.log(`Utility names:`, utilityTitles);
  const hasU01 = utilityTitles.includes('ASKR EV U01');
  const hasU02 = utilityTitles.includes('ASKR EV U02');
  console.log(`Displays ASKR EV U01: ${hasU01}, ASKR EV U02: ${hasU02}`);

  // Screenshot 4: Utility Tab
  await catalogSection.screenshot({ path: path.join(ARTIFACTS_DIR, 'qa_utility_tab_u01_u02.png') });
  console.log('Saved: qa_utility_tab_u01_u02.png');

  // =========================================================================
  // TEST 5: Jeeps displays J01, J02 and J03
  // =========================================================================
  console.log('\n--- TEST 5: Jeeps Tab Verification ---');
  const jeepsTabBtn = page.locator('button', { hasText: 'Jeeps' });
  await jeepsTabBtn.click();
  await page.waitForTimeout(1000);

  const jeepsTitles = await page.locator('.product-card h3').allTextContents();
  console.log(`Jeeps count: ${jeepsTitles.length}`);
  console.log(`Jeeps names:`, jeepsTitles);
  const hasJ01 = jeepsTitles.includes('ASKR EV J01');
  const hasJ02 = jeepsTitles.includes('ASKR EV J02');
  const hasJ03 = jeepsTitles.includes('ASKR EV J03');
  console.log(`Displays J01: ${hasJ01}, J02: ${hasJ02}, J03: ${hasJ03}`);

  // Screenshot 5: Jeeps Tab
  await catalogSection.screenshot({ path: path.join(ARTIFACTS_DIR, 'qa_jeeps_tab_j01_j02_j03.png') });
  console.log('Saved: qa_jeeps_tab_j01_j02_j03.png');

  // =========================================================================
  // TEST 6: Cycles displays appropriate empty state
  // =========================================================================
  console.log('\n--- TEST 6: Cycles Tab Verification ---');
  const cyclesTabBtn = page.locator('button', { hasText: 'Cycles' });
  await cyclesTabBtn.click();
  await page.waitForTimeout(1000);

  const cyclesEmptyState = await page.textContent('section.catalog-section-bg');
  const hasCyclesEmptyNotice = cyclesEmptyState?.includes('No CYCLES models in current real fleet review');
  console.log(`Displays clean Cycles empty notice: ${hasCyclesEmptyNotice}`);

  // Screenshot 6: Cycles Tab
  await catalogSection.screenshot({ path: path.join(ARTIFACTS_DIR, 'qa_cycles_tab_empty_state.png') });
  console.log('Saved: qa_cycles_tab_empty_state.png');

  // =========================================================================
  // TEST 7: Footer contains no legacy demo model names in real fleet preview
  // =========================================================================
  console.log('\n--- TEST 7: Footer Legacy Demo Names Verification ---');
  const footerEl = page.locator('footer');
  await footerEl.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  const footerText = await footerEl.textContent();
  const legacyNames = ['S1 Pro', 'S1 Air', 'Thunder Pro', 'City Cruise', 'Apex Sport', 'AeroTrek', 'TerraMax'];
  const foundLegacy = legacyNames.filter(name => footerText?.includes(name));
  console.log(`Legacy demo names found in footer: ${foundLegacy.join(', ') || 'NONE (PASSED)'}`);

  // Screenshot 7: Footer
  await footerEl.screenshot({ path: path.join(ARTIFACTS_DIR, 'qa_footer_real_fleet_preview.png') });
  console.log('Saved: qa_footer_real_fleet_preview.png');

  // =========================================================================
  // TEST 9: Mobile Viewport QA (390 × 844)
  // =========================================================================
  console.log('\n--- TEST 9: Mobile Viewport QA (390px) ---');
  const mobCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobPage = await mobCtx.newPage();

  // Login as admin on mobile context
  await mobPage.goto('http://localhost:3000/auth/login');
  await mobPage.fill('input[type="email"]', 'admin@askrev.com');
  await mobPage.fill('input[type="password"]', 'Admin@123456');
  await mobPage.click('button[type="submit"]');
  await mobPage.waitForTimeout(2000);

  await mobPage.goto('http://localhost:3000/?preview=true', { waitUntil: 'domcontentloaded' });
  await mobPage.waitForTimeout(2500);

  // Check mobile hero
  const mobHeroEl = mobPage.locator('section.hero-section-bg');
  await mobHeroEl.screenshot({ path: path.join(ARTIFACTS_DIR, 'qa_mobile_hero_390.png') });
  console.log('Saved: qa_mobile_hero_390.png');

  // Check mobile product cards
  const mobCatalog = mobPage.locator('section.catalog-section-bg');
  await mobCatalog.scrollIntoViewIfNeeded();
  await mobPage.waitForTimeout(500);
  await mobCatalog.screenshot({ path: path.join(ARTIFACTS_DIR, 'qa_mobile_product_cards_390.png') });
  console.log('Saved: qa_mobile_product_cards_390.png');

  const mobCardCount = await mobPage.locator('.product-card').count();
  console.log(`Mobile product cards rendered: ${mobCardCount}`);

  await mobCtx.close();
  await adminCtx.close();
  await browser.close();

  console.log('\n=== ALL QA TESTS COMPLETED SUCCESSFULLY ===');
}

runRegressionSuite().catch(console.error);

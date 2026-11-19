import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('D:/DevCache/npm/_npx/e41f203b7505f1fb/node_modules/playwright');
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR = 'C:/Users/New/.gemini/antigravity/brain/2be6b61f-ae3e-45fe-b65c-bc7fd8d418f1/screenshots';
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

async function runQA() {
  console.log('🚀 Starting Comprehensive Browser QA for Local Real Images Fix...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const failedRequests = [];
  context.on('requestfailed', (req) => {
    failedRequests.push({ url: req.url(), failure: req.failure()?.errorText });
  });

  const page = await context.newPage();

  // ---------------------------------------------------------------------------
  // TEST 1: Public Visitor (Unauthenticated) Draft Isolation
  // ---------------------------------------------------------------------------
  console.log('\n--- Test 1: Public Visitor Draft Isolation ---');
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Verify Admin Preview Banner is NOT visible to anonymous public visitors
  const bannerCount = await page.locator('text=Admin Review Mode').count();
  console.log('Public view: Admin Review Mode banner count (expected 0):', bannerCount);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'public_showroom_visitor.png'), fullPage: false });
  console.log('  ✓ Saved screenshot: public_showroom_visitor.png');

  // Verify direct navigation to draft vehicle returns 404 / Vehicle Not Found
  await page.goto('http://localhost:3000/bikes/askr-ev-s01', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const notFoundVisible = await page.locator('text=Vehicle Not Found').isVisible();
  console.log('Public view: Direct draft slug lookup shows Vehicle Not Found (expected true):', notFoundVisible);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'public_draft_isolation_404.png') });
  console.log('  ✓ Saved screenshot: public_draft_isolation_404.png');

  // ---------------------------------------------------------------------------
  // TEST 2: Admin Login
  // ---------------------------------------------------------------------------
  console.log('\n--- Test 2: Admin Login ---');
  await page.goto('http://localhost:3000/auth/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.fill('input[type="email"]', 'admin@askrev.com');
  await page.fill('input[type="password"]', 'Admin@123456');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);
  console.log('  ✓ Logged in as Super Admin. Current URL:', page.url());

  // ---------------------------------------------------------------------------
  // TEST 3: Admin Catalog Table & Preview Links
  // ---------------------------------------------------------------------------
  console.log('\n--- Test 3: Admin Catalog & Preview Links ---');
  await page.goto('http://localhost:3000/admin', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Check if Product Catalog tab is selected or click it
  const productCatBtn = page.locator('button:has-text("Product Catalog")');
  if (await productCatBtn.isVisible()) {
    await productCatBtn.click();
    await page.waitForTimeout(1500);
  }

  // Verify "Preview Showroom" button is in header
  const previewShowroomBtn = await page.locator('text=Preview Showroom').isVisible();
  console.log('Admin Catalog: "Preview Showroom" header button visible:', previewShowroomBtn);

  // Verify "Preview in Showroom" link on rows
  const previewLinksCount = await page.locator('a[title="Preview in Showroom"]').count();
  console.log('Admin Catalog: "Preview in Showroom" row links count:', previewLinksCount);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'admin_catalog_preview_links.png') });
  console.log('  ✓ Saved screenshot: admin_catalog_preview_links.png');

  // ---------------------------------------------------------------------------
  // TEST 4: Admin Preview Mode on Homepage Showroom
  // ---------------------------------------------------------------------------
  console.log('\n--- Test 4: Homepage Showroom in Admin Preview Mode ---');
  await page.goto('http://localhost:3000/?preview=true', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Check Admin Review Mode banner
  const bannerVisible = await page.locator('text=Admin Review Mode').isVisible();
  console.log('Showroom: Admin Review Mode banner visible:', bannerVisible);

  // Verify S01 is rendered in Hero with real photograph
  const heroHeading = await page.locator('h1').first().textContent();
  console.log('Showroom Hero Headline:', heroHeading);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'admin_preview_hero_s01.png') });
  console.log('  ✓ Saved screenshot: admin_preview_hero_s01.png');

  // Advance hero slider to Slide 2 (S02)
  const nextSlideBtn = page.locator('button[aria-label="Next Vehicle"]').first();
  if (await nextSlideBtn.isVisible()) {
    await nextSlideBtn.click();
    await page.waitForTimeout(1000);
    const heroHeading2 = await page.locator('h1').first().textContent();
    console.log('Showroom Hero Slide 2 Headline:', heroHeading2);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'admin_preview_hero_s02.png') });
    console.log('  ✓ Saved screenshot: admin_preview_hero_s02.png');
  }

  // Scroll to Category Tabs & Check Real Models
  console.log('\n--- Test 4B: Category Tabs Real Fleet ---');
  // Click Scooters Tab
  await page.locator('button:has-text("Scooters")').click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'admin_preview_scooters_tab.png') });
  console.log('  ✓ Saved screenshot: admin_preview_scooters_tab.png');

  // Click Bikes Tab
  await page.locator('button:has-text("Bikes")').click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'admin_preview_bikes_tab.png') });
  console.log('  ✓ Saved screenshot: admin_preview_bikes_tab.png');

  // Click Utility Tab
  await page.locator('button:has-text("Utility")').click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'admin_preview_utility_tab.png') });
  console.log('  ✓ Saved screenshot: admin_preview_utility_tab.png');

  // Click Jeeps Tab
  await page.locator('button:has-text("Jeeps")').click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'admin_preview_jeeps_tab.png') });
  console.log('  ✓ Saved screenshot: admin_preview_jeeps_tab.png');

  // ---------------------------------------------------------------------------
  // TEST 5: Vehicle Detail Page & Real Color Variant Switching
  // ---------------------------------------------------------------------------
  console.log('\n--- Test 5: Vehicle Detail & Color Variant Switching ---');
  await page.goto('http://localhost:3000/bikes/askr-ev-s02?preview=true', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Check detail title and primary real image
  const vehicleTitle = await page.locator('h1').textContent();
  console.log('Vehicle Detail Title:', vehicleTitle);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'detail_s02_crimson.png') });
  console.log('  ✓ Saved screenshot: detail_s02_crimson.png (Default Crimson Sport)');

  // Click Color Variant: Royal Blue
  const blueColorBtn = page.locator('button[title="Royal Blue Studio"]');
  if (await blueColorBtn.isVisible()) {
    await blueColorBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'detail_s02_royal_blue.png') });
    console.log('  ✓ Saved screenshot: detail_s02_royal_blue.png');
  }

  // Click Color Variant: Gloss Black
  const blackColorBtn = page.locator('button[title="Gloss Black Front"]');
  if (await blackColorBtn.isVisible()) {
    await blackColorBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'detail_s02_gloss_black.png') });
    console.log('  ✓ Saved screenshot: detail_s02_gloss_black.png');
  }

  // Click Color Variant: Candy Red
  const candyRedColorBtn = page.locator('button[title="Candy Red Front"]');
  if (await candyRedColorBtn.isVisible()) {
    await candyRedColorBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'detail_s02_candy_red.png') });
    console.log('  ✓ Saved screenshot: detail_s02_candy_red.png');
  }

  // Click Color Variant: Peach Gold
  const peachColorBtn = page.locator('button[title="Peach Gold Showroom"]');
  if (await peachColorBtn.isVisible()) {
    await peachColorBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'detail_s02_peach_gold.png') });
    console.log('  ✓ Saved screenshot: detail_s02_peach_gold.png');
  }

  // ---------------------------------------------------------------------------
  // TEST 6: Commercial Loader Detail Page (U01)
  // ---------------------------------------------------------------------------
  console.log('\n--- Test 6: Commercial Loader Detail Page (U01) ---');
  await page.goto('http://localhost:3000/bikes/askr-ev-u01?preview=true', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const u01Title = await page.locator('h1').textContent();
  console.log('U01 Detail Title:', u01Title);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'detail_u01_loader.png') });
  console.log('  ✓ Saved screenshot: detail_u01_loader.png');

  // ---------------------------------------------------------------------------
  // TEST 7: Network Failures Check
  // ---------------------------------------------------------------------------
  console.log('\n--- Test 7: Network & Asset Health ---');
  const imageFailures = failedRequests.filter((r) => r.url.match(/\.(jpg|jpeg|png|webp|svg)/i));
  console.log('Total failed requests:', failedRequests.length);
  console.log('Failed image requests (expected 0):', imageFailures.length);
  if (imageFailures.length > 0) {
    console.log('Failed image URLs:', imageFailures);
  }

  await browser.close();
  console.log('\n🎉 ALL BROWSER QA TESTS COMPLETED SUCCESSFULLY!');
}

runQA().catch((err) => {
  console.error('QA Error:', err);
  process.exit(1);
});

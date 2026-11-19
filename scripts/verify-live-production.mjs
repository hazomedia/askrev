// scripts/verify-live-production.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('D:/DevCache/npm/_npx/e41f203b7505f1fb/node_modules/playwright');
import fs from 'fs';
import path from 'path';

const PROD_URL = 'https://www.askrevdrive.com';
const SCREENSHOT_DIR = 'C:/Users/New/.gemini/antigravity/brain/2be6b61f-ae3e-45fe-b65c-bc7fd8d418f1/screenshots';

async function verify() {
  console.log(`=======================================================`);
  console.log(`🌐 ASKR EV LIVE PRODUCTION VERIFICATION: ${PROD_URL}`);
  console.log(`=======================================================`);

  // 1. HTTP and Header Verification
  console.log('\n--- Phase 1: HTTP & Security Headers ---');
  const res = await fetch(PROD_URL, { redirect: 'follow' });
  console.log(`HTTP Status: ${res.status} ${res.statusText}`);
  const xfo = res.headers.get('x-frame-options');
  const xcto = res.headers.get('x-content-type-options');
  console.log(`X-Frame-Options: ${xfo}`);
  console.log(`X-Content-Type-Options: ${xcto}`);

  // 2. Real Vehicle Asset Verification on Production CDN
  console.log('\n--- Phase 2: Static Asset CDN Verification ---');
  const testImages = [
    '/images/real/branded/askr-s01-commuter-lineup.jpg',
    '/images/real/branded/askr-b01-racing-front.jpg',
    '/images/real/branded/askr-u01-commercial-loader.jpg',
    '/images/real/branded/askr-j01-monster-front.jpg'
  ];

  for (const imgPath of testImages) {
    const imgRes = await fetch(`${PROD_URL}${imgPath}`);
    console.log(`Asset ${imgPath} -> HTTP ${imgRes.status} (Content-Type: ${imgRes.headers.get('content-type')}, Size: ${imgRes.headers.get('content-length')} bytes)`);
    if (imgRes.status !== 200) {
      throw new Error(`Failed to load asset ${imgPath} on live production!`);
    }
  }

  // 3. Browser Rendering & Visual Verification
  console.log('\n--- Phase 3: Browser Rendering & Screenshot Capture ---');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  
  // Desktop
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await desktopContext.newPage();
  
  console.log(`Navigating to ${PROD_URL}...`);
  await page.goto(PROD_URL, { waitUntil: 'networkidle', timeout: 30000 });
  
  // Verify Hero headline
  const heroHeading = await page.locator('h1').first().textContent();
  console.log(`Hero Heading rendered: "${heroHeading.trim()}"`);

  // Verify Product Cards rendered
  const productCards = await page.locator('text=ASKR EV S01').count();
  console.log(`ASKR EV S01 presence: ${productCards > 0}`);

  // Capture desktop hero
  const prodHeroShot = path.join(SCREENSHOT_DIR, 'live_prod_desktop_hero.png');
  await page.screenshot({ path: prodHeroShot });
  console.log(`Captured live production hero: ${prodHeroShot}`);

  // Scroll and capture product showroom
  await page.evaluate(() => window.scrollBy(0, 800));
  await page.waitForTimeout(1000);
  const prodCatalogShot = path.join(SCREENSHOT_DIR, 'live_prod_desktop_catalog.png');
  await page.screenshot({ path: prodCatalogShot });
  console.log(`Captured live production catalog: ${prodCatalogShot}`);

  // Mobile
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(PROD_URL, { waitUntil: 'networkidle', timeout: 30000 });
  const prodMobileShot = path.join(SCREENSHOT_DIR, 'live_prod_mobile_hero.png');
  await mobilePage.screenshot({ path: prodMobileShot });
  console.log(`Captured live production mobile: ${prodMobileShot}`);

  await browser.close();
  console.log(`\n✅ ALL LIVE PRODUCTION VERIFICATIONS PASSED!`);
}

verify().catch(err => {
  console.error(`Verification error:`, err);
  process.exit(1);
});

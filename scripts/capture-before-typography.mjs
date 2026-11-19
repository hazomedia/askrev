import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('D:/DevCache/npm/_npx/e41f203b7505f1fb/node_modules/playwright');
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = 'C:/Users/New/.gemini/antigravity/brain/2be6b61f-ae3e-45fe-b65c-bc7fd8d418f1/screenshots';
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function captureBefore() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  // 1. Desktop 1440px
  const desktopCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const desktopPage = await desktopCtx.newPage();
  await desktopPage.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await desktopPage.waitForTimeout(2000);

  // Hero section screenshot
  const heroEl = desktopPage.locator('section.hero-section-bg');
  await heroEl.screenshot({ path: path.join(SCREENSHOTS_DIR, 'before_hero_desktop_1440.png') });
  console.log('Captured: before_hero_desktop_1440.png');

  // Product cards section screenshot
  const catalogEl = desktopPage.locator('section.catalog-section-bg');
  if (await catalogEl.count() > 0) {
    await catalogEl.scrollIntoViewIfNeeded();
    await desktopPage.waitForTimeout(1000);
    await catalogEl.screenshot({ path: path.join(SCREENSHOTS_DIR, 'before_product_cards_desktop_1440.png') });
    console.log('Captured: before_product_cards_desktop_1440.png');
  }

  // 2. Mobile 390px
  const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobilePage = await mobileCtx.newPage();
  await mobilePage.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await mobilePage.waitForTimeout(2000);

  const mobHeroEl = mobilePage.locator('section.hero-section-bg');
  await mobHeroEl.screenshot({ path: path.join(SCREENSHOTS_DIR, 'before_hero_mobile_390.png') });
  console.log('Captured: before_hero_mobile_390.png');

  const mobCatalogEl = mobilePage.locator('section.catalog-section-bg');
  if (await mobCatalogEl.count() > 0) {
    await mobCatalogEl.scrollIntoViewIfNeeded();
    await mobilePage.waitForTimeout(1000);
    await mobCatalogEl.screenshot({ path: path.join(SCREENSHOTS_DIR, 'before_product_cards_mobile_390.png') });
    console.log('Captured: before_product_cards_mobile_390.png');
  }

  await browser.close();
  console.log('Finished capturing BEFORE screenshots.');
}

captureBefore().catch(console.error);

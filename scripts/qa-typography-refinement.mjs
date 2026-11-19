import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('D:/DevCache/npm/_npx/e41f203b7505f1fb/node_modules/playwright');
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = 'C:/Users/New/.gemini/antigravity/brain/2be6b61f-ae3e-45fe-b65c-bc7fd8d418f1/screenshots';
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: 'desktop_1440', width: 1440, height: 900 },
  { name: 'laptop_1024', width: 1024, height: 768 },
  { name: 'tablet_768', width: 768, height: 1024 },
  { name: 'mobile_390', width: 390, height: 844 },
  { name: 'small_360', width: 360, height: 740 }
];

async function runQA() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = {};

  for (const vp of VIEWPORTS) {
    console.log(`\nTesting Viewport: ${vp.name} (${vp.width}x${vp.height})...`);
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    // 1. Hero Screenshot
    const heroEl = page.locator('section.hero-section-bg');
    if (await heroEl.count() > 0) {
      await heroEl.screenshot({ path: path.join(SCREENSHOTS_DIR, `after_hero_${vp.name}.png`) });
      console.log(`Saved: after_hero_${vp.name}.png`);
    }

    // 2. Product Cards Screenshot
    const catalogEl = page.locator('section.catalog-section-bg');
    if (await catalogEl.count() > 0) {
      await catalogEl.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
      await catalogEl.screenshot({ path: path.join(SCREENSHOTS_DIR, `after_product_cards_${vp.name}.png`) });
      console.log(`Saved: after_product_cards_${vp.name}.png`);
    }

    // 3. Extract Computed Font Sizes for verification
    const metrics = await page.evaluate((isMobile) => {
      const getFontSize = (selector) => {
        const el = document.querySelector(selector);
        return el ? window.getComputedStyle(el).fontSize : null;
      };
      const getLineHeight = (selector) => {
        const el = document.querySelector(selector);
        return el ? window.getComputedStyle(el).lineHeight : null;
      };

      // Depending on mobile vs desktop hero layout:
      // Mobile block is .md\\:hidden, desktop is .hidden.md\\:grid
      const heroHeadingSel = isMobile
        ? '.md\\:hidden h1'
        : '.hidden.md\\:grid h1';

      return {
        heroHeadingFontSize: getFontSize(heroHeadingSel),
        heroHeadingLineHeight: getLineHeight(heroHeadingSel),
        cardNameFontSize: getFontSize('section.catalog-section-bg h3 a, section.catalog-section-bg h3 span'),
        cardPriceFontSize: getFontSize('section.catalog-section-bg span.text-\\[17px\\], section.catalog-section-bg span.font-black'),
        sectionBrowseHeading: getFontSize('section.catalog-section-bg h3'),
        sectionEngineeringHeading: getFontSize('section.engineering-section-bg h2'),
        sectionCtaHeading: getFontSize('section.action-banner-bg h2')
      };
    }, vp.width < 768);

    results[vp.name] = metrics;
    console.log(`Metrics for ${vp.name}:`, metrics);
    await ctx.close();
  }

  // Also check Admin Hero Slider view
  console.log('\nChecking Admin Hero Slider view at /admin...');
  const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const adminPage = await adminCtx.newPage();
  await adminPage.goto('http://localhost:3000/admin', { waitUntil: 'domcontentloaded' });
  await adminPage.waitForTimeout(2000);
  await adminPage.screenshot({ path: path.join(SCREENSHOTS_DIR, 'admin_hero_slider_typography_check.png') });
  console.log('Saved: admin_hero_slider_typography_check.png');
  await adminCtx.close();

  await browser.close();

  fs.writeFileSync(
    path.join(SCREENSHOTS_DIR, 'computed_typography_metrics.json'),
    JSON.stringify(results, null, 2)
  );
  console.log('Finished QA verification successfully.');
}

runQA().catch(console.error);

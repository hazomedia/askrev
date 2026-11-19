import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('D:/DevCache/npm/_npx/e41f203b7505f1fb/node_modules/playwright');

async function capture() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();

  // Login
  await page.goto('http://localhost:3000/auth/login');
  await page.fill('input[type="email"]', 'admin@askrev.com');
  await page.fill('input[type="password"]', 'Admin@123456');
  await page.click('button[type="submit"]');

  await page.waitForURL('**/admin', { timeout: 10000 });
  await page.waitForTimeout(2000);

  // Switch to Product Catalog
  await page.locator('button', { hasText: 'Product Catalog' }).first().click();
  await page.waitForTimeout(2000);

  // Filter by Draft status to see all 12 rebranded models
  const statusFilter = page.locator('select').nth(1); // Second select is Status
  if (await statusFilter.count() > 0) {
    await statusFilter.selectOption('DRAFT');
    await page.waitForTimeout(1500);
  }

  // Capture table screenshot
  await page.screenshot({
    path: 'C:/Users/New/.gemini/antigravity/brain/2be6b61f-ae3e-45fe-b65c-bc7fd8d418f1/screenshots/admin_catalog_rebranded_fleet.png',
    fullPage: false,
  });

  console.log('✓ Captured admin_catalog_rebranded_fleet.png with DRAFT filter showing rebranded models');
  await browser.close();
}

capture().catch(console.error);

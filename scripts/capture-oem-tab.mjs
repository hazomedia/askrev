import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('D:/DevCache/npm/_npx/e41f203b7505f1fb/node_modules/playwright');

async function capture() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();

  // 1. Login
  await page.goto('http://localhost:3000/auth/login');
  await page.fill('input[type="email"]', 'admin@askrev.com');
  await page.fill('input[type="password"]', 'Admin@123456');
  await page.click('button[type="submit"]');

  await page.waitForURL('**/admin', { timeout: 10000 });
  await page.waitForTimeout(2000);

  // Switch to Product Catalog
  await page.locator('button', { hasText: 'Product Catalog' }).first().click();
  await page.waitForTimeout(2000);

  // Click Edit on ASKR EV S01
  const s01Row = page.locator('tr', { hasText: 'ASKR EV S01' }).first();
  const editBtn = s01Row.locator('button[title="Edit Vehicle Model"]');
  await editBtn.click();
  await page.waitForTimeout(1500);

  // Click OEM Traceability Tab
  await page.locator('button', { hasText: '6. OEM Traceability' }).click();
  await page.waitForTimeout(1000);

  // Capture OEM Traceability tab screenshot
  await page.screenshot({
    path: 'C:/Users/New/.gemini/antigravity/brain/2be6b61f-ae3e-45fe-b65c-bc7fd8d418f1/screenshots/admin_oem_traceability_tab.png',
    fullPage: false,
  });

  console.log('✓ Captured admin_oem_traceability_tab.png');
  await browser.close();
}

capture().catch(console.error);

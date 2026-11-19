import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('D:/DevCache/npm/_npx/e41f203b7505f1fb/node_modules/playwright');

async function captureAdminScreenshots() {
  console.log('Launching browser to capture Admin Product Catalog screenshots...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 950 },
  });

  const page = await context.newPage();

  try {
    // 1. Login
    console.log('Navigating to login page...');
    await page.goto('http://localhost:3000/auth/login');
    await page.waitForLoadState('networkidle');

    await page.fill('input[type="email"]', 'admin@askrev.com');
    await page.fill('input[type="password"]', 'Admin@123456');
    await page.click('button[type="submit"]');

    // Wait for redirect to /admin
    console.log('Waiting for admin dashboard navigation...');
    await page.waitForURL('**/admin', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Switch to Product Catalog tab
    console.log('Clicking Product Catalog sidebar tab...');
    await page.locator('button', { hasText: 'Product Catalog' }).click();
    await page.waitForTimeout(2000);

    // 2. Capture Admin Catalog Table View
    console.log('Capturing admin catalog table view...');
    await page.screenshot({
      path: 'C:/Users/New/.gemini/antigravity/brain/2be6b61f-ae3e-45fe-b65c-bc7fd8d418f1/screenshots/admin_product_catalog_real_vehicles.png',
      fullPage: false,
    });

    // 3. Filter by Utility Category
    console.log('Testing category filter: Utility...');
    const utilityBtn = page.locator('button', { hasText: 'Utility' }).first();
    if (await utilityBtn.isVisible()) {
      await utilityBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({
        path: 'C:/Users/New/.gemini/antigravity/brain/2be6b61f-ae3e-45fe-b65c-bc7fd8d418f1/screenshots/admin_catalog_utility_filter.png',
        fullPage: false,
      });
    }

    // 4. Click Edit on Harsil 3W Commercial Loader
    console.log('Opening Edit modal for Harsil 3W Commercial Loader...');
    const loaderRow = page.locator('tr', { hasText: 'Harsil 3W Commercial Loader' }).first();
    const editBtn = loaderRow.locator('button[title="Edit Vehicle Model"]');
    await editBtn.click();
    await page.waitForTimeout(1500);

    // 5. Click Colors & Variants tab
    console.log('Viewing Colors & Variants tab...');
    const colorsTab = page.locator('button', { hasText: /Colors & Variants/i });
    await colorsTab.click();
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: 'C:/Users/New/.gemini/antigravity/brain/2be6b61f-ae3e-45fe-b65c-bc7fd8d418f1/screenshots/admin_modal_variants_tab.png',
      fullPage: false,
    });

    // 6. Click Hero Placement tab
    console.log('Viewing Hero Placement tab...');
    const heroTab = page.locator('button', { hasText: /Hero Placement/i });
    await heroTab.click();
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: 'C:/Users/New/.gemini/antigravity/brain/2be6b61f-ae3e-45fe-b65c-bc7fd8d418f1/screenshots/admin_modal_hero_tab.png',
      fullPage: false,
    });

    console.log('\nAll Admin screenshots captured successfully!');

    console.log('\nAll Admin screenshots captured successfully!');
  } catch (err) {
    console.error('Screenshot capture error:', err);
  } finally {
    await browser.close();
  }
}

captureAdminScreenshots().catch(console.error);

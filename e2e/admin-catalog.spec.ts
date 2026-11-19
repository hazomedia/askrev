import { test, expect } from '@playwright/test';

test.use({
  channel: 'chrome',
  viewport: { width: 1440, height: 950 },
});

test('Capture Admin Catalog and Real Vehicle Variant Management', async ({ page }) => {
  // 1. Login as Super Admin
  await page.goto('http://localhost:3000/auth/login');
  await page.waitForLoadState('networkidle');

  await page.fill('input[type="email"]', 'admin@askrev.com');
  await page.fill('input[type="password"]', 'Admin@123456');
  await page.click('button[type="submit"]');

  // Wait for redirect to /admin
  await page.waitForURL('**/admin', { timeout: 10000 });
  await page.waitForTimeout(2000);

  // 2. Capture Admin Catalog Table View
  await page.screenshot({
    path: 'C:/Users/New/.gemini/antigravity/brain/2be6b61f-ae3e-45fe-b65c-bc7fd8d418f1/screenshots/admin_product_catalog_real_vehicles.png',
    fullPage: false,
  });

  // 3. Filter by Utility Category
  const utilityTab = page.locator('button', { hasText: /^Utility/i });
  if (await utilityTab.isVisible()) {
    await utilityTab.click();
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: 'C:/Users/New/.gemini/antigravity/brain/2be6b61f-ae3e-45fe-b65c-bc7fd8d418f1/screenshots/admin_catalog_utility_filter.png',
      fullPage: false,
    });
  }

  // 4. Reset filter to All
  const allTab = page.locator('button', { hasText: /^All Categories/i });
  if (await allTab.isVisible()) {
    await allTab.click();
    await page.waitForTimeout(1000);
  }

  // 5. Find Harsil Leo row and click Edit
  const leoRow = page.locator('tr', { hasText: 'Harsil Leo' }).first();
  await expect(leoRow).toBeVisible();

  const editBtn = leoRow.locator('button[title="Edit Vehicle Details"]');
  await editBtn.click();
  await page.waitForTimeout(1500);

  // 6. Click "Colors & Variants" tab in modal
  const colorsTab = page.locator('button', { hasText: /Colors & Variants/i });
  await colorsTab.click();
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: 'C:/Users/New/.gemini/antigravity/brain/2be6b61f-ae3e-45fe-b65c-bc7fd8d418f1/screenshots/admin_modal_variants_tab.png',
    fullPage: false,
  });

  // 7. Click "Hero Placement" tab in modal
  const heroTab = page.locator('button', { hasText: /Hero Placement/i });
  await heroTab.click();
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: 'C:/Users/New/.gemini/antigravity/brain/2be6b61f-ae3e-45fe-b65c-bc7fd8d418f1/screenshots/admin_modal_hero_tab.png',
    fullPage: false,
  });
});

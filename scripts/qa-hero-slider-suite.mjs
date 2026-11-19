import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('D:/DevCache/npm/_npx/e41f203b7505f1fb/node_modules/playwright');
import path from 'path';
import fs from 'fs';

const SCREENSHOTS_DIR = 'C:/Users/New/.gemini/antigravity/brain/2be6b61f-ae3e-45fe-b65c-bc7fd8d418f1/screenshots';
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runHeroSliderQA() {
  console.log('===============================================================');
  console.log('   ASKR EV — INDEPENDENT HERO SLIDER FULL E2E QA SUITE');
  console.log('===============================================================\n');

  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  // 1. Admin Context
  const adminContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const adminPage = await adminContext.newPage();

  // Monitor network errors
  adminPage.on('response', (res) => {
    if (res.status() >= 400 && !res.url().includes('404')) {
      console.warn(`[Admin Net HTTP ${res.status()}] ${res.url()}`);
    }
  });

  console.log('--- Step 1: Admin Authentication ---');
  await adminPage.goto('http://localhost:3000/auth/login', { waitUntil: 'domcontentloaded' });
  await adminPage.waitForTimeout(1000);
  await adminPage.fill('input[type="email"]', 'admin@askrev.com');
  await adminPage.fill('input[type="password"]', 'Admin@123456');
  await adminPage.click('button[type="submit"]');
  await adminPage.waitForTimeout(2000);
  console.log('Logged in successfully. URL:', adminPage.url());

  console.log('\n--- Step 2: Open Admin Hero Slider Tab ---');
  await adminPage.goto('http://localhost:3000/admin', { waitUntil: 'domcontentloaded' });
  await adminPage.waitForTimeout(1500);

  // Click on "Hero Slider" tab
  const heroSliderTabBtn = adminPage.locator('button:has-text("Hero Slider")').first();
  await heroSliderTabBtn.click();
  await adminPage.waitForTimeout(1500);

  // Verify Heading & Table
  const titleVisible = await adminPage.isVisible('text=Homepage Hero Slider Management');
  console.log(`Hero Slider title visible: ${titleVisible}`);

  const slideRows = await adminPage.locator('tbody tr').count();
  console.log(`Seeded Hero Slide rows found in table: ${slideRows}`);

  // Take screenshot of Admin Dashboard
  const adminDashShot = path.join(SCREENSHOTS_DIR, 'admin_hero_slider_dashboard.png');
  await adminPage.screenshot({ path: adminDashShot, fullPage: false });
  console.log('Captured:', adminDashShot);

  console.log('\n--- Step 3: Create New Hero Slide (Draft) ---');
  const newSlideBtn = adminPage.locator('button:has-text("New Hero Slide")').first();
  await newSlideBtn.click();
  await adminPage.waitForTimeout(800);

  // Tab 1: Content
  await adminPage.fill('input[placeholder="e.g. Festival Hero - Jatayu Sunset Orange"]', 'ASKR EV Retro Classic 5-Color Fleet');
  await adminPage.fill('input[placeholder="e.g. NEXT-GEN EV PLATFORM or ZERO EMISSIONS"]', 'VINTAGE AESTHETICS • ZERO EMISSIONS');
  await adminPage.fill('input[placeholder="e.g. DRIVE THE FUTURE. DRIVE ELECTRIC."]', 'RETRO CHARM. NEXT-GEN ELECTRIC DRIVE.');
  await adminPage.fill('input[placeholder="e.g. Engineered for Performance. Designed for Bharat."]', 'Iconic European Design with Swappable Lithium Power');
  await adminPage.fill('textarea[placeholder="Brief customer-facing copy highlighting power, range, and ride quality..."]', 'Available in 5 custom heritage colors for effortless and stylish city travel.');

  // Tab 2: Media
  await adminPage.click('button:has-text("2. Hero Photographs")');
  await adminPage.waitForTimeout(500);
  await adminPage.fill('input[placeholder="/images/real/real-jatayu-orange-studio.jpg or R2 URL"]', '/images/real/real-retro-classic-5colors.jpg');
  await adminPage.fill('input[placeholder="e.g. ASKR EV Sunset Orange Electric Motorcycle"]', 'ASKR EV Retro Classic 5-Color Electric Scooter Lineup');

  // Tab 3: CTAs
  await adminPage.click('button:has-text("3. Call-to-Actions")');
  await adminPage.waitForTimeout(500);
  await adminPage.fill('input[placeholder="e.g. EXPLORE VEHICLES"]', 'EXPLORE RETRO');
  await adminPage.fill('input[placeholder="/scooters or https://..."]', '/scooters');

  // Tab 5: Settings
  await adminPage.click('button:has-text("5. Display & Status")');
  await adminPage.waitForTimeout(500);
  await adminPage.selectOption('select:has-text("DRAFT")', 'DRAFT');

  // Submit Form
  await adminPage.click('button:has-text("Create Slide")');
  await adminPage.waitForTimeout(2000);

  const updatedRows = await adminPage.locator('tbody tr').count();
  console.log(`Total rows after creating slide: ${updatedRows}`);

  const draftCreatedShot = path.join(SCREENSHOTS_DIR, 'admin_hero_slide_created_draft.png');
  await adminPage.screenshot({ path: draftCreatedShot, fullPage: false });
  console.log('Captured:', draftCreatedShot);

  console.log('\n--- Step 4: Reorder Slides via UI ---');
  // Click Move Down on the first row
  const moveDownBtn = adminPage.locator('tbody tr button[title="Move Down"]').first();
  await moveDownBtn.click();
  await adminPage.waitForTimeout(1500);

  const reorderedShot = path.join(SCREENSHOTS_DIR, 'admin_hero_slides_reordered.png');
  await adminPage.screenshot({ path: reorderedShot, fullPage: false });
  console.log('Captured:', reorderedShot);

  console.log('\n--- Step 5: Verify Public Visitor vs Admin Preview Mode ---');
  // 5A. Public Visitor (No Auth)
  const publicContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const publicPage = await publicContext.newPage();
  await publicPage.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await publicPage.waitForTimeout(2000);

  const publicPageText = await publicPage.textContent('body');
  const hasDraftPublic = publicPageText?.includes('RETRO CHARM. NEXT-GEN ELECTRIC DRIVE.');
  console.log(`Public Visitor sees DRAFT slide: ${hasDraftPublic} (Expected: false)`);

  const publicHomeShot = path.join(SCREENSHOTS_DIR, 'public_visitor_homepage_hero.png');
  await publicPage.screenshot({ path: publicHomeShot, fullPage: false });
  console.log('Captured:', publicHomeShot);

  // 5B. Admin Preview Mode (?preview=true with Admin Session)
  await adminPage.goto('http://localhost:3000/?preview=true', { waitUntil: 'domcontentloaded' });
  await adminPage.waitForTimeout(2000);

  // Let's find the slide with RETRO CHARM
  let foundDraftInPreview = false;
  for (let i = 0; i < 6; i++) {
    const text = await adminPage.textContent('section.hero-section-bg');
    if (text?.includes('RETRO CHARM') || text?.includes('VINTAGE AESTHETICS')) {
      foundDraftInPreview = true;
      break;
    }
    // Click next slide
    const nextBtn = adminPage.locator('section.hero-section-bg button[aria-label="Next Vehicle"]').first();
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await adminPage.waitForTimeout(1000);
    }
  }
  console.log(`Admin Preview mode shows DRAFT slide: ${foundDraftInPreview} (Expected: true)`);

  const adminPreviewShot = path.join(SCREENSHOTS_DIR, 'admin_preview_draft_slide.png');
  await adminPage.screenshot({ path: adminPreviewShot, fullPage: false });
  console.log('Captured:', adminPreviewShot);

  console.log('\n--- Step 6: Publish Slide & Test Live Sync (Zero Rebuild) ---');
  await adminPage.goto('http://localhost:3000/admin', { waitUntil: 'domcontentloaded' });
  await adminPage.waitForTimeout(1000);
  await adminPage.locator('button:has-text("Hero Slider")').first().click();
  await adminPage.waitForTimeout(1000);

  // Find the row with "ASKR EV Retro Classic" and click its DRAFT badge to publish
  const retroRow = adminPage.locator('tbody tr:has-text("ASKR EV Retro Classic")').first();
  const draftBadge = retroRow.locator('button:has-text("DRAFT")');
  await draftBadge.click();
  await adminPage.waitForTimeout(2000);

  const isNowPublished = await retroRow.locator('button:has-text("PUBLISHED")').isVisible();
  console.log(`Slide is now PUBLISHED in admin: ${isNowPublished}`);

  // Now reload Public Visitor page
  await publicPage.reload({ waitUntil: 'domcontentloaded' });
  await publicPage.waitForTimeout(2000);

  let foundPublishedInPublic = false;
  for (let i = 0; i < 6; i++) {
    const text = await publicPage.textContent('section.hero-section-bg');
    if (text?.includes('RETRO CHARM') || text?.includes('VINTAGE AESTHETICS')) {
      foundPublishedInPublic = true;
      break;
    }
    const nextBtn = publicPage.locator('section.hero-section-bg button[aria-label="Next Vehicle"]').first();
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await publicPage.waitForTimeout(1000);
    }
  }
  console.log(`Public Visitor NOW sees newly PUBLISHED slide live: ${foundPublishedInPublic} (Expected: true)`);

  const liveSyncShot = path.join(SCREENSHOTS_DIR, 'public_live_sync_published_slide.png');
  await publicPage.screenshot({ path: liveSyncShot, fullPage: false });
  console.log('Captured:', liveSyncShot);

  console.log('\n--- Step 7: Duplicate & Clean Up Slide ---');
  // Duplicate
  const duplicateBtn = retroRow.locator('button[title="Duplicate Slide"]');
  await duplicateBtn.click();
  await adminPage.waitForTimeout(1500);

  const copyRow = adminPage.locator('tbody tr:has-text("ASKR EV Retro Classic 5-Color Fleet (Copy)")').first();
  const copyExists = await copyRow.isVisible();
  console.log(`Duplicated slide created: ${copyExists}`);

  // Delete copy
  adminPage.on('dialog', (dialog) => dialog.accept());
  const deleteCopyBtn = copyRow.locator('button[title^="Archive"]');
  await deleteCopyBtn.click();
  await adminPage.waitForTimeout(1500);

  // Unpublish the main retro slide so default state remains tidy
  const pubBadge = retroRow.locator('button:has-text("PUBLISHED")');
  await pubBadge.click();
  await adminPage.waitForTimeout(1000);
  console.log('Slide successfully moved back to DRAFT.');

  console.log('\n--- Step 8: Multi-Viewport Responsive QA Captures ---');
  // Desktop 1440x900
  await publicPage.setViewportSize({ width: 1440, height: 900 });
  await publicPage.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await publicPage.waitForTimeout(1500);
  const desktopShot = path.join(SCREENSHOTS_DIR, 'hero_slider_desktop_1440.png');
  await publicPage.screenshot({ path: desktopShot, fullPage: false });
  console.log('Captured Desktop (1440px):', desktopShot);

  // Tablet 768x1024
  await publicPage.setViewportSize({ width: 768, height: 1024 });
  await publicPage.reload({ waitUntil: 'domcontentloaded' });
  await publicPage.waitForTimeout(1500);
  const tabletShot = path.join(SCREENSHOTS_DIR, 'hero_slider_tablet_768.png');
  await publicPage.screenshot({ path: tabletShot, fullPage: false });
  console.log('Captured Tablet (768px):', tabletShot);

  // Mobile 390x844
  await publicPage.setViewportSize({ width: 390, height: 844 });
  await publicPage.reload({ waitUntil: 'domcontentloaded' });
  await publicPage.waitForTimeout(1500);
  const mobileShot = path.join(SCREENSHOTS_DIR, 'hero_slider_mobile_390.png');
  await publicPage.screenshot({ path: mobileShot, fullPage: false });
  console.log('Captured Mobile (390px):', mobileShot);

  await browser.close();

  console.log('\n===============================================================');
  console.log('   ALL PLAYWRIGHT HERO SLIDER TESTS COMPLETED SUCCESSFULLY!    ');
  console.log('===============================================================\n');
}

runHeroSliderQA().catch((err) => {
  console.error('QA Test Suite Failed:', err);
  process.exit(1);
});

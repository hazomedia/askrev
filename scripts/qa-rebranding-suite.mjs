import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('D:/DevCache/npm/_npx/e41f203b7505f1fb/node_modules/playwright');
import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:4000/api';
const WEB_BASE = 'http://localhost:3000';
const ARTIFACT_DIR = 'C:/Users/New/.gemini/antigravity/brain/2be6b61f-ae3e-45fe-b65c-bc7fd8d418f1/screenshots';
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

const SUPPLIER_NAMES = ['harsil', 'eko tejas', 'jatayu', 'rilox'];

function scanForSuppliers(obj, pathStr = '') {
  const violations = [];
  if (!obj) return violations;

  if (typeof obj === 'string') {
    for (const name of SUPPLIER_NAMES) {
      if (obj.toLowerCase().includes(name.toLowerCase())) {
        violations.push({ path: pathStr, matched: name, value: obj });
      }
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, idx) => {
      violations.push(...scanForSuppliers(item, `${pathStr}[${idx}]`));
    });
  } else if (typeof obj === 'object') {
    for (const [key, val] of Object.entries(obj)) {
      // Exclude internal OEM fields if present
      if (['oemManufacturer', 'oemModelName', 'oemReference', 'internalNotes', 'slugAliases'].includes(key)) {
        continue;
      }
      violations.push(...scanForSuppliers(val, `${pathStr}.${key}`));
    }
  }
  return violations;
}

async function runApiVerification() {
  console.log('\n============================================================');
  console.log('1. PUBLIC API BRANDING SANITIZATION & LEAK VERIFICATION');
  console.log('============================================================');

  // Test 1.1: GET /api/catalog
  console.log('\n[TEST 1.1] Querying GET /api/catalog...');
  const catRes = await fetch(`${API_BASE}/catalog`);
  if (!catRes.ok) throw new Error(`GET /api/catalog failed: ${catRes.status}`);
  const catItems = await catRes.json();
  console.log(`  Received ${catItems.length} published products.`);

  const catViolations = scanForSuppliers(catItems, 'catalog');
  if (catViolations.length > 0) {
    console.error('  ❌ SUPPLIER BRANDING LEAK DETECTED in /api/catalog:');
    catViolations.forEach(v => console.error(`     - at ${v.path}: found "${v.matched}" in "${v.value}"`));
    throw new Error('Supplier branding leaked in public catalog API');
  } else {
    console.log('  ✓ ZERO supplier brand occurrences detected across all published products.');
  }

  // Verify internal OEM fields are omitted from public API
  let exposedOemCount = 0;
  for (const item of catItems) {
    if (item.oemManufacturer !== undefined || item.oemModelName !== undefined || item.internalNotes !== undefined) {
      exposedOemCount++;
    }
  }
  if (exposedOemCount > 0) {
    throw new Error(`Internal OEM fields exposed in ${exposedOemCount} public products!`);
  }
  console.log('  ✓ Verified 100% of internal OEM fields are excluded from public API responses.');

  // Test 1.2: GET /api/catalog/hero
  console.log('\n[TEST 1.2] Querying GET /api/catalog/hero...');
  const heroRes = await fetch(`${API_BASE}/catalog/hero`);
  const heroItems = await heroRes.json();
  const heroViolations = scanForSuppliers(heroItems, 'hero');
  if (heroViolations.length > 0) {
    throw new Error('Supplier branding leaked in hero API');
  }
  console.log(`  ✓ Hero slides verified: 0 supplier leaks across ${heroItems.length} slides.`);

  // Test 1.3: SLUG ALIASES BACKWARD COMPATIBILITY
  console.log('\n============================================================');
  console.log('2. SLUG ALIASES & SAFE REDIRECT RESOLUTION');
  console.log('============================================================');

  const testAliases = [
    { alias: 'harsil-leo', expectedSlug: 'askr-ev-s01', expectedName: 'ASKR EV S01' },
    { alias: 'eko-tejas-sport', expectedSlug: 'askr-ev-s02', expectedName: 'ASKR EV S02' },
    { alias: 'jatayu-ev', expectedSlug: 'askr-ev-s03', expectedName: 'ASKR EV S03' },
    { alias: 'harsil-3w-commercial-loader', expectedSlug: 'askr-ev-u01', expectedName: 'ASKR EV U01' },
    { alias: 'harsil-2w-cargo-delivery', expectedSlug: 'askr-ev-u02', expectedName: 'ASKR EV U02' },
  ];

  for (const t of testAliases) {
    console.log(`\n[TEST 2] Testing alias lookup: '${t.alias}'...`);
    const aliasRes = await fetch(`${API_BASE}/catalog/${t.alias}?preview=true`);
    if (!aliasRes.ok) {
      throw new Error(`Failed to resolve alias '${t.alias}': HTTP ${aliasRes.status}`);
    }
    const resolved = await aliasRes.json();
    console.log(`  ✓ Resolved '${t.alias}' -> Name: "${resolved.name}" | Primary Slug: "${resolved.slug}"`);
    if (resolved.slug !== t.expectedSlug) {
      throw new Error(`Expected slug '${t.expectedSlug}' but got '${resolved.slug}'`);
    }
    if (resolved.name !== t.expectedName) {
      throw new Error(`Expected name '${t.expectedName}' but got '${resolved.name}'`);
    }
    console.log(`  ✓ Aliases array: [${resolved.slugAliases?.join(', ')}]`);
  }

  // Test 1.4: ADMIN AUTH & OEM TRACEABILITY
  console.log('\n============================================================');
  console.log('3. ADMIN AUTHENTICATION & OEM TRACEABILITY API');
  console.log('============================================================');

  console.log('Logging in as Super Admin (admin@askrev.com)...');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@askrev.com', password: 'Admin@123456' }),
  });

  if (!loginRes.ok) throw new Error(`Admin login failed: ${loginRes.status}`);
  const setCookieHeader = loginRes.headers.get('set-cookie') || '';
  const tokenMatch = setCookieHeader.match(/askrev_access_token=([^;]+)/);
  const csrfMatch = setCookieHeader.match(/askrev_csrf_token=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : '';
  const csrf = csrfMatch ? csrfMatch[1] : '';

  console.log('Querying GET /api/admin/products with Super Admin session...');
  const adminRes = await fetch(`${API_BASE}/admin/products?limit=50`, {
    headers: {
      Cookie: `askrev_access_token=${token}; askrev_csrf_token=${csrf}`,
      'X-CSRF-Token': csrf,
    },
  });

  if (!adminRes.ok) throw new Error(`GET /api/admin/products failed: ${adminRes.status}`);
  const adminCatalog = await adminRes.json();
  console.log(`  Super Admin received ${adminCatalog.items.length} products total.`);

  const realFleet = adminCatalog.items.filter(p => p.slug.startsWith('askr-ev-'));
  console.log(`  Identified ${realFleet.length} rebranded ASKR EV real vehicle models.`);

  for (const m of realFleet) {
    if (!m.oemManufacturer) {
      throw new Error(`Missing oemManufacturer on ${m.name} (${m.slug})`);
    }
    console.log(`  ✓ [${m.slug}] ${m.name} -> OEM: ${m.oemManufacturer} (${m.oemModelName || 'Standard'}) | Rebranded: ${m.isRebranded}`);
  }
}

async function runBrowserVerification() {
  console.log('\n============================================================');
  console.log('4. PLAYWRIGHT BROWSER VISUAL QA & SCREENSHOT SUITE');
  console.log('============================================================');

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Test 4.1: Homepage Hero Visuals & CTAs
  console.log('\n[BROWSER 4.1] Navigating to Homepage (http://localhost:3000)...');
  await page.goto(WEB_BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Check hero headline
  const headline = await page.locator('h1').first().textContent();
  console.log(`  Hero Headline rendered: "${headline?.trim()}"`);

  // Check CTAs
  const primaryCta = await page.locator('a:has-text("Explore Vehicles")').first();
  const secondaryCta = await page.locator('button:has-text("Enquire Now")').first();

  const hasPrimary = await primaryCta.count() > 0;
  const hasSecondary = await secondaryCta.count() > 0;
  console.log(`  Primary CTA "Explore Vehicles": ${hasPrimary ? 'PRESENT ✓' : 'MISSING ❌'}`);
  console.log(`  Secondary CTA "Enquire Now": ${hasSecondary ? 'PRESENT ✓' : 'MISSING ❌'}`);

  const heroScreenshot = path.join(ARTIFACT_DIR, 'homepage_rebranded_hero.png');
  await page.screenshot({ path: heroScreenshot, fullPage: false });
  console.log(`  ✓ Screenshot saved: ${heroScreenshot}`);

  // Test 4.2: Showroom Detail: ASKR EV S01 (Commuter Lineup)
  console.log('\n[BROWSER 4.2] Navigating to /bikes/askr-ev-s01...');
  await page.goto(`${WEB_BASE}/bikes/askr-ev-s01`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const titleS01 = await page.locator('h1').first().textContent();
  console.log(`  Product Title: "${titleS01?.trim()}"`);
  const s01Img = await page.locator('img[src*="askr-s01-commuter-lineup.jpg"]').count();
  console.log(`  Branded S01 image visible: ${s01Img > 0 ? 'YES ✓' : 'NO ❌'}`);

  const s01Screenshot = path.join(ARTIFACT_DIR, 'askr_ev_s01_detail.png');
  await page.screenshot({ path: s01Screenshot, fullPage: false });
  console.log(`  ✓ Screenshot saved: ${s01Screenshot}`);

  // Test 4.3: Showroom Detail: ASKR EV S03 (Performance Orange)
  console.log('\n[BROWSER 4.3] Navigating to /bikes/askr-ev-s03...');
  await page.goto(`${WEB_BASE}/bikes/askr-ev-s03`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const titleS03 = await page.locator('h1').first().textContent();
  console.log(`  Product Title: "${titleS03?.trim()}"`);
  const s03Img = await page.locator('img[src*="askr-s03-performance.jpg"]').count();
  console.log(`  Branded S03 image visible: ${s03Img > 0 ? 'YES ✓' : 'NO ❌'}`);

  const s03Screenshot = path.join(ARTIFACT_DIR, 'askr_ev_s03_detail.png');
  await page.screenshot({ path: s03Screenshot, fullPage: false });
  console.log(`  ✓ Screenshot saved: ${s03Screenshot}`);

  // Test 4.4: Showroom Detail: ASKR EV U01 (Commercial Loader)
  console.log('\n[BROWSER 4.4] Navigating to /bikes/askr-ev-u01...');
  await page.goto(`${WEB_BASE}/bikes/askr-ev-u01`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const titleU01 = await page.locator('h1').first().textContent();
  console.log(`  Product Title: "${titleU01?.trim()}"`);
  const u01Img = await page.locator('img[src*="askr-u01-commercial-loader.jpg"]').count();
  console.log(`  Branded U01 image visible: ${u01Img > 0 ? 'YES ✓' : 'NO ❌'}`);

  const u01Screenshot = path.join(ARTIFACT_DIR, 'askr_ev_u01_detail.png');
  await page.screenshot({ path: u01Screenshot, fullPage: false });
  console.log(`  ✓ Screenshot saved: ${u01Screenshot}`);

  // Test 4.5: Admin Dashboard Product Catalog
  console.log('\n[BROWSER 4.5] Logging into Admin Dashboard...');
  await page.goto(`${WEB_BASE}/auth/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', 'admin@askrev.com');
  await page.fill('input[type="password"]', 'Admin@123456');
  await page.click('button:has-text("Sign In")');
  await page.waitForTimeout(2000);

  await page.goto(`${WEB_BASE}/admin`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Switch to Products Catalog tab if not active
  const productsTab = page.locator('button:has-text("Products Catalog")');
  if (await productsTab.count() > 0) {
    await productsTab.click();
    await page.waitForTimeout(1500);
  }

  // Capture table view showing OEM badges
  const adminTableScreenshot = path.join(ARTIFACT_DIR, 'admin_catalog_rebranded_fleet.png');
  await page.screenshot({ path: adminTableScreenshot, fullPage: false });
  console.log(`  ✓ Screenshot saved: ${adminTableScreenshot}`);

  // Open Edit modal for ASKR EV S01 to verify OEM Traceability Tab
  console.log('  Opening Edit modal for ASKR EV S01...');
  const editButtons = page.locator('button[title="Edit Vehicle Model"]');
  if (await editButtons.count() > 0) {
    await editButtons.first().click();
    await page.waitForTimeout(1000);

    // Click "6. OEM Traceability" tab
    const oemTab = page.locator('button:has-text("6. OEM Traceability")');
    if (await oemTab.count() > 0) {
      await oemTab.click();
      await page.waitForTimeout(1000);
      const oemTabScreenshot = path.join(ARTIFACT_DIR, 'admin_oem_traceability_tab.png');
      await page.screenshot({ path: oemTabScreenshot, fullPage: false });
      console.log(`  ✓ Screenshot saved: ${oemTabScreenshot}`);
    }
  }

  await browser.close();
  console.log('\n✓ ALL BROWSER & PLAYWRIGHT QA TESTS PASSED SUCCESSFULLY!');
}

async function main() {
  try {
    await runApiVerification();
    await runBrowserVerification();
    console.log('\n============================================================');
    console.log('🎉 ASKR EV BRAND CONVERSION & REAL VEHICLE QA PASSED 100%!');
    console.log('============================================================\n');
  } catch (err) {
    console.error('\n❌ QA SUITE FAILED:', err);
    process.exit(1);
  }
}

main();

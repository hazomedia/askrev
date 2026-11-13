/**
 * ASKR EV — Automated Admin Product Catalog & Live Integration QA Suite
 *
 * Verifies:
 * 1. Admin login & JWT security
 * 2. Pre-seeded showcase fleet integrity (9 models)
 * 3. Dynamic product creation with integer paise precision
 * 4. Live public reflection without frontend rebuilding
 * 5. Multipart image upload to storage service
 * 6. Live product editing & price recalculation
 * 7. Publishing & unpublishing lifecycle (PUBLISHED -> DRAFT -> hidden from public)
 * 8. Display order adjustment & batch transaction
 * 9. RBAC & Security: 401 unauthenticated & 403 non-admin rejection
 * 10. Safe idempotent teardown
 */

const API_BASE = process.env.API_URL || 'http://localhost:4000/api';

async function runQa() {
  console.log('================================================================');
  console.log('🚀 ASKR EV: End-to-End Admin Product Catalog & Live QA Suite');
  console.log(`Target API: ${API_BASE}`);
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`✅ PASS: ${testName} ${details ? '(' + details + ')' : ''}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} ${details ? '- ' + details : ''}`);
      failed++;
    }
  }

  // 1. Authenticate as Super Admin
  console.log('--- Step 1: Admin Authentication ---');
  let adminToken = '';
  try {
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@askrev.com',
        password: 'Admin@123456',
      }),
    });
    const loginData = await loginRes.json();
    adminToken = loginData?.tokens?.accessToken || loginData?.accessToken || '';
    assert(loginRes.ok && Boolean(adminToken), 'Admin Login', `HTTP ${loginRes.status}`);
  } catch (err) {
    assert(false, 'Admin Login', err.message);
  }

  if (!adminToken) {
    console.error('Fatal: Cannot proceed without admin authentication.');
    process.exit(1);
  }

  // 2. Verify Initial Seeded Fleet (9 Models)
  console.log('\n--- Step 2: Seeded Fleet Verification ---');
  let initialCatalog = [];
  try {
    const catRes = await fetch(`${API_BASE}/catalog`);
    initialCatalog = await catRes.json();
    assert(
      catRes.ok && Array.isArray(initialCatalog) && initialCatalog.length >= 9,
      'Initial Public Catalog Contains >= 9 Vehicles',
      `Count: ${initialCatalog.length}`
    );

    // Verify all 4 categories are represented
    const categories = new Set(initialCatalog.map((v) => v.category));
    assert(
      categories.has('SCOOTER') && categories.has('BIKE') && categories.has('CYCLE') && categories.has('JEEP'),
      'All 4 Vehicle Categories Represented (SCOOTER, BIKE, CYCLE, JEEP)',
      `Categories: ${Array.from(categories).join(', ')}`
    );

    // Verify Integer Paise to Rupee Conversion
    const sample = initialCatalog.find((v) => v.slug === 'thunder-pro' || v.modelCode === 'THUNDER-PRO');
    assert(
      sample && sample.sellingPriceINR === 125000 && sample.sellingPricePaise === '12500000',
      'Thunder Pro Selling Price Accurately Formatted',
      `₹${sample?.sellingPriceINR} (Paise: ${sample?.sellingPricePaise})`
    );
  } catch (err) {
    assert(false, 'Initial Catalog Fetch', err.message);
  }

  // 3. Test Unauthorized Access (Security & RBAC)
  console.log('\n--- Step 3: Security & RBAC Enforcement ---');
  try {
    const unauthRes = await fetch(`${API_BASE}/admin/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hacker Bike', category: 'BIKE' }),
    });
    assert(unauthRes.status === 401, 'Unauthenticated POST /admin/products Blocked (401)', `HTTP ${unauthRes.status}`);

    // Login as a normal free user (test01@askrev.com)
    const userLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test01@askrev.com',
        password: 'User@123456',
      }),
    });
    const userLoginData = await userLoginRes.json();
    const userToken = userLoginData?.tokens?.accessToken || '';

    if (userToken) {
      const forbiddenRes = await fetch(`${API_BASE}/admin/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ name: 'Member Bike', category: 'BIKE' }),
      });
      assert(forbiddenRes.status === 403, 'Non-Admin Member POST /admin/products Blocked (403)', `HTTP ${forbiddenRes.status}`);
    } else {
      console.log('ℹ️ Note: Regular member test account not active; skipping 403 check');
    }
  } catch (err) {
    assert(false, 'RBAC Verification', err.message);
  }

  // 4. Test Image Upload Endpoint
  console.log('\n--- Step 4: Admin Product Image Upload ---');
  let uploadedImageUrl = '';
  try {
    // Generate a 1x1 PNG buffer
    const png1x1Base64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const pngBuffer = Buffer.from(png1x1Base64, 'base64');
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const bodyBuffer = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test-vehicle-photo.png"\r\nContent-Type: image/png\r\n\r\n`
      ),
      pngBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const uploadRes = await fetch(`${API_BASE}/admin/products/upload-image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: bodyBuffer,
    });

    const uploadData = await uploadRes.json();
    uploadedImageUrl = uploadData.url;
    assert(
      uploadRes.ok && Boolean(uploadedImageUrl),
      'Admin Image Upload Accepted & Processed',
      `URL: ${uploadedImageUrl}`
    );
  } catch (err) {
    assert(false, 'Image Upload', err.message);
  }

  // 5. Create a New Vehicle via Admin API
  console.log('\n--- Step 5: Admin Vehicle Creation ---');
  let createdProductId = '';
  const testVehiclePayload = {
    name: 'ASKR HyperTrack RR',
    slug: 'hypertrack-rr',
    modelCode: 'HYPERTRACK-RR',
    category: 'BIKE',
    brand: 'ASKR EV',
    tagline: 'Track-Focused Hyper-Torque Racing Concept',
    shortDescription: 'High-power electric superbike engineered with active aerodynamics and dual PMSM drive.',
    fullDescription: 'Track-focused electric superbike engineered with active aerodynamics, carbon composite frame, and 210 km/h top speed.',
    sellingPricePaise: 29999900, // ₹2,99,999
    regularPricePaise: 34999900, // ₹3,49,999
    bookingAmountPaise: 999900, // ₹9,999
    rangeKm: 240,
    topSpeedKmh: 210,
    batteryCapacityKwh: 8.4,
    chargingTimeHours: 3.5,
    motorPower: '35 kW Peak Mid-Drive',
    acceleration: '1.9 sec',
    warranty: '5-Year Unlimited Track & Street Warranty',
    powertrain: 'Dual-Inverter Synchronous Permanent Magnet Mid-Drive',
    heroImage: uploadedImageUrl || '/images/vehicles/dark/thunder-pro.jpg',
    images: [
      {
        url: uploadedImageUrl || '/images/vehicles/dark/thunder-pro.jpg',
        order: 1,
        caption: 'Track Stance',
        isPrimary: true,
      },
    ],
    colors: [
      { name: 'Neon Electric', hex: '#267DFF', description: 'Gloss racing blue' },
      { name: 'Carbon Stealth', hex: '#0B0F17', description: 'Matte exposed weave' },
    ],
    specifications: [
      { label: '0-100 km/h', value: '1.9 sec', sub: 'Launch Control' },
      { label: 'Peak Torque', value: '145 Nm', sub: 'Direct Wheel Torque' },
      { label: 'Fast Charge', value: '25 min', sub: '10-80% DC CCS2' },
    ],
    highlights: [
      'Active variable aerodynamic winglets deploying above 120 km/h',
      'Titanium-reinforced structural battery enclosure with dry-break quick swap',
      'Race telemetry with real-time sector timing and lean-angle logging',
    ],
    isFeatured: true,
    status: 'PUBLISHED',
  };

  try {
    const createRes = await fetch(`${API_BASE}/admin/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(testVehiclePayload),
    });
    const createData = await createRes.json();
    createdProductId = createData.id;
    const createdSlug = createData.slug;
    assert(
      createRes.ok && Boolean(createdProductId),
      'Admin Created "ASKR HyperTrack RR"',
      `ID: ${createdProductId}, Slug: ${createdSlug}`
    );
  } catch (err) {
    assert(false, 'Create Product', err.message);
  }

  // 6. Verify Immediate Public Reflection
  console.log('\n--- Step 6: Public Showroom Live Dynamic Reflection ---');
  let createdSlug = 'hypertrack-rr';
  try {
    const pubRes = await fetch(`${API_BASE}/catalog`);
    const pubData = await pubRes.json();
    const foundInAll = pubData.find((p) => p.id === createdProductId);
    if (foundInAll) createdSlug = foundInAll.slug;
    assert(
      Boolean(foundInAll),
      'New Vehicle Immediately Visible on Public /api/catalog Without Frontend Rebuild',
      `Found: ${foundInAll?.name}`
    );

    const bikeCatRes = await fetch(`${API_BASE}/catalog/category/BIKE`);
    const bikeCatData = await bikeCatRes.json();
    const foundInBike = bikeCatData.find((p) => p.id === createdProductId);
    assert(
      Boolean(foundInBike),
      'New Vehicle Appears in /api/catalog/category/BIKE',
      `Count in BIKE: ${bikeCatData.length}`
    );

    const slugRes = await fetch(`${API_BASE}/catalog/${createdSlug}`);
    const slugData = await slugRes.json();
    assert(
      slugRes.ok && slugData.sellingPriceINR === 299999,
      'Product Detail /api/catalog/' + createdSlug + ' Returns Accurate Spec & ₹2,99,999',
      `Selling INR: ₹${slugData.sellingPriceINR}`
    );
  } catch (err) {
    assert(false, 'Live Reflection Verification', err.message);
  }

  // 7. Update Vehicle Price & Specs via Admin API
  console.log('\n--- Step 7: Live Product Modification & Re-Verification ---');
  try {
    const updateRes = await fetch(`${API_BASE}/admin/products/${createdProductId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        sellingPricePaise: 27999900, // Reduced to ₹2,79,999
        tagline: 'Track-Focused Hyper-Torque Racing Concept (Special Offer)',
        isFeatured: false,
      }),
    });
    assert(updateRes.ok, 'Admin Updated Product Price to ₹2,79,999', `HTTP ${updateRes.status}`);

    const verifyUpdateRes = await fetch(`${API_BASE}/catalog/${createdSlug}`);
    const verifyUpdateData = await verifyUpdateRes.json();
    assert(
      verifyUpdateData.sellingPriceINR === 279999 && verifyUpdateData.isFeatured === false,
      'Public Showroom Instantly Reflects Modified Price ₹2,79,999',
      `Current INR: ₹${verifyUpdateData.sellingPriceINR}`
    );
  } catch (err) {
    assert(false, 'Product Modification', err.message);
  }

  // 8. Lifecycle: Unpublish to DRAFT
  console.log('\n--- Step 8: Publication Lifecycle (Unpublish to DRAFT) ---');
  try {
    const statusRes = await fetch(`${API_BASE}/admin/products/${createdProductId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'DRAFT' }),
    });
    assert(statusRes.ok, 'Admin Set Vehicle Status to DRAFT', `HTTP ${statusRes.status}`);

    // Check public catalog: vehicle must NOT appear in public catalog
    const checkPubRes = await fetch(`${API_BASE}/catalog`);
    const checkPubData = await checkPubRes.json();
    const stillPublic = checkPubData.some((p) => p.id === createdProductId);
    assert(
      !stillPublic,
      'DRAFT Vehicle Automatically Hidden from Public Showroom',
      'Verified hidden from public view'
    );

    // Direct slug lookup must return 404
    const directSlugRes = await fetch(`${API_BASE}/catalog/${createdSlug}`);
    assert(
      directSlugRes.status === 404,
      'Direct Lookup of DRAFT Vehicle via Public API Returns 404 Not Found',
      `HTTP ${directSlugRes.status}`
    );
  } catch (err) {
    assert(false, 'Unpublish Lifecycle', err.message);
  }

  // 9. Batch Reorder Verification
  console.log('\n--- Step 9: Batch Display Order Reordering ---');
  try {
    const reorderRes = await fetch(`${API_BASE}/admin/products/reorder`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        orders: [
          { id: initialCatalog[0].id, displayOrder: 100 },
          { id: initialCatalog[1].id, displayOrder: 101 },
        ],
      }),
    });
    assert(reorderRes.ok, 'Batch Reorder Executed Successfully in Transaction', `HTTP ${reorderRes.status}`);
  } catch (err) {
    assert(false, 'Batch Reorder', err.message);
  }

  // 10. Clean-Up Test Product
  console.log('\n--- Step 10: Teardown & Fleet Restoration ---');
  try {
    if (createdProductId) {
      const delRes = await fetch(`${API_BASE}/admin/products/${createdProductId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
      assert(delRes.ok, 'Admin Permanently Deleted Test Product', `HTTP ${delRes.status}`);
    }

    // Final catalog count check
    const finalCatRes = await fetch(`${API_BASE}/catalog`);
    const finalCatData = await finalCatRes.json();
    assert(
      finalCatData.length === initialCatalog.length,
      'Showroom Catalog Accurately Restored to Baseline',
      `Final Count: ${finalCatData.length}`
    );
  } catch (err) {
    assert(false, 'Teardown', err.message);
  }

  console.log('\n================================================================');
  console.log(`QA RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runQa().catch((err) => {
  console.error('Unhandled QA Suite Error:', err);
  process.exit(1);
});

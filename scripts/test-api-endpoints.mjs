async function testEndpoints() {
  console.log('Testing ASKR EV API endpoints...\n');

  // 1. Public catalog
  const resCatalog = await fetch('http://localhost:4000/api/catalog');
  console.log('GET /api/catalog:', resCatalog.status);
  const catalog = await resCatalog.json();
  console.log(`  Published products count: ${catalog.length}`);

  // 2. Public hero
  const resHero = await fetch('http://localhost:4000/api/catalog/hero');
  console.log('GET /api/catalog/hero:', resHero.status);
  const hero = await resHero.json();
  console.log(`  Hero slides count: ${hero.length}`);
  hero.forEach((h, i) => console.log(`    [Slide ${i + 1}] ${h.name} (${h.category}) - ${h.heroHeading}`));

  // 3. Category UTILITY
  const resUtility = await fetch('http://localhost:4000/api/catalog/category/UTILITY');
  console.log('GET /api/catalog/category/UTILITY:', resUtility.status);
  const utility = await resUtility.json();
  console.log(`  Published Utility count: ${utility.length}`);

  // 4. Admin Login
  const loginRes = await fetch('http://localhost:4000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@askrev.com', password: 'Admin@123456' }),
  });
  console.log('\nPOST /api/auth/login:', loginRes.status);
  const loginData = await loginRes.json();
  const token = loginData.tokens?.accessToken;
  console.log(`  Logged in as: ${loginData.user?.fullName} (${loginData.user?.role})`);

  // 5. Admin products (returns all including DRAFT)
  const resAdminProducts = await fetch('http://localhost:4000/api/admin/products?limit=100', {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('GET /api/admin/products:', resAdminProducts.status);
  const adminProducts = await resAdminProducts.json();
  console.log(`  Admin products count: ${adminProducts.total}`);
  console.log(`  Stats:`, adminProducts.stats);

  const drafts = adminProducts.items.filter((p) => p.status === 'DRAFT');
  console.log(`\n  Real Vehicle Drafts (${drafts.length}):`);
  drafts.forEach((d) => {
    const priceStr = d.exShowroomPriceINR ? `₹${d.exShowroomPriceINR.toLocaleString('en-IN')}` : 'Contact for Price';
    console.log(`    - [${d.category}] ${d.name} (${d.slug}): ${priceStr} | Colors: ${d.colors?.length || 0}`);
  });
}

testEndpoints().catch((err) => {
  console.error('API Test Error:', err);
  process.exit(1);
});

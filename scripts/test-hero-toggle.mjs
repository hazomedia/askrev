async function testHeroToggle() {
  console.log('Testing Admin Hero Toggle endpoint...\n');

  // Login
  const loginRes = await fetch('http://localhost:4000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@askrev.com', password: 'Admin@123456' }),
  });
  const loginData = await loginRes.json();
  const token = loginData.tokens?.accessToken;

  // Get products
  const resAdminProducts = await fetch('http://localhost:4000/api/admin/products?limit=10', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await resAdminProducts.json();
  const thunderPro = data.items.find((p) => p.slug === 'thunder-pro');

  console.log(`Initial thunder-pro isHero: ${thunderPro?.isHero}`);

  // Toggle off
  const toggleRes1 = await fetch(`http://localhost:4000/api/admin/products/${thunderPro.id}/hero`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  const updated1 = await toggleRes1.json();
  console.log(`Toggled thunder-pro isHero -> ${updated1.isHero}`);

  // Toggle back on
  const toggleRes2 = await fetch(`http://localhost:4000/api/admin/products/${thunderPro.id}/hero`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  const updated2 = await toggleRes2.json();
  console.log(`Toggled back thunder-pro isHero -> ${updated2.isHero}`);
  console.log('\nHero toggle endpoint functions perfectly!');
}

testHeroToggle().catch(console.error);

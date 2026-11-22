// scripts/verify-live-browser-auth.mjs
const API_BASE = 'https://api.askrevdrive.com/api';
const WEB_BASE = 'https://askrevdrive.com';

async function verify() {
  console.log('--- TESTING LIVE BROWSER AUTH FLOW ON PRODUCTION ---');
  
  // 1. Fetch CSRF token
  const csrfRes = await fetch(`${API_BASE}/auth/csrf`, {
    headers: { 'Origin': WEB_BASE }
  });
  const csrfData = await csrfRes.json();
  const setCookie = csrfRes.headers.get('set-cookie') || '';
  console.log('1. CSRF Status:', csrfRes.status, 'Token:', csrfData.csrfToken?.slice(0, 16) + '...');
  console.log('   Set-Cookie:', setCookie);

  // 2. Fetch Login Page HTML
  const loginPageRes = await fetch(`${WEB_BASE}/auth/login`);
  const loginHtml = await loginPageRes.text();
  console.log('2. Login Page Status:', loginPageRes.status, 'HTML length:', loginHtml.length);
  const hasEmailField = loginHtml.includes('email') || loginHtml.includes('Email') || loginHtml.includes('input');
  const hasPasswordField = loginHtml.includes('password') || loginHtml.includes('Password');
  console.log('   Email input detected:', hasEmailField);
  console.log('   Password input detected:', hasPasswordField);

  // 3. Test negative login with incorrect password from valid origin
  const loginAttemptRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': WEB_BASE,
      'x-csrf-token': csrfData.csrfToken,
      'Cookie': setCookie
    },
    body: JSON.stringify({
      email: 'admin@askrevdrive.com',
      password: 'IncorrectPasswordAttempt@2026!'
    })
  });
  const loginAttemptData = await loginAttemptRes.json();
  console.log('3. Negative Login Status:', loginAttemptRes.status, 'Body:', JSON.stringify(loginAttemptData));
  const safelyHandled = loginAttemptRes.status === 401 && !loginAttemptData.tokens;
  console.log('   Safely handled with 401 & no token leak:', safelyHandled);

  // 4. Test Registration Page HTML
  const registerPageRes = await fetch(`${WEB_BASE}/auth/register`);
  const registerHtml = await registerPageRes.text();
  console.log('4. Register Page Status:', registerPageRes.status, 'HTML length:', registerHtml.length);
  const hasSponsorField = registerHtml.includes('sponsor') || registerHtml.includes('Sponsor');
  console.log('   Sponsor code input detected:', hasSponsorField);

  // 5. Test Vehicles Showroom Page HTML
  const vehiclesRes = await fetch(`${WEB_BASE}/bikes`);
  const vehiclesHtml = await vehiclesRes.text();
  console.log('5. Vehicles Page Status:', vehiclesRes.status, 'HTML length:', vehiclesHtml.length);

  // 6. Test Booking Page HTML
  const bookRes = await fetch(`${WEB_BASE}/book`);
  const bookHtml = await bookRes.text();
  console.log('6. Book Page Status:', bookRes.status, 'HTML length:', bookHtml.length);
}

verify();

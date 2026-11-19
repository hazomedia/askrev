// scripts/test-admin-security-e2e.mjs
import crypto from 'crypto';

const API_URL = process.env.TEST_API_URL || 'http://localhost:4000/api';

const TEST_EMAIL = 'test-security-admin@askrev-qa.internal';
const INITIAL_PASSWORD = 'InitialQaPassword@2026#';
const NEW_PASSWORD = 'UpdatedQaPassword@2026$';

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(secret) {
  let bits = 0;
  let value = 0;
  let index = 0;
  const clean = secret.toUpperCase().replace(/[^A-Z2-7]/g, '');
  const buffer = Buffer.alloc(Math.floor((clean.length * 5) / 8));
  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_CHARS.indexOf(clean[i]);
    if (val === -1) continue;
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      buffer[index++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }
  return buffer;
}

function generateTOTP(secret, timestampMs = Date.now()) {
  const key = base32Decode(secret);
  const timeStep = 30;
  const counter = Math.floor(timestampMs / 1000 / timeStep);
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    (((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)) %
    1000000;
  return code.toString().padStart(6, '0');
}

const testResults = [];
function record(testName, passed, detail) {
  testResults.push({ testName, passed, detail });
  console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: ${testName} - ${detail}`);
}

async function run() {
  console.log('================================================================');
  console.log('  ASKR EV — ADMIN SECURITY & MFA END-TO-END VERIFICATION');
  console.log('================================================================\n');

  try {
    // 1. Initial Login with initial password
    let loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: INITIAL_PASSWORD }),
    });
    let loginData = await loginRes.json();
    let token = loginData.tokens?.accessToken;
    record('Initial Authentication', loginRes.status === 201 && Boolean(token), `Token issued: ${Boolean(token)}, Role: ${loginData.user?.role}`);

    // 2. Change Password Validations
    // 2a. Mismatched passwords
    let changeRes = await fetch(`${API_URL}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        currentPassword: INITIAL_PASSWORD,
        newPassword: NEW_PASSWORD,
        confirmPassword: 'MismatchPassword123!',
      }),
    });
    record('Reject Mismatched New Passwords', changeRes.status === 400, `Status: ${changeRes.status}`);

    // 2b. Weak password (<12 chars)
    changeRes = await fetch(`${API_URL}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        currentPassword: INITIAL_PASSWORD,
        newPassword: 'Short1!',
        confirmPassword: 'Short1!',
      }),
    });
    record('Reject Weak Passwords (<12 chars)', changeRes.status === 400, `Status: ${changeRes.status}`);

    // 2c. Wrong current password
    changeRes = await fetch(`${API_URL}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        currentPassword: 'WrongPassword@123',
        newPassword: NEW_PASSWORD,
        confirmPassword: NEW_PASSWORD,
      }),
    });
    record('Reject Incorrect Current Password', changeRes.status === 401, `Status: ${changeRes.status}`);

    // 2d. Password reuse (same as current)
    changeRes = await fetch(`${API_URL}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        currentPassword: INITIAL_PASSWORD,
        newPassword: INITIAL_PASSWORD,
        confirmPassword: INITIAL_PASSWORD,
      }),
    });
    record('Reject Password Reuse', changeRes.status === 400, `Status: ${changeRes.status}`);

    // 3. Successful Password Change
    changeRes = await fetch(`${API_URL}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        currentPassword: INITIAL_PASSWORD,
        newPassword: NEW_PASSWORD,
        confirmPassword: NEW_PASSWORD,
      }),
    });
    let changeData = await changeRes.json();
    record('Successful Password Change', changeRes.status === 201 && changeData.success === true, `Message: ${changeData.message}`);

    // Verify old password fails now
    let oldLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: INITIAL_PASSWORD }),
    });
    record('Old Password Invalidation', oldLoginRes.status === 401, `Old password login status: ${oldLoginRes.status}`);

    // Verify new password succeeds
    loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: NEW_PASSWORD }),
    });
    loginData = await loginRes.json();
    token = loginData.tokens?.accessToken;
    record('New Password Login & Session Re-establishment', loginRes.status === 201 && Boolean(token), `Status: ${loginRes.status}`);

    // 4. Two-Factor Authentication Setup (QR Code & Secret)
    let setupRes = await fetch(`${API_URL}/auth/mfa/setup`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    let setupData = await setupRes.json();
    const hasQr = setupData.qrCodeDataUrl?.startsWith('data:image/png;base64,');
    const hasSecret = Boolean(setupData.secret && setupData.secret.length >= 16);
    record('MFA Setup Key & QR Code Generation', setupRes.status === 201 && hasQr && hasSecret, `Has QR: ${hasQr}, Secret: ${setupData.secret?.slice(0, 8)}...`);

    // 5. Enable MFA with Invalid Code then Valid Code
    let enableInvalidRes = await fetch(`${API_URL}/auth/mfa/enable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code: '000000', secret: setupData.secret }),
    });
    record('Reject Invalid TOTP Code on Enable', enableInvalidRes.status === 400, `Status: ${enableInvalidRes.status}`);

    const validCode = generateTOTP(setupData.secret);
    let enableValidRes = await fetch(`${API_URL}/auth/mfa/enable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code: validCode, secret: setupData.secret }),
    });
    let enableValidData = await enableValidRes.json();
    const recoveryCodes = enableValidData.recoveryCodes || [];
    record(
      'Activate TOTP MFA & Generate Recovery Codes',
      enableValidRes.status === 201 && recoveryCodes.length === 8,
      `Status: ${enableValidRes.status}, Recovery Codes Count: ${recoveryCodes.length}`
    );

    // 6. Verify Profile Reflects Active 2FA
    let profileRes = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    let profileData = await profileRes.json();
    record('Profile 2FA Status Active', profileData.twoFactorEnabled === true, `twoFactorEnabled: ${profileData.twoFactorEnabled}`);

    // 7. Test MFA Challenge on Login
    // 7a. Login without TOTP code must fail with MFA_REQUIRED
    let mfaLoginNoCode = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: NEW_PASSWORD }),
    });
    let noCodeData = await mfaLoginNoCode.json();
    record(
      'MFA Challenge Enforcement on Login',
      mfaLoginNoCode.status === 401 && noCodeData.message?.includes('MFA_REQUIRED'),
      `Message: ${noCodeData.message}`
    );

    // 7b. Login with valid TOTP code
    const freshCode = generateTOTP(setupData.secret);
    let mfaLoginSuccess = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: NEW_PASSWORD, totpCode: freshCode }),
    });
    let mfaLoginSuccessData = await mfaLoginSuccess.json();
    token = mfaLoginSuccessData.tokens?.accessToken;
    record(
      'Login with Valid 2FA TOTP Code',
      mfaLoginSuccess.status === 201 && Boolean(token),
      `Status: ${mfaLoginSuccess.status}`
    );

    // 7c. Replay protection: Re-using the exact same freshCode for another login attempt must fail!
    let mfaLoginReplay = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: NEW_PASSWORD, totpCode: freshCode }),
    });
    record(
      'Replay Protection on Consumed TOTP Code',
      mfaLoginReplay.status === 401,
      `Status: ${mfaLoginReplay.status} (Replay correctly blocked)`
    );

    // 7d. Test one-time backup recovery code login
    const recoveryCodeToUse = recoveryCodes[0];
    let recoveryLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: NEW_PASSWORD, recoveryCode: recoveryCodeToUse }),
    });
    let recoveryLoginData = await recoveryLoginRes.json();
    token = recoveryLoginData.tokens?.accessToken;
    record(
      'Login with Backup Recovery Code',
      recoveryLoginRes.status === 201 && Boolean(token),
      `Status: ${recoveryLoginRes.status}`
    );

    // Replay of the same recovery code must fail
    let recoveryReuseRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: NEW_PASSWORD, recoveryCode: recoveryCodeToUse }),
    });
    record(
      'Recovery Code Single-Use Consumption',
      recoveryReuseRes.status === 401,
      `Consumed code rejection status: ${recoveryReuseRes.status}`
    );

    // 8. Change Password while 2FA is Active (Requires TOTP code)
    const freshCodeForPwd = generateTOTP(setupData.secret);
    let pwdChangeWithMfa = await fetch(`${API_URL}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        currentPassword: NEW_PASSWORD,
        newPassword: INITIAL_PASSWORD,
        confirmPassword: INITIAL_PASSWORD,
        totpCode: freshCodeForPwd,
      }),
    });
    let pwdChangeWithMfaData = await pwdChangeWithMfa.json().catch(() => ({}));
    record(
      'Change Password with 2FA TOTP Authorization',
      pwdChangeWithMfa.status === 201,
      `Status: ${pwdChangeWithMfa.status}${pwdChangeWithMfaData.message ? ' - ' + pwdChangeWithMfaData.message : ''}`
    );

    // Re-login with INITIAL_PASSWORD using fresh recovery code
    let loginAgain = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: INITIAL_PASSWORD, recoveryCode: recoveryCodes[1] }),
    });
    let loginAgainData = await loginAgain.json();
    token = loginAgainData.tokens?.accessToken;
    record(
      'Re-authenticate with New Password & Recovery Code',
      loginAgain.status === 201 && Boolean(token),
      `Status: ${loginAgain.status}`
    );

    // 9. Disable 2FA with Password & TOTP Code
    const freshCodeForDisable = generateTOTP(setupData.secret);
    let disableRes = await fetch(`${API_URL}/auth/mfa/disable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ password: INITIAL_PASSWORD, code: freshCodeForDisable }),
    });
    let disableData = await disableRes.json().catch(() => ({}));
    record(
      'Disable 2FA with Password & TOTP Verification',
      disableRes.status === 201,
      `Status: ${disableRes.status}${disableData.message ? ' - ' + disableData.message : ''}`
    );

    // 10. Revoke All Sessions on Demand
    let revokeRes = await fetch(`${API_URL}/auth/revoke-all-sessions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    let revokeData = await revokeRes.json().catch(() => ({}));
    record(
      'Revoke All Active Sessions On-Demand',
      revokeRes.status === 201,
      `Status: ${revokeRes.status}${revokeData.message ? ' - ' + revokeData.message : ''}`
    );

  } catch (err) {
    console.error('Fatal test error:', err);
    record('Test Execution Exception', false, err.message);
  }

  console.log('\n================================================================');
  console.log('  TEST SUMMARY');
  console.log('================================================================');
  const allPassed = testResults.every((r) => r.passed);
  console.log(
    `Total: ${testResults.length} | Passed: ${testResults.filter((r) => r.passed).length} | Failed: ${
      testResults.filter((r) => !r.passed).length
    }`
  );
  console.log(`Outcome: ${allPassed ? 'ALL SECURITY CHECKS PASSED ✅' : 'FAILED ❌'}`);
  console.log('================================================================');
}

run().catch(console.error);

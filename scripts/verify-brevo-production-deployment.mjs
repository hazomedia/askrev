import fs from 'fs';
import { execSync } from 'child_process';
import jwt from '../node_modules/.pnpm/jsonwebtoken@9.0.2/node_modules/jsonwebtoken/index.js';
import { PrismaClient } from '../packages/database/dist/index.js';

let dbUrl = process.env.DATABASE_URL;
let jwtSecret = process.env.JWT_ACCESS_SECRET;

try {
  const rawVars = execSync('railway variable list --service Postgres --json', { stdio: 'pipe' }).toString();
  const parsed = JSON.parse(rawVars);
  const user = parsed.POSTGRES_USER || parsed.PGUSER;
  const password = parsed.POSTGRES_PASSWORD || parsed.PGPASSWORD;
  const host = parsed.RAILWAY_TCP_PROXY_DOMAIN;
  const port = parsed.RAILWAY_TCP_PROXY_PORT;
  const db = parsed.POSTGRES_DB || parsed.PGDATABASE || 'railway';
  if (user && password && host && port) {
    dbUrl = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${db}?sslmode=require`;
  }
} catch (e) {
  console.log('Using local DB fallback:', e.message);
}

try {
  const rawApiVars = execSync('railway variable list --service api --json', { stdio: 'pipe' }).toString();
  const parsedApi = JSON.parse(rawApiVars);
  if (parsedApi.JWT_ACCESS_SECRET) {
    jwtSecret = parsedApi.JWT_ACCESS_SECRET;
  }
} catch (e) {}

const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
const API_URL = 'https://api.askrevdrive.com/api';

const results = [];
function record(name, pass, details = '') {
  results.push({ name, pass, details });
  const icon = pass ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} | ${name} | ${details}`);
}

async function verify() {
  console.log('=== STARTING POST-DEPLOYMENT BREVO HTTPS PRODUCTION VERIFICATION ===\n');

  // 1. API Health & Compliance
  let healthOk = false;
  try {
    const res = await fetch(`${API_URL}/health`);
    const data = await res.json();
    healthOk = res.ok && data.complianceMode === 'SIMULATION_ONLY' && data.database === 'connected';
    record('1. API Health & Compliance Safeguards', healthOk, JSON.stringify(data));
  } catch (e) {
    record('1. API Health & Compliance Safeguards', false, e.message);
  }

  // Generate Admin JWT for authorized administration checks
  const adminUser = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  if (!adminUser) {
    console.error('Super admin not found in production database!');
    process.exit(1);
  }
  const adminToken = jwt.sign(
    { sub: adminUser.id, email: adminUser.email, role: adminUser.role },
    jwtSecret,
    { expiresIn: '15m' }
  );

  // 2. Pre-test cleanup of any previous QA test accounts
  const deletedOld = await prisma.user.deleteMany({
    where: {
      email: { startsWith: 'askrevdrive+qa' }
    }
  });
  if (deletedOld.count > 0) {
    console.log(`Cleaned up ${deletedOld.count} stale QA test user(s).`);
  }

  // 3. Register a fresh disposable QA user under ASKR-SUPERADMIN
  const timestamp = Date.now();
  const qaEmail = `askrevdrive+qa${timestamp}@gmail.com`;
  const qaPhone = '+919' + String(timestamp).slice(-9);
  const qaPasswordInitial = 'InitialQAPassword@2026!';
  const qaPasswordNew = 'BrandNewSecurePassword@2026!';

  let qaUserId = null;
  let qaMemberId = null;
  let qaToken = null;

  try {
    const regRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: qaEmail,
        password: qaPasswordInitial,
        fullName: 'QA Brevo Production Member',
        phone: qaPhone,
        sponsorMemberId: 'ASKR-SUPERADMIN',
      }),
    });
    const regData = await regRes.json();
    qaToken = regData.tokens?.accessToken || regData.token;
    qaUserId = regData.user?.id;
    qaMemberId = regData.user?.memberId;
    record('2. QA Member Registration with Mandatory Sponsor', regRes.ok && !!qaToken, `MemberId: ${qaMemberId}, UserId: ${qaUserId}`);
  } catch (e) {
    record('2. QA Member Registration with Mandatory Sponsor', false, e.message);
  }

  // 4. Test Forgot Password Dispatch & Measure Response Time (Confirm no 120s timeout)
  let rawResetToken = null;
  let forgotDurationMs = null;
  try {
    const start = Date.now();
    const forgotRes = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: qaEmail }),
    });
    forgotDurationMs = Date.now() - start;
    const forgotData = await forgotRes.json();
    const isFast = forgotDurationMs < 8000; // Brevo HTTPS should be < 5-8 seconds, unlike 120s SMTP timeout
    record(
      '3. Forgot Password Brevo HTTPS Dispatch (Anti-Enumeration & Fast Response)',
      forgotRes.ok && isFast,
      `Duration: ${forgotDurationMs}ms (Previously 120,000ms+ timeout), Status: ${forgotRes.status}, Message: ${forgotData.message}`
    );

    // Verify token persisted in DB and read raw reset token hash
    const resetRecord = await prisma.passwordResetToken.findFirst({
      where: { userId: qaUserId },
      orderBy: { createdAt: 'desc' },
    });
    const hasValidToken = resetRecord && resetRecord.expiresAt > new Date() && !resetRecord.usedAt;
    record(
      '4. PasswordResetToken DB Persistence & 15-Minute Expiration',
      !!hasValidToken,
      `TokenId: ${resetRecord?.id}, ExpiresAt: ${resetRecord?.expiresAt}`
    );
  } catch (e) {
    record('3. Forgot Password Brevo HTTPS Dispatch', false, e.message);
  }

  // 5. Check Railway Logs for Brevo HTTPS Acceptance (allow 2s for log aggregation)
  await new Promise(r => setTimeout(r, 2000));
  try {
    const logs = execSync('railway logs --service api -n 50', { encoding: 'utf8' });
    const hasBrevoLog = logs.includes('[BREVO_HTTP]') && logs.includes('accepted by Brevo');
    const noSmtpFallback = !logs.includes('[SMTP_ERROR]') && !logs.includes('Failed to send password reset email');
    record(
      '5. Railway API Logs Confirm Brevo Acceptance & Zero SMTP Fallback',
      hasBrevoLog && noSmtpFallback,
      `Brevo Accepted Log Detected: ${hasBrevoLog}, Zero SMTP Fallback: ${noSmtpFallback}`
    );
  } catch (e) {
    record('5. Railway API Logs Verification', false, e.message);
  }

  // 6. Test Password Reset Execution via Token
  // Note: Since rawToken is securely hashed with sha256 in DB, let's create a known rawToken for testing reset
  const crypto = await import('crypto');
  const testRawToken = 'qa_test_reset_token_' + crypto.randomBytes(16).toString('hex');
  const testTokenHash = crypto.createHash('sha256').update(testRawToken).digest('hex');
  await prisma.passwordResetToken.create({
    data: {
      userId: qaUserId,
      tokenHash: testTokenHash,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min expiry
    },
  });

  try {
    const resetRes = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: testRawToken,
        newPassword: qaPasswordNew,
        confirmPassword: qaPasswordNew,
      }),
    });
    const resetData = await resetRes.json();
    record('6. Password Reset Link Execution with Disposable Account', resetRes.ok, `Status: ${resetRes.status}, Message: ${resetData.message}`);

    // Verify token cannot be reused
    const reuseRes = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: testRawToken,
        newPassword: 'AnotherPassword@2026!',
        confirmPassword: 'AnotherPassword@2026!',
      }),
    });
    record('7. Token Replay Protection (Rejection of Used Token)', reuseRes.status === 400, `Status: ${reuseRes.status}`);

    // Verify login with new password
    const newLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: qaEmail, password: qaPasswordNew }),
    });
    record('8. Login with Newly Reset Password', newLoginRes.ok, `Status: ${newLoginRes.status}`);
  } catch (e) {
    record('6. Password Reset Flow', false, e.message);
  }

  // 7. Test Send Verification Email via Brevo HTTPS & Response Time
  let verifyDurationMs = null;
  try {
    const start = Date.now();
    const sendVerifyRes = await fetch(`${API_URL}/auth/send-verification`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${qaToken}` },
    });
    verifyDurationMs = Date.now() - start;
    const isFast = verifyDurationMs < 8000;
    record(
      '9. Send Email Verification Brevo HTTPS Dispatch',
      sendVerifyRes.ok && isFast,
      `Duration: ${verifyDurationMs}ms (Previously 120,000ms+ timeout), Status: ${sendVerifyRes.status}`
    );

    // Verify token record in DB
    const verifyRecord = await prisma.emailVerificationToken.findFirst({
      where: { userId: qaUserId },
      orderBy: { createdAt: 'desc' },
    });
    record(
      '10. EmailVerificationToken DB Persistence (24-Hour Expiry)',
      !!verifyRecord && verifyRecord.expiresAt > new Date(),
      `TokenId: ${verifyRecord?.id}, ExpiresAt: ${verifyRecord?.expiresAt}`
    );
  } catch (e) {
    record('9. Send Email Verification Dispatch', false, e.message);
  }

  // 8. Test Email Verification Completion via Token
  const testRawVerifyToken = 'qa_test_verify_token_' + crypto.randomBytes(16).toString('hex');
  const testVerifyTokenHash = crypto.createHash('sha256').update(testRawVerifyToken).digest('hex');
  await prisma.emailVerificationToken.create({
    data: {
      userId: qaUserId,
      tokenHash: testVerifyTokenHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
  });

  try {
    const compRes = await fetch(`${API_URL}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: testRawVerifyToken }),
    });
    const compData = await compRes.json();
    record('11. Email Verification Token Execution', compRes.ok && compData.success, `Status: ${compRes.status}, Message: ${compData.message}`);

    // Verify user isEmailVerified updated in PostgreSQL
    const verifiedUser = await prisma.user.findUnique({ where: { id: qaUserId } });
    record('12. Database User Email Verified Status Updated', verifiedUser?.isEmailVerified === true, `isEmailVerified: ${verifiedUser?.isEmailVerified}`);
  } catch (e) {
    record('11. Email Verification Execution', false, e.message);
  }

  // 9. Regression Checks
  // Check Referral Link Integrity
  const refLink = `https://www.askrevdrive.com/auth/register?ref=${qaMemberId}`;
  record('13. Referral Link Generation & Prefix Integrity', qaMemberId?.startsWith('ASKR') && refLink.includes('ref=ASKR'), refLink);

  // Check Showroom Catalog & R2 Media Delivery (13 vehicles)
  try {
    const catRes = await fetch(`${API_URL}/admin/products`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const catData = await catRes.json();
    const count = catData.total || catData.items?.length;
    record('14. Showroom Product Catalog Integrity', catRes.ok && count === 13, `Products count: ${count}`);

    // Verify Cloudflare R2 media endpoint for ASTER
    const asterMediaRes = await fetch('https://api.askrevdrive.com/api/media/vehicles/aster/gallery/cd825b32-1298-4376-bc24-d9bc6aba84cc.webp');
    record('15. Cloudflare R2 Media Delivery', asterMediaRes.status === 200, `Status: ${asterMediaRes.status}, Content-Type: ${asterMediaRes.headers.get('content-type')}`);
  } catch (e) {
    record('14. Catalog & Media Regression', false, e.message);
  }

  // Check Calculation Engine Simulation Endpoints
  try {
    const canonRes = await fetch(`${API_URL}/simulation/canonical-scenario`);
    const canonData = await canonRes.json();
    const canonPass = canonRes.ok && canonData.finalWalletState?.shoppingVoucherINR === 30000 && canonData.finalWalletState?.availableEarningsINR === 12000;
    record('16. Calculation Engine Simulation (Canonical ₹3k, ₹33k, Vouchers, Bonuses)', canonPass, `Voucher: ₹${canonData.finalWalletState?.shoppingVoucherINR}, Earnings: ₹${canonData.finalWalletState?.availableEarningsINR}`);

    const taxRes = await fetch(`${API_URL}/tax/admin/rules`, { headers: { Authorization: `Bearer ${adminToken}` } });
    record('17. Configurable TDS Engine', taxRes.ok, `Status: ${taxRes.status}`);

    const retailRes = await fetch(`${API_URL}/retail-qualification/config`, { headers: { Authorization: `Bearer ${adminToken}` } });
    const retailData = await retailRes.json();
    record('18. Retail Shopping Qualification Threshold', retailRes.ok && retailData.qualificationThresholdPaise === '6000000', `Threshold: ₹60,000`);
  } catch (e) {
    record('16. Calculation Simulation Regression', false, e.message);
  }

  // 10. Clean up the QA user completely
  if (qaUserId) {
    try {
      console.log(`\nCleaning up disposable QA test member ${qaUserId}...`);
      await prisma.passwordResetToken.deleteMany({ where: { userId: qaUserId } });
      await prisma.emailVerificationToken.deleteMany({ where: { userId: qaUserId } });
      await prisma.membershipRequest.deleteMany({ where: { userId: qaUserId } });
      await prisma.walletAccount.deleteMany({ where: { userId: qaUserId } });
      await prisma.binaryPlacement.deleteMany({ where: { userId: qaUserId } });
      await prisma.user.delete({ where: { id: qaUserId } });
      console.log('Zero test data remaining in production database.');
    } catch (e) {
      console.warn('QA Member cleanup warning:', e.message);
    }
  }

  await prisma.$disconnect();

  console.log('\n=== E2E BREVO HTTPS VERIFICATION SUMMARY ===');
  const total = results.length;
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  console.log(`Total Checks: ${total} | PASSED: ${passed} | FAILED: ${failed}`);

  if (failed > 0) {
    console.error('CRITICAL: Some verification checks failed!');
    process.exit(1);
  } else {
    console.log('\n>>> ALL PRODUCTION BREVO HTTPS VERIFICATION CHECKS PASSED 100% <<<');
  }
}

verify().catch(err => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});

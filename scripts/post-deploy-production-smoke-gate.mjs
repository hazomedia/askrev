// scripts/post-deploy-production-smoke-gate.mjs
import { execSync } from 'child_process';
import { PrismaClient } from '../packages/database/dist/index.js';
import jwt from '../node_modules/.pnpm/jsonwebtoken@9.0.2/node_modules/jsonwebtoken/index.js';

const API_BASE = 'https://api.askrevdrive.com/api';
const WEB_BASE = 'https://askrevdrive.com';
const ADMIN_BASE = 'https://admin.askrevdrive.com';

console.log('='.repeat(80));
console.log('  ASKR EV — PRODUCTION RELEASE SMOKE TEST & VERIFICATION GATE');
console.log('='.repeat(80));

let passes = 0;
let fails = 0;
const results = [];

function check(name, pass, details = '') {
  results.push({ name, pass, details });
  const icon = pass ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} | ${name} | ${details}`);
  if (pass) passes++; else fails++;
}

async function testFetch(url, options = {}) {
  const timeoutMs = options.timeout || 15000;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ASKR-Production-Smoke-Verifier/1.0',
        ...(options.headers || {}),
      },
    });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

async function run() {
  console.log('\n--- 1. API HEALTH & SIMULATION-ONLY SAFEGUARDS ---');
  try {
    const res = await testFetch(`${API_BASE}/health`);
    const data = await res.json();
    check('API Health Endpoint Status 200', res.status === 200, `Status: ${res.status}`);
    check('Database Connection Health', data.database === 'connected', `Database: ${data.database}`);
    check('Compliance Mode Guard', data.complianceMode === 'SIMULATION_ONLY', `Mode: ${data.complianceMode}`);
    check('Live Payouts Safeguard (DISABLED)', data.livePayoutsEnabled === false, `livePayoutsEnabled: ${data.livePayoutsEnabled}`);
    check('Live Matching Safeguard (DISABLED)', data.liveMatchingEnabled === false, `liveMatchingEnabled: ${data.liveMatchingEnabled}`);
    check('Voucher Cash Conversion Guard (DISABLED)', data.voucherCashConversionEnabled === false, `voucherCashConversionEnabled: ${data.voucherCashConversionEnabled}`);
  } catch (e) {
    check('API Health Endpoint Accessible', false, e.message);
  }

  console.log('\n--- 2. FRONTEND PRODUCTION DEPLOYMENT REACHABILITY ---');
  try {
    const webRes = await testFetch(WEB_BASE, { redirect: 'follow' });
    const webHtml = await webRes.text();
    check('Vercel Public Web (askrevdrive.com)', webRes.status === 200, `Status: ${webRes.status}, Body length: ${webHtml.length}`);
    check('Public Web Title Content', webHtml.includes('ASKR') || webHtml.includes('EV'), 'Page contains ASKR branding');
  } catch (e) {
    check('Vercel Public Web Reachable', false, e.message);
  }

  try {
    const adminRes = await testFetch(ADMIN_BASE, { redirect: 'manual' });
    check('Vercel Admin Dashboard Subdomain', adminRes.status === 200 || adminRes.status === 307 || adminRes.status === 401, `Status: ${adminRes.status}`);
  } catch (e) {
    check('Vercel Admin Dashboard Reachable', false, e.message);
  }

  console.log('\n--- 3. CSRF & SESSION SECURITY CONTROLS ---');
  let csrfToken = '';
  let csrfCookie = '';
  try {
    const csrfRes = await testFetch(`${API_BASE}/auth/csrf`);
    const csrfData = await csrfRes.json();
    const setCookie = csrfRes.headers.get('set-cookie') || '';
    csrfToken = csrfData.csrfToken || '';
    csrfCookie = setCookie;
    check('CSRF Token Endpoint 200 OK', csrfRes.status === 200, `Status: ${csrfRes.status}`);
    check('CSRF Token Returned in Body', typeof csrfToken === 'string' && csrfToken.length > 20, `Token length: ${csrfToken.length}`);
    check('CSRF Cookie Set by API', setCookie.includes('askrev_csrf_token'), `Cookie: ${setCookie.slice(0, 40)}...`);
  } catch (e) {
    check('CSRF Token Generation', false, e.message);
  }

  // Verify Origin CSRF Protection on state-changing browser request
  try {
    const untrustedOriginRes = await testFetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://attacker.evil.com',
      },
      body: JSON.stringify({ email: 'admin@askrevdrive.com', password: 'RandomPassword123!' }),
    });
    check('CSRF Rejection on Untrusted Origin', untrustedOriginRes.status === 403, `Status: ${untrustedOriginRes.status}`);
  } catch (e) {
    check('CSRF Origin Guard Check', false, e.message);
  }

  // Verify Sponsor Lookup Endpoint
  try {
    const sponsorRes = await testFetch(`${API_BASE}/auth/sponsor-lookup/ASKR-SUPERADMIN`);
    const sponsorData = await sponsorRes.json();
    check('Sponsor Lookup for ASKR-SUPERADMIN', sponsorRes.status === 200 && sponsorData.valid === true, `Valid: ${sponsorData.valid}, Name: ${sponsorData.name || sponsorData.sponsorName}`);
  } catch (e) {
    check('Sponsor Lookup Check', false, e.message);
  }

  // Verify Mandatory sessionVersion JWT Protection
  console.log('\n--- 4. MANDATORY SESSION VERSION JWT ENFORCEMENT ---');
  try {
    const rawApiVars = execSync('railway variable list --service api --json', { stdio: 'pipe' }).toString();
    const parsedApi = JSON.parse(rawApiVars);
    const jwtSecret = parsedApi.JWT_ACCESS_SECRET;

    if (jwtSecret) {
      // 4a. Legacy / Forged Token without sessionVersion
      const legacyToken = jwt.sign(
        {
          sub: '53d082e3-acc0-4527-a71a-dffa8a4cc844',
          email: 'admin@askrevdrive.com',
          role: 'SUPER_ADMIN',
          memberId: 'ASKR-SUPERADMIN',
          // NO sessionVersion
        },
        jwtSecret,
        { expiresIn: '10m' }
      );

      const legacyRes = await testFetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${legacyToken}` },
      });
      check('Legacy Token Missing sessionVersion REJECTED', legacyRes.status === 401, `Status: ${legacyRes.status} (Strictly Rejected)`);

      // 4b. Valid Token with sessionVersion matching DB User (sessionVersion: 1)
      const validToken = jwt.sign(
        {
          sub: '53d082e3-acc0-4527-a71a-dffa8a4cc844',
          email: 'admin@askrevdrive.com',
          role: 'SUPER_ADMIN',
          memberId: 'ASKR-SUPERADMIN',
          sessionVersion: 1,
        },
        jwtSecret,
        { expiresIn: '10m' }
      );

      const validRes = await testFetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${validToken}` },
      });
      check('Valid Token with sessionVersion:1 ACCEPTED', validRes.status === 200, `Status: ${validRes.status}`);
      if (validRes.status === 200) {
        const profile = await validRes.json();
        check('Profile Identity Verification', profile.email === 'admin@askrevdrive.com' && profile.memberId === 'ASKR-SUPERADMIN', `Identity: ${profile.memberId}, Role: ${profile.role}`);
      }

      // 4c. Stale sessionVersion token (sessionVersion: 999) REJECTED
      const staleToken = jwt.sign(
        {
          sub: '53d082e3-acc0-4527-a71a-dffa8a4cc844',
          email: 'admin@askrevdrive.com',
          role: 'SUPER_ADMIN',
          memberId: 'ASKR-SUPERADMIN',
          sessionVersion: 999,
        },
        jwtSecret,
        { expiresIn: '10m' }
      );

      const staleRes = await testFetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${staleToken}` },
      });
      check('Stale sessionVersion (999 vs 1) REJECTED', staleRes.status === 401, `Status: ${staleRes.status}`);
    } else {
      check('Retrieve Railway JWT Secret', false, 'JWT_ACCESS_SECRET not found');
    }
  } catch (e) {
    check('Session Version Guard Check', false, e.message);
  }

  // 5. Database State & Double-Entry Ledger Parity Check
  console.log('\n--- 5. PRODUCTION DATABASE & FINANCIAL PARITY AUDIT ---');
  try {
    const rawVars = execSync('railway variable list --service Postgres --json', { stdio: 'pipe' }).toString();
    const parsed = JSON.parse(rawVars);
    const user = parsed.POSTGRES_USER || parsed.PGUSER;
    const password = parsed.POSTGRES_PASSWORD || parsed.PGPASSWORD;
    const host = parsed.RAILWAY_TCP_PROXY_DOMAIN;
    const port = parsed.RAILWAY_TCP_PROXY_PORT;
    const db = parsed.POSTGRES_DB || parsed.PGDATABASE || 'railway';

    const dbUrl = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${db}?sslmode=require`;
    const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

    // Check migrations table
    const migrations = await prisma.$queryRawUnsafe(`
      SELECT migration_name, finished_at, rolled_back_at 
      FROM "_prisma_migrations" 
      ORDER BY started_at ASC;
    `);
    const completedMigrations = migrations.filter(m => m.finished_at !== null && m.rolled_back_at === null);
    const latestMigration = completedMigrations[completedMigrations.length - 1];
    check(
      'Database Migrations All 10 Completed',
      completedMigrations.length === 10,
      `Completed: ${completedMigrations.length}/10, Latest: ${latestMigration?.migration_name}`
    );
    check(
      'Latest Security Migration Applied',
      latestMigration?.migration_name === '20261122150000_token_revocation_session_version_mfa_binding',
      `Latest Migration: ${latestMigration?.migration_name}`
    );

    // Check Users count
    const usersCount = await prisma.user.count();
    check('Production Users Parity (6 Users)', usersCount === 6, `Users in DB: ${usersCount}`);

    // Check Binary Placements count & uniqueness for assigned legs
    const placements = await prisma.binaryPlacement.findMany();
    const nonRootPlacements = placements.filter(p => p.parentId !== null);
    const uniqueLegs = new Set(nonRootPlacements.map(p => `${p.parentId}:${p.leg}`));
    check(
      'Binary Placements Unique (parentId, leg)',
      nonRootPlacements.length === uniqueLegs.size,
      `Non-root Placements: ${nonRootPlacements.length}, Unique Legs: ${uniqueLegs.size}`
    );

    // Double-Entry Ledger Verification
    const journalLines = await prisma.journalLine.findMany();
    let totalDebit = 0n;
    let totalCredit = 0n;
    for (const l of journalLines) {
      if (l.type === 'DEBIT') totalDebit += BigInt(l.amountPaise);
      if (l.type === 'CREDIT') totalCredit += BigInt(l.amountPaise);
    }
    const discrepancy = totalDebit - totalCredit;
    check('Double-Entry Ledger Integrity (0 Paise Discrepancy)', discrepancy === 0n, `Debit: ₹${Number(totalDebit)/100}, Credit: ₹${Number(totalCredit)/100}, Discrepancy: ${discrepancy}`);

    // Shopping Vouchers Check
    const vouchers = await prisma.shoppingVoucher.findMany();
    check('Shopping Vouchers Intact', vouchers.length >= 4, `Vouchers count: ${vouchers.length}`);

    await prisma.$disconnect();
  } catch (e) {
    check('Database Integrity Verification', false, e.message);
  }

  console.log('\n' + '='.repeat(80));
  console.log(`SMOKE TEST RESULTS: ${passes} PASSED, ${fails} FAILED`);
  console.log('='.repeat(80));

  if (fails > 0) {
    process.exit(1);
  }
}

run();

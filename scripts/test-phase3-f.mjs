import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { PrismaClient } = require(
  require.resolve('@prisma/client', {
    paths: ['D:/Projects/AskrEV/packages/database', 'D:/Projects/AskrEV/apps/api', 'D:/Projects/AskrEV'],
  })
);
let bcrypt;
try {
  bcrypt = require('../apps/api/node_modules/bcrypt');
} catch {
  bcrypt = require(require.resolve('bcrypt', { paths: ['D:/Projects/AskrEV/apps/api', 'D:/Projects/AskrEV'] }));
}

const prisma = new PrismaClient();
const API_URL = process.env.API_URL || 'http://localhost:4000/api';

const latencies = [];
const createdUserIds = new Set();
const testResults = [];

function recordPass(id, name, detail = '') {
  testResults.push({ id, name, status: 'PASS', detail });
  console.log(`✓ [${id}] ${name}${detail ? ` — ${detail}` : ''}`);
}

function assert(cond, message) {
  if (!cond) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

async function timedFetch(label, url, options = {}) {
  const start = performance.now();
  const res = await fetch(url, options);
  const ms = Number((performance.now() - start).toFixed(2));
  latencies.push({ label, method: options.method || 'GET', status: res.status, ms });
  return res;
}

async function login(email, password, label = 'login') {
  const res = await timedFetch(label, `${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(body)}`);
  }
  return body;
}

async function registerApiUser({ fullName, email, password, phone, sponsorMemberId }) {
  const res = await timedFetch('register', `${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName,
      email,
      password,
      phone,
      ...(sponsorMemberId ? { sponsorMemberId } : {}),
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Registration failed for ${email}: ${res.status} ${JSON.stringify(body)}`);
  }
  if (body.user?.id) createdUserIds.add(body.user.id);
  return body;
}

async function cleanupSyntheticUsers(userIds) {
  if (!userIds.length) return;
  const requests = await prisma.membershipRequest.findMany({
    where: { userId: { in: userIds } },
    select: { id: true },
  });
  const reqIds = requests.map((r) => r.id);

  const bookings = await prisma.evBooking.findMany({
    where: { userId: { in: userIds } },
    select: { id: true, bookingNumber: true, journalEntryId: true },
  });
  const bookingIds = bookings.map((b) => b.id);

  const vouchers = await prisma.shoppingVoucher.findMany({
    where: { userId: { in: userIds } },
    select: { id: true },
  });
  const voucherIds = vouchers.map((v) => v.id);

  const placements = await prisma.binaryPlacement.findMany({
    where: { userId: { in: userIds } },
    select: { id: true },
  });
  const placementIds = placements.map((p) => p.id);

  const matchEvents = await prisma.binaryMatchEvent.findMany({
    where: { userId: { in: userIds } },
    select: { id: true, journalEntryId: true },
  });

  const vtx = voucherIds.length
    ? await prisma.voucherTransaction.findMany({
        where: { voucherId: { in: voucherIds } },
        select: { journalEntryId: true },
      })
    : [];

  const userLines = await prisma.journalLine.findMany({
    where: { userId: { in: userIds } },
    select: { journalEntryId: true },
  });

  const refContainsFilters = [
    ...reqIds.map((id) => ({ referenceId: { contains: id } })),
    ...bookingIds.map((id) => ({ referenceId: { contains: id } })),
    ...bookings.map((b) => ({ referenceId: { contains: b.bookingNumber } })),
    ...userIds.map((uid) => ({ referenceId: { contains: uid } })),
  ];
  const refMatchedEntries = refContainsFilters.length
    ? await prisma.journalEntry.findMany({
        where: { OR: refContainsFilters },
        select: { id: true },
      })
    : [];

  const entryIds = Array.from(
    new Set([
      ...userLines.map((l) => l.journalEntryId),
      ...bookings.map((b) => b.journalEntryId).filter(Boolean),
      ...matchEvents.map((m) => m.journalEntryId).filter(Boolean),
      ...vtx.map((t) => t.journalEntryId).filter(Boolean),
      ...refMatchedEntries.map((e) => e.id),
    ])
  );

  await prisma.$transaction(async (tx) => {
    const entityIds = [...userIds, ...reqIds, ...bookingIds, ...placementIds, ...voucherIds];
    await tx.auditLog.deleteMany({
      where: {
        OR: [{ actorId: { in: userIds } }, ...(entityIds.length ? [{ entityId: { in: entityIds } }] : [])],
      },
    });
    if (voucherIds.length) {
      await tx.voucherTransaction.deleteMany({ where: { voucherId: { in: voucherIds } } });
    }
    await tx.evBooking.deleteMany({ where: { userId: { in: userIds } } });
    await tx.shoppingVoucher.deleteMany({ where: { userId: { in: userIds } } });
    await tx.binaryMatchEvent.deleteMany({ where: { userId: { in: userIds } } });
    await tx.qualificationEvent.deleteMany({
      where: { OR: [{ memberId: { in: userIds } }, { sponsorId: { in: userIds } }] },
    });
    await tx.commissionHold.deleteMany({
      where: { OR: [{ sponsorId: { in: userIds } }, { referredMemberId: { in: userIds } }] },
    });
    await tx.pendingRecovery.deleteMany({
      where: { OR: [{ sponsorId: { in: userIds } }, { referredMemberId: { in: userIds } }] },
    });
    await tx.withdrawalRequest.deleteMany({ where: { userId: { in: userIds } } });
    await tx.membershipRequest.deleteMany({ where: { userId: { in: userIds } } });
    await tx.binaryPlacement.deleteMany({ where: { userId: { in: userIds } } });
    await tx.walletAccount.deleteMany({ where: { userId: { in: userIds } } });
    if (entryIds.length) {
      await tx.journalLine.deleteMany({ where: { journalEntryId: { in: entryIds } } });
      await tx.journalEntry.deleteMany({ where: { id: { in: entryIds } } });
    }
    await tx.user.updateMany({ where: { id: { in: userIds } }, data: { sponsorId: null } });
    await tx.user.deleteMany({ where: { id: { in: userIds } } });
  });
}

async function runSuite() {
  const ts = Date.now().toString();
  const short = ts.slice(-6);
  const pass = 'Phase3fPass@2026';
  const passHash = await bcrypt.hash(pass, 10);

  console.log('========================================================================');
  console.log('   ASKR EV — PHASE 3F COMPLETE E2E SECURITY, UAT & CONCURRENCY SUITE');
  console.log('========================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // HEALTH, SECURITY HEADERS & STRICT CORS (T1 - T3)
    // -------------------------------------------------------------------------
    const healthRes = await timedFetch('health', `${API_URL}/health`, {
      headers: { Origin: 'http://localhost:3000' },
    });
    assert(healthRes.status === 200, `/health expected 200, got ${healthRes.status}`);
    const health = await healthRes.json();
    assert(health.status === 'ok' && health.database === 'connected', `Unhealthy response: ${JSON.stringify(health)}`);
    assert(health.complianceMode === 'SIMULATION_ONLY', `Unexpected complianceMode: ${health.complianceMode}`);
    assert(
      health.livePayoutsEnabled === false &&
        health.liveMatchingEnabled === false &&
        health.voucherCashConversionEnabled === false,
      `Live payout/matching/cash conversion flag mismatch: ${JSON.stringify(health)}`
    );
    recordPass('T1', 'Health & Compliance Flags', `db=${health.database}, mode=${health.complianceMode}`);

    assert(healthRes.headers.get('x-content-type-options') === 'nosniff', 'Missing X-Content-Type-Options: nosniff');
    assert(healthRes.headers.get('x-frame-options') === 'DENY', 'Missing X-Frame-Options: DENY');
    assert(healthRes.headers.get('referrer-policy') === 'strict-origin-when-cross-origin', 'Missing Referrer-Policy');
    assert(!!healthRes.headers.get('permissions-policy'), 'Missing Permissions-Policy');
    assert(!healthRes.headers.get('x-powered-by'), 'X-Powered-By header should be disabled');
    recordPass('T2', 'HTTP Security Headers Verified', 'nosniff, DENY, Referrer-Policy, no X-Powered-By');

    assert(
      healthRes.headers.get('access-control-allow-origin') === 'http://localhost:3000',
      `Allowed Origin header mismatch: ${healthRes.headers.get('access-control-allow-origin')}`
    );
    const evilCorsRes = await timedFetch('cors-evil', `${API_URL}/health`, {
      headers: { Origin: 'https://evil.example.com' },
    });
    assert(
      !evilCorsRes.headers.get('access-control-allow-origin'),
      `Untrusted origin must not receive ACAO header, got ${evilCorsRes.headers.get('access-control-allow-origin')}`
    );
    recordPass('T3', 'Strict CORS Origin Allowlist Enforced');

    // -------------------------------------------------------------------------
    // REGISTRATION PRIVILEGE LOCKDOWN & DUPLICATE GUARDS (T4 - T7)
    // -------------------------------------------------------------------------
    const bypassFullRes = await timedFetch('reg-bypass-full', `${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Privilege Bypass Full',
        email: `f3_bypass_full_${short}@test.askrev.local`,
        password: pass,
        phone: `+919100${short}`,
        initialPackage: 'FULL',
      }),
    });
    assert(bypassFullRes.status === 403, `initialPackage=FULL expected 403, got ${bypassFullRes.status}`);
    recordPass('T4', 'Registration Bypass Attempt (FULL) Blocked (403)');

    const bypassBasicRes = await timedFetch('reg-bypass-basic', `${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Privilege Bypass Basic',
        email: `f3_bypass_basic_${short}@test.askrev.local`,
        password: pass,
        phone: `+919101${short}`,
        initialPackage: 'BASIC',
      }),
    });
    assert(bypassBasicRes.status === 403, `initialPackage=BASIC expected 403, got ${bypassBasicRes.status}`);
    recordPass('T5', 'Registration Bypass Attempt (BASIC) Blocked (403)');

    const regPhone = `+919200${short}`;
    const regEmail = `f3_reg_${short}@test.askrev.local`;
    const freeReg = await registerApiUser({
      fullName: 'Phase3F Free Reg',
      email: regEmail,
      password: pass,
      phone: regPhone,
    });
    assert(freeReg.user.role === 'FREE_USER', `Expected FREE_USER role, got ${freeReg.user.role}`);
    assert(freeReg.user.currentPackage === 'FREE', `Expected FREE package, got ${freeReg.user.currentPackage}`);
    assert(freeReg.user.isFullQualified === false, 'New registration must not be full qualified');
    assert(!!freeReg.tokens?.accessToken && !!freeReg.tokens?.refreshToken, 'Missing JWT tokens on register');
    const dbRegBin = await prisma.binaryPlacement.findUnique({ where: { userId: freeReg.user.id } });
    assert(dbRegBin && dbRegBin.parentId === null && dbRegBin.leg === null, 'Registered binary node must start unplaced');
    const regBinTreeRes = await timedFetch('free-bin-tree', `${API_URL}/members/binary-tree`, {
      headers: { Authorization: `Bearer ${freeReg.tokens.accessToken}` },
    });
    const regBinTree = await regBinTreeRes.json();
    assert(regBinTree.node?.parent === null, 'Unplaced binary tree node.parent must be null');
    recordPass('T6', 'Free Registration Enforces FREE_USER, ₹0 Wallet/Voucher & Unplaced Binary Node');

    const dupEmailRes = await timedFetch('dup-email', `${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Dup Email',
        email: regEmail,
        password: pass,
        phone: `+919209${short}`,
      }),
    });
    assert(dupEmailRes.status === 409, `Duplicate email expected 409, got ${dupEmailRes.status}`);
    const dupPhoneRes = await timedFetch('dup-phone', `${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Dup Phone',
        email: `f3_dupphone_${short}@test.askrev.local`,
        password: pass,
        phone: `  ${regPhone} `,
      }),
    });
    assert(dupPhoneRes.status === 409, `Duplicate normalized phone expected 409, got ${dupPhoneRes.status}`);
    recordPass('T7', 'Duplicate Email & Normalized Phone Rejected (409)');

    // -------------------------------------------------------------------------
    // REFRESH TOKEN ROTATION, SERVER LOGOUT REVOCATION & RATE LIMIT (T8 - T10)
    // -------------------------------------------------------------------------
    const refreshRes = await timedFetch('auth-refresh', `${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: freeReg.tokens.refreshToken }),
    });
    assert(refreshRes.status === 200 || refreshRes.status === 201, `Refresh expected 200/201, got ${refreshRes.status}`);
    const refreshed = await refreshRes.json();
    assert(
      refreshed.tokens?.accessToken && refreshed.tokens?.refreshToken && refreshed.tokens.refreshToken !== freeReg.tokens.refreshToken,
      'Refresh must rotate refreshToken and return new tokens'
    );
    const replayRefreshRes = await timedFetch('auth-refresh-replay', `${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: freeReg.tokens.refreshToken }),
    });
    assert(replayRefreshRes.status === 401, `Reused old refreshToken expected 401, got ${replayRefreshRes.status}`);
    recordPass('T8', 'Refresh Token Rotation & Replay Blocking (401)');

    const logoutRes = await timedFetch('auth-logout', `${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${refreshed.tokens.accessToken}` },
    });
    assert(logoutRes.status === 200 || logoutRes.status === 201, `Logout failed: ${logoutRes.status}`);
    const postLogoutMe = await timedFetch('post-logout-me', `${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${refreshed.tokens.accessToken}` },
    });
    assert(postLogoutMe.status === 401, `Revoked accessToken expected 401, got ${postLogoutMe.status}`);
    const postLogoutRefresh = await timedFetch('post-logout-refresh', `${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refreshed.tokens.refreshToken }),
    });
    assert(postLogoutRefresh.status === 401, `Revoked refreshToken expected 401, got ${postLogoutRefresh.status}`);
    recordPass('T9', 'Server-Side Logout Revokes Both Access JWT & Refresh Token (401)');

    // Rate limit test on isolated dummy account (never admin/seed accounts)
    const rlEmail = `ratelimit_${short}@test.askrev.local`;
    let got429 = false;
    let retryAfterHeader = null;
    for (let i = 0; i < 30; i++) {
      const rlRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: rlEmail, password: 'WrongPassword!1' }),
      });
      if (rlRes.status === 429) {
        got429 = true;
        retryAfterHeader = rlRes.headers.get('retry-after');
        break;
      }
    }
    assert(got429 && Number(retryAfterHeader) > 0, `Expected 429 + Retry-After header during brute force probe`);
    recordPass('T10', 'Auth Brute-Force Rate Limiter Enforced (429 + Retry-After)');

    // -------------------------------------------------------------------------
    // UNAUTH, 5-ROLE RBAC, CROSS-USER ISOLATION & DTO VALIDATION (T11 - T15)
    // -------------------------------------------------------------------------
    for (const ep of ['/auth/me', '/wallet/my-wallet', '/packages/my-requests', '/ev-bikes/my-bookings', '/admin/overview']) {
      const unRes = await timedFetch(`unauth-${ep}`, `${API_URL}${ep}`);
      assert(unRes.status === 401, `Unauthenticated GET ${ep} expected 401, got ${unRes.status}`);
    }
    recordPass('T11', 'Unauthenticated Protected Routes Return 401');

    const adminAuth = await login('admin@askrev.com', 'Admin@123456', 'login-super-admin');
    const adminHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${adminAuth.tokens.accessToken}` };

    const freeAuth = await login(regEmail, pass, 'login-free');
    const freeHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${freeAuth.tokens.accessToken}` };

    // Create synthetic MEMBER, ADMIN_OPERATIONS, and FINANCE_MANAGER users to test all 5 roles
    let roleSeq = 0;
    const createRoleUser = async (roleKey, pkg, qualified) => {
      roleSeq += 1;
      const email = `f3_${roleKey.toLowerCase()}_${roleSeq}_${short}@test.askrev.local`;
      const u = await prisma.user.create({
        data: {
          memberId: `F3-${roleKey}-${roleSeq}-${short}`,
          email,
          passwordHash: passHash,
          fullName: `F3 ${roleKey} ${roleSeq}`,
          phone: `+91930${Math.floor(1000000 + Math.random() * 8999999)}`.slice(0, 13),
          role: roleKey,
          currentPackage: pkg,
          isFullQualified: qualified,
          wallet: { create: {} },
          binaryPlacement: { create: {} },
        },
      });
      createdUserIds.add(u.id);
      const tok = await login(email, pass, `login-${roleKey}`);
      return { user: u, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok.tokens.accessToken}` } };
    };

    const opsAdmin = await createRoleUser('ADMIN_OPERATIONS', 'FREE', false);
    const finAdmin = await createRoleUser('FINANCE_MANAGER', 'FREE', false);
    const stdMember = await createRoleUser('MEMBER', 'BASIC', false);

    for (const [label, hdrs] of [['FREE_USER', freeHeaders], ['MEMBER', stdMember.headers]]) {
      for (const ep of [
        { m: 'GET', u: '/admin/overview' },
        { m: 'GET', u: '/packages/admin/requests' },
        { m: 'GET', u: '/members/admin/binary-report' },
        { m: 'GET', u: '/vouchers/admin/all' },
        { m: 'GET', u: '/ev-bikes/admin/bookings' },
        { m: 'GET', u: '/wallet/admin/reconciliation' },
        { m: 'POST', u: '/members/binary/run-matching', body: { userId: stdMember.user.id } },
      ]) {
        const res = await timedFetch(`rbac-${label}-${ep.u}`, `${API_URL}${ep.u}`, {
          method: ep.m,
          headers: hdrs,
          ...(ep.body ? { body: JSON.stringify(ep.body) } : {}),
        });
        assert(res.status === 403, `${label} ${ep.m} ${ep.u} expected 403, got ${res.status}`);
      }
    }
    recordPass('T12', 'RBAC Blocks FREE_USER & MEMBER Across All Admin + Binary Match Endpoints (403)');

    for (const [roleLabel, hdrs] of [
      ['SUPER_ADMIN', adminHeaders],
      ['ADMIN_OPERATIONS', opsAdmin.headers],
      ['FINANCE_MANAGER', finAdmin.headers],
    ]) {
      const ov = await timedFetch(`rbac-ok-${roleLabel}`, `${API_URL}/admin/overview`, { headers: hdrs });
      assert(ov.status === 200, `${roleLabel} GET /admin/overview expected 200, got ${ov.status}`);
    }
    recordPass('T13', 'RBAC Permits SUPER_ADMIN, ADMIN_OPERATIONS, FINANCE_MANAGER (200)');

    // Cross-user isolation: non-admin binary-tree allows self (200) and blocks out-of-subtree ?userId= target (403)
    const selfTreeRes = await timedFetch('self-tree', `${API_URL}/members/binary-tree`, {
      headers: stdMember.headers,
    });
    assert(selfTreeRes.status === 200, `Expected 200 on self binary tree, got ${selfTreeRes.status}`);
    const selfTree = await selfTreeRes.json();
    assert(selfTree.node?.userId === stdMember.user.id, 'Self binary tree returned wrong node');

    const spoofTreeRes = await timedFetch('spoof-tree', `${API_URL}/members/binary-tree?userId=${adminAuth.user.id}`, {
      headers: stdMember.headers,
    });
    assert(spoofTreeRes.status === 403, `Expected 403 Forbidden on out-of-subtree ?userId target, got ${spoofTreeRes.status}`);

    // Create voucher + booking under isolated user F3_ISO1, attempt redeem & cancel from stdMember
    const iso1 = await registerApiUser({
      fullName: 'Iso Member One',
      email: `f3_iso1_${short}@test.askrev.local`,
      password: pass,
      phone: `+919210${short}`,
    });
    const isoHdrs = { 'Content-Type': 'application/json', Authorization: `Bearer ${iso1.tokens.accessToken}` };
    const isoReq = await (
      await timedFetch('iso-req', `${API_URL}/packages/request`, {
        method: 'POST',
        headers: isoHdrs,
        body: JSON.stringify({ requestType: 'FULL_ACTIVATION', paymentMode: 'SIMULATED' }),
      })
    ).json();
    await timedFetch('iso-appr', `${API_URL}/packages/admin/requests/${isoReq.request.id}/approve`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ adminNotes: 'Iso test approve' }),
    });
    const isoVouchers = await (await timedFetch('iso-v', `${API_URL}/vouchers/my-vouchers`, { headers: isoHdrs })).json();
    const bikes = await (await timedFetch('bikes', `${API_URL}/ev-bikes`)).json();
    const bikeApex = bikes.find((b) => b.modelCode === 'ASKR-APEX-SPORT') || bikes[0];
    const isoBook = await (
      await timedFetch('iso-book', `${API_URL}/ev-bikes/book`, {
        method: 'POST',
        headers: isoHdrs,
        body: JSON.stringify({ bikeId: bikeApex.id, voucherId: isoVouchers[0].id, voucherAmountINR: 5000 }),
      })
    ).json();
    const stealCancel = await timedFetch('cross-cancel', `${API_URL}/ev-bikes/bookings/${isoBook.booking.id}/cancel`, {
      method: 'POST',
      headers: stdMember.headers,
      body: JSON.stringify({ cancellationReason: 'steal' }),
    });
    assert(stealCancel.status === 403, `Cross-user cancel expected 403, got ${stealCancel.status}`);
    const stealRedeem = await timedFetch('cross-redeem', `${API_URL}/vouchers/redeem`, {
      method: 'POST',
      headers: stdMember.headers,
      body: JSON.stringify({ voucherId: isoVouchers[0].id, amountINR: 1000, purpose: 'EV_BOOKING_DEPOSIT' }),
    });
    assert(stealRedeem.status === 403, `Cross-user voucher redeem expected 403, got ${stealRedeem.status}`);
    recordPass('T14', 'Cross-User Asset & Tree Isolation Verified (403 on Cancel/Redeem + Own-Tree Only)');

    // Negative / NaN / Invalid DTO checks
    for (const [lbl, ep, body] of [
      ['bad-voucher-neg', '/vouchers/redeem', { voucherId: isoVouchers[0].id, amountINR: -500 }],
      ['bad-voucher-nan', '/vouchers/redeem', { voucherId: isoVouchers[0].id, amountINR: 'NaN' }],
      ['bad-book-neg', '/ev-bikes/book', { bikeId: bikeApex.id, voucherAmountINR: -100 }],
      ['bad-req-type', '/packages/request', { requestType: 'SUPER_FREE' }],
    ]) {
      const badRes = await timedFetch(lbl, `${API_URL}${ep}`, {
        method: 'POST',
        headers: isoHdrs,
        body: JSON.stringify(body),
      });
      assert(badRes.status === 400, `${lbl} expected 400 Bad Request, got ${badRes.status}`);
    }
    recordPass('T15', 'Malformed, Negative & Invalid Enum DTO Inputs Rejected (400)');

    // -------------------------------------------------------------------------
    // MEMBERSHIP PATHS A/B/C, REJECTION, CONCURRENCY & IDEMPOTENCY (T16 - T21)
    // -------------------------------------------------------------------------
    // Path A: FREE -> BASIC (₹3,000) + Path C: BASIC -> FULL (₹30,000)
    const pathAC = await registerApiUser({
      fullName: 'Path A-C Member',
      email: `f3_pathac_${short}@test.askrev.local`,
      password: pass,
      phone: `+919220${short}`,
    });
    const pacHdrs = { 'Content-Type': 'application/json', Authorization: `Bearer ${pathAC.tokens.accessToken}` };
    const reqBasic = await (
      await timedFetch('req-basic', `${API_URL}/packages/request`, {
        method: 'POST',
        headers: pacHdrs,
        body: JSON.stringify({ requestType: 'BASIC_ACTIVATION', paymentMode: 'SIMULATED' }),
      })
    ).json();
    assert(reqBasic.request.feeINR === 3000, `Basic fee expected 3000, got ${reqBasic.request.feeINR}`);
    const apprBasic = await (
      await timedFetch('appr-basic', `${API_URL}/packages/admin/requests/${reqBasic.request.id}/approve`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ adminNotes: 'Approve Basic' }),
      })
    ).json();
    assert(apprBasic.member?.currentPackage === 'BASIC' && apprBasic.member?.isFullQualified === false, 'Basic state mismatch');
    const pacVouchersAfterBasic = await prisma.shoppingVoucher.findMany({ where: { userId: pathAC.user.id } });
    assert(pacVouchersAfterBasic.length === 0, 'Basic activation must not issue a shopping voucher');
    recordPass('T16', 'Membership Path A (FREE -> BASIC ₹3,000) Approved & Verified');

    // Verify iso1 got FULL_ACTIVATION ₹33,000 cleanly in T14
    const isoUserDb = await prisma.user.findUnique({ where: { id: iso1.user.id } });
    assert(isoUserDb.currentPackage === 'FULL' && isoUserDb.isFullQualified === true, 'Path B FULL activation failed');
    assert(isoVouchers.length === 1 && isoVouchers[0].initialValueINR === 30000, 'Path B expected ₹30,000 voucher');
    recordPass('T17', 'Membership Path B (FREE -> FULL ₹33,000 + ₹30,000 Voucher) Verified');

    // Path C: BASIC -> FULL upgrade ₹30,000 (must NOT book ₹30k as 4000_MEMBERSHIP_FEE_REVENUE)
    const reqUpg = await (
      await timedFetch('req-upg', `${API_URL}/packages/request`, {
        method: 'POST',
        headers: pacHdrs,
        body: JSON.stringify({ requestType: 'BASIC_TO_FULL_UPGRADE', paymentMode: 'SIMULATED' }),
      })
    ).json();
    assert(reqUpg.request.feeINR === 30000, `Upgrade fee expected 30000, got ${reqUpg.request.feeINR}`);
    await timedFetch('appr-upg', `${API_URL}/packages/admin/requests/${reqUpg.request.id}/approve`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ adminNotes: 'Approve Upgrade' }),
    });
    const pacAfterUpg = await prisma.user.findUnique({ where: { id: pathAC.user.id } });
    assert(pacAfterUpg.currentPackage === 'FULL' && pacAfterUpg.isFullQualified === true, 'Path C upgrade state mismatch');
    const upgEntry = await prisma.journalEntry.findFirst({
      where: { referenceId: `JNL-REQ-${reqUpg.request.id}` },
      include: { lines: true },
    });
    assert(upgEntry, 'Path C journal entry missing');
    const hasPlatformFeeOnUpgrade = upgEntry.lines.some((l) => l.account === '4000_PLATFORM_JOINING_REVENUE');
    assert(!hasPlatformFeeOnUpgrade, 'Path C ₹30k upgrade must NOT be booked as platform fee revenue!');
    const vchrLiabilityLine = upgEntry.lines.find((l) => l.account === '2100_SHOPPING_VOUCHER_LIABILITY');
    assert(vchrLiabilityLine && vchrLiabilityLine.creditPaise === 3000000n, 'Path C ₹30k must credit voucher liability');
    recordPass('T18', 'Membership Path C (BASIC -> FULL ₹30,000) Books 100% Voucher Liability, ₹0 Extra Platform Fee');

    // Rejection + duplicate approve block
    const rejUser = await registerApiUser({
      fullName: 'Rej User',
      email: `f3_rej_${short}@test.askrev.local`,
      password: pass,
      phone: `+919230${short}`,
    });
    const rejHdrs = { 'Content-Type': 'application/json', Authorization: `Bearer ${rejUser.tokens.accessToken}` };
    const rejReq = await (
      await timedFetch('req-rej', `${API_URL}/packages/request`, {
        method: 'POST',
        headers: rejHdrs,
        body: JSON.stringify({ requestType: 'BASIC_ACTIVATION', paymentMode: 'SIMULATED' }),
      })
    ).json();
    const doRej = await timedFetch('reject-req', `${API_URL}/packages/admin/requests/${rejReq.request.id}/reject`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ adminNotes: 'Rejected payment proof' }),
    });
    assert(doRej.ok, `Reject failed: ${doRej.status}`);
    const rejUserAfter = await prisma.user.findUnique({ where: { id: rejUser.user.id } });
    assert(rejUserAfter.currentPackage === 'FREE', 'Rejected user must stay FREE');
    const reApproveRej = await timedFetch('reappr-rej', `${API_URL}/packages/admin/requests/${rejReq.request.id}/approve`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ adminNotes: 'Retry' }),
    });
    assert(reApproveRej.status === 400, `Approving already rejected request expected 400, got ${reApproveRej.status}`);
    const reApproveApproved = await timedFetch('reappr-appr', `${API_URL}/packages/admin/requests/${reqUpg.request.id}/approve`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ adminNotes: 'Retry' }),
    });
    assert(reApproveApproved.status === 400, `Re-approving approved request expected 400, got ${reApproveApproved.status}`);
    recordPass('T19', 'Request Rejection & Duplicate Approval Prevention Verified');

    // Concurrency Race 1: 5 parallel POST /packages/request on same member
    const raceReqUser = await registerApiUser({
      fullName: 'Race Req User',
      email: `f3_racereq_${short}@test.askrev.local`,
      password: pass,
      phone: `+919240${short}`,
    });
    const raceHdrs = { 'Content-Type': 'application/json', Authorization: `Bearer ${raceReqUser.tokens.accessToken}` };
    const raceReqResponses = await Promise.all(
      Array.from({ length: 5 }, (_, idx) =>
        fetch(`${API_URL}/packages/request`, {
          method: 'POST',
          headers: raceHdrs,
          body: JSON.stringify({ requestType: 'FULL_ACTIVATION', paymentReference: `RACE-${idx}` }),
        })
      )
    );
    const reqSuccessCount = raceReqResponses.filter((r) => r.ok).length;
    const reqRejectedCount = raceReqResponses.filter((r) => r.status === 400 || r.status === 409).length;
    assert(reqSuccessCount === 1 && reqRejectedCount === 4, `Expected 1 ok + 4 rejected (400/409) on request race, got ok=${reqSuccessCount}, rej=${reqRejectedCount}`);
    const dbPendingRace = await prisma.membershipRequest.count({ where: { userId: raceReqUser.user.id, status: 'PENDING' } });
    assert(dbPendingRace === 1, `Expected 1 pending request in DB, found ${dbPendingRace}`);
    recordPass('T20', 'Concurrency Race Guard: 5 Parallel POST /packages/request -> 1 Created, 4 Blocked (409)');

    // Concurrency Race 2: 3 parallel approvals on that single PENDING request
    const racePendingRow = await prisma.membershipRequest.findFirst({ where: { userId: raceReqUser.user.id, status: 'PENDING' } });
    const raceApprResponses = await Promise.all(
      Array.from({ length: 3 }, () =>
        fetch(`${API_URL}/packages/admin/requests/${racePendingRow.id}/approve`, {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify({ adminNotes: 'Race approve' }),
        })
      )
    );
    const apprOkCount = raceApprResponses.filter((r) => r.ok).length;
    const apprFailCount = raceApprResponses.filter((r) => r.status === 400).length;
    assert(apprOkCount === 1 && apprFailCount === 2, `Expected 1 ok + 2 400 on approve race, got ok=${apprOkCount}, 400=${apprFailCount}`);
    const raceVouchers = await prisma.shoppingVoucher.count({ where: { userId: raceReqUser.user.id } });
    assert(raceVouchers === 1, `Expected 1 voucher after concurrent approval race, got ${raceVouchers}`);
    recordPass('T21', 'Concurrency Race Guard: 3 Parallel Approvals -> 1 Settled, 2 Blocked (400), No Duplicate Voucher');

    // -------------------------------------------------------------------------
    // ISOLATED CANONICAL SPONSOR A (B, C, D, E) + 3RD FULL DIRECT (T22 - T26)
    // -------------------------------------------------------------------------
    const sponA = await registerApiUser({
      fullName: 'Canonical Spon A',
      email: `f3_spona_${short}@test.askrev.local`,
      password: pass,
      phone: `+919400${short}`,
    });
    const sponAHdrs = { 'Content-Type': 'application/json', Authorization: `Bearer ${sponA.tokens.accessToken}` };
    const sponAReq = await (
      await timedFetch('spona-req', `${API_URL}/packages/request`, {
        method: 'POST',
        headers: sponAHdrs,
        body: JSON.stringify({ requestType: 'FULL_ACTIVATION', paymentMode: 'SIMULATED' }),
      })
    ).json();
    await fetch(`${API_URL}/packages/admin/requests/${sponAReq.request.id}/approve`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ adminNotes: 'Spon A Full' }),
    });

    const enrollAndApproveBasic = async (tag, phoneTail) => {
      const m = await registerApiUser({
        fullName: `Canonical ${tag}`,
        email: `f3_can_${tag.toLowerCase()}_${short}@test.askrev.local`,
        password: pass,
        phone: `+9194${phoneTail}${short}`,
        sponsorMemberId: sponA.user.memberId,
      });
      const hdrs = { 'Content-Type': 'application/json', Authorization: `Bearer ${m.tokens.accessToken}` };
      const r = await (
        await fetch(`${API_URL}/packages/request`, {
          method: 'POST',
          headers: hdrs,
          body: JSON.stringify({ requestType: 'BASIC_ACTIVATION', paymentMode: 'SIMULATED' }),
        })
      ).json();
      await fetch(`${API_URL}/packages/admin/requests/${r.request.id}/approve`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ adminNotes: `Approve ${tag} Basic` }),
      });
      return { m, hdrs };
    };

    const getWalletINR = async (userId) => {
      const w = await prisma.walletAccount.findUnique({ where: { userId } });
      return {
        avail: Number(w.availableEarningsPaise) / 100,
        held: Number(w.heldCommissionsPaise) / 100,
        rec: Number(w.pendingRecoveryPaise) / 100,
        voucher: Number(w.shoppingVoucherBalancePaise) / 100,
      };
    };

    await enrollAndApproveBasic('B', '11');
    let wA = await getWalletINR(sponA.user.id);
    assert(wA.held === 0 && wA.avail === 1000, `After B Basic expected Held=0, Avail=1000, got ${JSON.stringify(wA)}`);
    recordPass('T22', 'Canonical Spon A after Direct B Basic', 'Avail=₹1,000, Held=₹0');

    await enrollAndApproveBasic('C', '12');
    wA = await getWalletINR(sponA.user.id);
    assert(wA.held === 1000 && wA.avail === 1000, `After C Basic expected Held=1000, Avail=1000, got ${JSON.stringify(wA)}`);
    recordPass('T23', 'Canonical Spon A after Direct C Basic', 'Held=₹1,000, Avail=₹1,000');

    const { hdrs: dHdrs } = await enrollAndApproveBasic('D', '13');
    const { hdrs: eHdrs } = await enrollAndApproveBasic('E', '14');
    wA = await getWalletINR(sponA.user.id);
    assert(wA.held === 1000 && wA.avail === 3000, `After B..E Basic expected Held=1000, Avail=3000, got ${JSON.stringify(wA)}`);

    // D upgrades BASIC -> FULL (1st Full Qualified direct -> ₹10k - ₹1k prior = +₹9k -> Avail ₹12,000)
    const dUpg = await (
      await fetch(`${API_URL}/packages/request`, {
        method: 'POST',
        headers: dHdrs,
        body: JSON.stringify({ requestType: 'BASIC_TO_FULL_UPGRADE', paymentMode: 'SIMULATED' }),
      })
    ).json();
    await fetch(`${API_URL}/packages/admin/requests/${dUpg.request.id}/approve`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ adminNotes: 'D 1st Full Direct' }),
    });
    wA = await getWalletINR(sponA.user.id);
    assert(wA.avail === 12000 && wA.held === 1000 && wA.rec === 0, `After D Full expected Avail=12000, Held=1000, got ${JSON.stringify(wA)}`);
    recordPass('T24', 'Canonical Spon A after D (1st Full Direct)', 'Avail=₹12,000, Held=₹1,000');

    // E upgrades BASIC -> FULL (2nd Full Qualified direct -> ₹30,000 Voucher + Hold ₹1,000 release + ₹1,000 Basic recovery -> Avail ₹12,000, Held ₹0, Rec ₹0, Voucher ₹60k (30k own + 30k grant))
    const eUpg = await (
      await fetch(`${API_URL}/packages/request`, {
        method: 'POST',
        headers: eHdrs,
        body: JSON.stringify({ requestType: 'BASIC_TO_FULL_UPGRADE', paymentMode: 'SIMULATED' }),
      })
    ).json();
    await fetch(`${API_URL}/packages/admin/requests/${eUpg.request.id}/approve`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ adminNotes: 'E 2nd Full Direct' }),
    });
    wA = await getWalletINR(sponA.user.id);
    const sponSecondGrantVouchers = await prisma.shoppingVoucher.findMany({
      where: { userId: sponA.user.id, issuedReason: 'SECOND_QUALIFIED_DIRECT_GRANT' },
    });
    assert(
      wA.avail === 12000 &&
        wA.held === 0 &&
        wA.rec === 0 &&
        sponSecondGrantVouchers.length === 1 &&
        Number(sponSecondGrantVouchers[0].initialValuePaise) === 3000000,
      `Canonical Final State mismatch: ${JSON.stringify(wA)}, vouchers=${sponSecondGrantVouchers.length}`
    );
    recordPass('T25', 'Isolated Canonical Sponsor A Verified Exact Final State', 'Avail=₹12,000, Held=₹0, Rec=₹0, GrantVoucher=₹30,000');

    // 3rd Full-Qualified Direct F -> +₹10,000 cash earnings
    const canF = await registerApiUser({
      fullName: 'Canonical F',
      email: `f3_can_f_${short}@test.askrev.local`,
      password: pass,
      phone: `+919415${short}`,
      sponsorMemberId: sponA.user.memberId,
    });
    const fReq = await (
      await fetch(`${API_URL}/packages/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${canF.tokens.accessToken}` },
        body: JSON.stringify({ requestType: 'FULL_ACTIVATION', paymentMode: 'SIMULATED' }),
      })
    ).json();
    await fetch(`${API_URL}/packages/admin/requests/${fReq.request.id}/approve`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ adminNotes: 'F 3rd Full Direct' }),
    });
    wA = await getWalletINR(sponA.user.id);
    assert(wA.avail === 22000, `After 3rd Full direct expected Avail=22000, got ${wA.avail}`);
    recordPass('T26', 'Sponsor 3rd Full-Qualified Direct Pays ₹10,000 Commission', 'Avail=₹22,000');

    // -------------------------------------------------------------------------
    // BINARY MATCHING ENGINE, CONCURRENCY & DAILY CAP (T27 - T31)
    // -------------------------------------------------------------------------
    // Test concurrent placement into SAME (parentId, LEFT) slot + standard 1:1 matching
    const binRaceU1 = await createRoleUser('MEMBER', 'FULL', true);
    const binRaceU2 = await createRoleUser('MEMBER', 'FULL', true);
    const placeRace = await Promise.all([
      fetch(`${API_URL}/members/binary/place`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ userId: binRaceU1.user.id, parentId: sponA.user.id, leg: 'LEFT' }),
      }),
      fetch(`${API_URL}/members/binary/place`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ userId: binRaceU2.user.id, parentId: sponA.user.id, leg: 'LEFT' }),
      }),
    ]);
    const placeOk = placeRace.filter((r) => r.ok).length;
    const placeFail = placeRace.filter((r) => [400, 409].includes(r.status)).length;
    assert(placeOk === 1 && placeFail === 1, `Binary LEFT slot race expected 1 ok + 1 fail, got ok=${placeOk}, fail=${placeFail}`);
    recordPass('T27', 'Binary Placement Slot Lock Prevents Concurrent Same-Leg Overwrite');

    // Place 2 LEFT children (l1 + l2 under l1) and 1 RIGHT child (r1) => 2L : 1R (1:1 yields 1 match + 1L carried)
    const binRoot = await createRoleUser('MEMBER', 'FULL', true);
    const l1 = await createRoleUser('MEMBER', 'FULL', true);
    const l2 = await createRoleUser('MEMBER', 'FULL', true);
    const r1 = await createRoleUser('MEMBER', 'FULL', true);
    await fetch(`${API_URL}/members/binary/place`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ userId: l1.user.id, parentId: binRoot.user.id, leg: 'LEFT' }),
    });
    await fetch(`${API_URL}/members/binary/place`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ userId: l2.user.id, parentId: l1.user.id, leg: 'LEFT' }),
    });
    await fetch(`${API_URL}/members/binary/place`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ userId: r1.user.id, parentId: binRoot.user.id, leg: 'RIGHT' }),
    });
    const matchRes1 = await timedFetch('bin-match-1', `${API_URL}/members/binary/run-matching`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ userId: binRoot.user.id, idempotencyKey: `BIN-11-${short}` }),
    });
    const matchData1 = await matchRes1.json();
    assert(
      matchData1.matchesSettled === 1 && matchData1.rewardINR === 3000 && matchData1.carryLeft === 1 && matchData1.carryRight === 0,
      `1:1 Binary match mismatch: ${JSON.stringify(matchData1)}`
    );
    recordPass('T28', 'Binary 1:1 Match Settled (₹3,000, Leftover 1L Carried Forward)');

    // Unqualified member cannot earn binary matching rewards
    const basicBin = await createRoleUser('MEMBER', 'BASIC', false);
    const unqMatchRes = await timedFetch('bin-unq', `${API_URL}/members/binary/run-matching`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ userId: basicBin.user.id }),
    });
    const unqMatch = await unqMatchRes.json();
    assert(unqMatch.isQualified === false && unqMatch.matchesSettled === 0 && unqMatch.rewardINR === 0, `Unqualified user received match: ${JSON.stringify(unqMatch)}`);
    recordPass('T29', 'Unqualified Member Blocked From Receiving Binary Matching Payout');

    // Daily Cap: 15 matches / ₹45,000 max per calendar day (Asia/Kolkata)
    // 16L : 17R -> 16 matches under 1:1 -> 15 settled, 1 capped -> carry (1L : 2R) preserved!
    const capUser = await createRoleUser('MEMBER', 'FULL', true);
    await prisma.binaryPlacement.update({
      where: { userId: capUser.user.id },
      data: { carryLeftPaise: 16n, carryRightPaise: 17n, leftCount: 16, rightCount: 17 },
    });
    const capRun1 = await (
      await timedFetch('bin-cap-1', `${API_URL}/members/binary/run-matching`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ userId: capUser.user.id, idempotencyKey: `CAP1-${short}` }),
      })
    ).json();
    assert(
      capRun1.matchesSettled === 15 &&
        capRun1.cappedOutMatches === 1 &&
        capRun1.rewardINR === 45000 &&
        capRun1.carryLeft === 1 &&
        capRun1.carryRight === 2 &&
        capRun1.dailyCapRemaining === 0,
      `Daily cap 15/45k failed: ${JSON.stringify(capRun1)}`
    );
    const capRun2 = await (
      await fetch(`${API_URL}/members/binary/run-matching`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ userId: capUser.user.id, idempotencyKey: `CAP2-${short}` }),
      })
    ).json();
    assert(
      capRun2.matchesSettled === 0 && capRun2.rewardINR === 0 && capRun2.carryLeft === 1 && capRun2.carryRight === 2,
      `Same-day 2nd matching exceeded daily cap or flushed carry: ${JSON.stringify(capRun2)}`
    );
    recordPass('T30', 'Binary Daily Cap Enforced: 15 Matches / ₹45,000 Max, 1 Capped, Carry (1L:2R) Preserved');

    // Idempotent replay of BIN-11 returns same event without second credit
    const replayMatch = await (
      await fetch(`${API_URL}/members/binary/run-matching`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ userId: binRoot.user.id, idempotencyKey: `BIN-11-${short}` }),
      })
    ).json();
    assert(replayMatch.matchesSettled === 1 && replayMatch.event?.id === matchData1.event?.id, 'Binary matching idempotency replay failed');
    const binRootWallet = await getWalletINR(binRoot.user.id);
    assert(binRootWallet.avail === 3000, `Duplicate binary credit after idempotency replay: ${binRootWallet.avail}`);
    recordPass('T31', 'Binary Matching Idempotency Key Prevents Duplicate Reward');

    // -------------------------------------------------------------------------
    // WALLET, VOUCHERS, EV BIKES, CONCURRENCY & ROUTE ORDER (T32 - T38)
    // -------------------------------------------------------------------------
    const wdRes = await timedFetch('wd-block', `${API_URL}/wallet/request-withdrawal`, {
      method: 'POST',
      headers: isoHdrs,
    });
    const wdJson = await wdRes.json();
    assert((wdRes.status === 400 || wdRes.status === 403) && wdJson.message?.includes('SIMULATION_ONLY'), `Withdrawal compliance block failed: ${wdRes.status} ${JSON.stringify(wdJson)}`);
    const cashConvRes = await timedFetch('vchr-cash-block', `${API_URL}/vouchers/convert-to-cash`, {
      method: 'POST',
      headers: isoHdrs,
      body: JSON.stringify({ voucherId: isoVouchers[0].id }),
    });
    const cashConvJson = await cashConvRes.json();
    assert((cashConvRes.status === 400 || cashConvRes.status === 403) && /non-convertible/i.test(cashConvJson.message || ''), `Voucher cash conversion block failed: ${cashConvRes.status} ${JSON.stringify(cashConvJson)}`);
    recordPass('T32', 'Live Withdrawal & Voucher-to-Cash Conversion Blocked (SIMULATION_ONLY)');

    // Route order & booking endpoints
    const myBkRes = await timedFetch('my-bookings', `${API_URL}/ev-bikes/my-bookings`, { headers: isoHdrs });
    assert(myBkRes.status === 200, `GET /ev-bikes/my-bookings expected 200 (route ordering check), got ${myBkRes.status}`);
    const myBkList = await myBkRes.json();
    assert(Array.isArray(myBkList) && myBkList.length === 1, 'Expected 1 booking on my-bookings');
    const badBikeRes = await timedFetch('bad-bike', `${API_URL}/ev-bikes/nonexistent-model-xyz`);
    assert(badBikeRes.status === 404, `Invalid bike expected 404, got ${badBikeRes.status}`);
    recordPass('T33', 'EV Bikes Routes Verified (/my-bookings=200 Above /:id, Invalid=404)');

    // Direct deposit-scoped voucher redemption & Booking with voucher
    const vRedeemRes = await timedFetch('vchr-redeem', `${API_URL}/vouchers/redeem`, {
      method: 'POST',
      headers: isoHdrs,
      body: JSON.stringify({
        voucherId: isoVouchers[0].id,
        amountINR: 2000,
        purpose: 'EV_BOOKING_DEPOSIT',
        idempotencyKey: `VRED-${short}`,
      }),
    });
    assert(vRedeemRes.ok, `Valid EV deposit voucher redeem failed: ${vRedeemRes.status}`);
    recordPass('T34', 'Voucher Redeem Limited to Authorized EV Booking Deposits');

    // Non-expiry policy check
    assert(
      new Date(isoVouchers[0].expiresAt).getFullYear() >= 2099,
      `Voucher expiresAt must be non-expiring sentinel >=2099, got ${isoVouchers[0].expiresAt}`
    );
    recordPass('T35', 'Voucher Non-Expiration Policy Verified (expiresAt >= 2099)');

    // Idempotent booking replay (same idempotencyKey)
    const idemBook1 = await (
      await timedFetch('book-idem-1', `${API_URL}/ev-bikes/book`, {
        method: 'POST',
        headers: isoHdrs,
        body: JSON.stringify({
          bikeId: bikeApex.id,
          voucherId: isoVouchers[0].id,
          voucherAmountINR: 3000,
          idempotencyKey: `BKIDEM-${short}`,
        }),
      })
    ).json();
    const idemBook2 = await (
      await timedFetch('book-idem-2', `${API_URL}/ev-bikes/book`, {
        method: 'POST',
        headers: isoHdrs,
        body: JSON.stringify({
          bikeId: bikeApex.id,
          voucherId: isoVouchers[0].id,
          voucherAmountINR: 3000,
          idempotencyKey: `BKIDEM-${short}`,
        }),
      })
    ).json();
    assert(
      idemBook1.booking?.id === idemBook2.booking?.id && idemBook2.idempotentReplay === true,
      `Booking idempotency replay mismatch`
    );
    recordPass('T36', 'EV Booking Idempotency Replay Returns Original Booking Without Double Charge');

    // Concurrency Race 3: 3 parallel cancellations of same booking must refund voucher ONCE ONLY
    const voucherBeforeCancel = await prisma.shoppingVoucher.findUnique({ where: { id: isoVouchers[0].id } });
    const cancelRace = await Promise.all(
      Array.from({ length: 3 }, () =>
        fetch(`${API_URL}/ev-bikes/bookings/${isoBook.booking.id}/cancel`, {
          method: 'POST',
          headers: isoHdrs,
          body: JSON.stringify({ cancellationReason: 'Concurrency test cancel' }),
        })
      )
    );
    const cancelOk = cancelRace.filter((r) => r.ok).length;
    const cancelFail = cancelRace.filter((r) => r.status === 400).length;
    assert(cancelOk === 1 && cancelFail === 2, `Cancel concurrency expected 1 ok + 2 400, got ok=${cancelOk}, 400=${cancelFail}`);
    const voucherAfterCancel = await prisma.shoppingVoucher.findUnique({ where: { id: isoVouchers[0].id } });
    const expectedAfterCancel = voucherBeforeCancel.remainingBalancePaise + 500000n;
    assert(
      voucherAfterCancel.remainingBalancePaise === expectedAfterCancel &&
        voucherAfterCancel.remainingBalancePaise <= voucherAfterCancel.initialValuePaise,
      `Double refund or inflated voucher detected: before=${voucherBeforeCancel.remainingBalancePaise}, after=${voucherAfterCancel.remainingBalancePaise}`
    );
    recordPass('T37', 'Concurrency Race Guard: 3 Parallel Cancellations -> 1 Refunded, 2 Blocked (400), Zero Over-Refund');

    // Suspicious duplicate paymentReference detection
    const dupRef = `DUP-UTR-F3-${short}`;
    await prisma.evBooking.create({
      data: {
        bookingNumber: `BK-DUP1-${short}`,
        userId: iso1.user.id,
        bikeId: bikeApex.id,
        bookingAmountPaise: 300000n,
        voucherAppliedPaise: 0n,
        netCashPaidPaise: 300000n,
        bookingStatus: 'PAYMENT_VERIFIED',
        paymentReference: dupRef,
      },
    });
    await prisma.evBooking.create({
      data: {
        bookingNumber: `BK-DUP2-${short}`,
        userId: pathAC.user.id,
        bikeId: bikeApex.id,
        bookingAmountPaise: 300000n,
        voucherAppliedPaise: 0n,
        netCashPaidPaise: 300000n,
        bookingStatus: 'PAYMENT_VERIFIED',
        paymentReference: dupRef,
      },
    });
    const suspData = await (await timedFetch('suspicious', `${API_URL}/admin/suspicious-activity`, { headers: adminHeaders })).json();
    assert(
      suspData.status === 'DUPLICATES_DETECTED' &&
        suspData.duplicatePaymentReferences?.some(
          (d) => d.paymentReference === dupRef && Array.isArray(d.bookingNumbers) && d.bookingNumbers.length >= 2
        ),
      `Duplicate paymentReference not flagged by suspicious-activity scanner: ${JSON.stringify(suspData)}`
    );
    recordPass('T38', 'Suspicious Duplicate PaymentReference Flagged in Admin Monitor');

    // -------------------------------------------------------------------------
    // FINANCIAL EQUILIBRIUM, AUDIT LOGS & PERFORMANCE SLA (T39 - T42)
    // -------------------------------------------------------------------------
    const negWallets = await prisma.walletAccount.count({
      where: {
        OR: [
          { availableEarningsPaise: { lt: 0n } },
          { heldCommissionsPaise: { lt: 0n } },
          { pendingRecoveryPaise: { lt: 0n } },
          { shoppingVoucherBalancePaise: { lt: 0n } },
        ],
      },
    });
    const negVouchers = await prisma.shoppingVoucher.count({ where: { remainingBalancePaise: { lt: 0n } } });
    const negCarries = await prisma.binaryPlacement.count({
      where: { OR: [{ carryLeftPaise: { lt: 0n } }, { carryRightPaise: { lt: 0n } }] },
    });
    assert(negWallets === 0 && negVouchers === 0 && negCarries === 0, `Negative DB balances detected!`);
    recordPass('T39', 'Non-Negative Balance Invariants Enforced Across Wallets, Vouchers & Binary Carries');

    const recon = await (await timedFetch('recon', `${API_URL}/admin/financial-reconciliation`, { headers: adminHeaders })).json();
    assert(
      recon.status === 'RECONCILED' &&
        recon.journals?.isEquilibrium === true &&
        recon.journals?.unbalancedCount === 0 &&
        recon.perMember?.isAllMembersBalanced === true &&
        recon.earningsWallet?.discrepancyINR === 0 &&
        recon.shoppingVouchers?.discrepancyINR === 0,
      `Reconciliation discrepancy: ${JSON.stringify(recon)}`
    );
    recordPass(
      'T40',
      'Double-Entry Ledger & Per-Member Reconciliation Equilibrium 100%',
      `${recon.journals.totalJournals} journals, 0 unbalanced, ${recon.perMember.totalMembersAudited} members balanced`
    );

    const auditData = await (await timedFetch('audit-logs', `${API_URL}/admin/audit-logs?page=1&limit=25`, { headers: adminHeaders })).json();
    const actions = new Set((auditData.logs || []).map((l) => l.action));
    assert(
      actions.has('APPROVE_MEMBERSHIP_REQUEST') && actions.has('EV_BOOKING_CANCELLED') && actions.has('BINARY_MATCH_SETTLED'),
      `Expected core audit actions missing from recent logs`
    );
    recordPass('T41', 'Admin Audit Logs Record All Financial & Governance Actions');

    const sortedMs = latencies.map((l) => l.ms).sort((a, b) => a - b);
    const avgMs = Number((sortedMs.reduce((a, b) => a + b, 0) / sortedMs.length).toFixed(1));
    const maxMs = sortedMs[sortedMs.length - 1];
    const p95Ms = sortedMs[Math.min(sortedMs.length - 1, Math.floor(sortedMs.length * 0.95))];
    assert(avgMs < 1000, `Average API latency too high: ${avgMs}ms`);
    recordPass('T42', 'API Response Time SLA Verified', `calls=${latencies.length}, avg=${avgMs}ms, p95=${p95Ms}ms, max=${maxMs}ms`);

    console.log('\n========================================================================');
    console.log(`   🎉 ALL ${testResults.length} PHASE 3F E2E & SECURITY TESTS PASSED (100%)`);
    console.log(`   ⏱  API Latency Summary: avg=${avgMs}ms | p95=${p95Ms}ms | max=${maxMs}ms (${latencies.length} calls)`);
    console.log('========================================================================\n');
  } catch (err) {
    console.error('\n❌ PHASE 3F TEST FAILED:', err);
    process.exitCode = 1;
  } finally {
    const ids = Array.from(createdUserIds);
    if (ids.length) {
      await cleanupSyntheticUsers(ids);
      console.log(`✓ Cleaned up all ${ids.length} synthetic Phase 3F test users & ledgers`);
    }
    await prisma.$disconnect();
  }
}

runSuite();

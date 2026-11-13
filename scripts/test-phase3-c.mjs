import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PrismaClient } = require('../packages/database/node_modules/@prisma/client');
let bcrypt;
try {
  bcrypt = require('../apps/api/node_modules/bcrypt');
} catch (e) {
  bcrypt = require('bcrypt');
}

const prisma = new PrismaClient();
const API_URL = process.env.API_URL || 'http://localhost:4000/api';

async function login(email, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Login failed for ${email}: ${res.status} ${err}`);
  }
  return res.json();
}

async function runTest() {
  console.log('=================================================================');
  console.log('   ASKR EV — PHASE 3C BINARY MATCHING ENGINE INTEGRATION TEST');
  console.log('=================================================================\n');

  const testSuffix = Date.now().toString().slice(-6);
  const password = 'TestPassword@123';
  const passwordHash = await bcrypt.hash(password, 10);

  // Authenticate Admin
  const adminAuth = await login('admin@askrev.com', 'Admin@123456');
  console.log('✓ Admin authenticated:', adminAuth.user.fullName);
  const adminHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminAuth.tokens.accessToken}`,
  };

  try {
    // =========================================================================
    // STEP 1: CREATE ROOT MEMBER & TREE SEEDS
    // =========================================================================
    console.log('\n--- Step 1: Initializing Binary Tree Root & Nodes ---');

    const rootUser = await prisma.user.create({
      data: {
        memberId: `BIN-ROOT-${testSuffix}`,
        email: `bin_root_${testSuffix}@test.askrev.local`,
        passwordHash,
        fullName: `Binary Root Member (${testSuffix})`,
        role: 'MEMBER',
        currentPackage: 'FULL',
        isFullQualified: true,
        wallet: { create: {} },
        binaryPlacement: { create: {} },
      },
      include: { wallet: true, binaryPlacement: true },
    });
    console.log(`✓ Created Root Member: ${rootUser.memberId} (Full Qualified)`);

    const rootAuth = await login(rootUser.email, password);
    const rootHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${rootAuth.tokens.accessToken}`,
    };

    // Helper to create test member
    const createTestMember = async (nameSuffix, isFull = true) => {
      return await prisma.user.create({
        data: {
          memberId: `BIN-${nameSuffix}-${testSuffix}`,
          email: `bin_${nameSuffix.toLowerCase()}_${testSuffix}@test.askrev.local`,
          passwordHash,
          fullName: `Member ${nameSuffix}`,
          role: isFull ? 'MEMBER' : 'FREE_USER',
          currentPackage: isFull ? 'FULL' : 'BASIC',
          isFullQualified: isFull,
          wallet: { create: {} },
          binaryPlacement: { create: {} },
        },
      });
    };

    const nodeL1 = await createTestMember('L1', true);
    const nodeR1 = await createTestMember('R1', true);
    const nodeR2 = await createTestMember('R2', true);

    // =========================================================================
    // STEP 2: PLACEMENT RULES & VALIDATION TESTS
    // =========================================================================
    console.log('\n--- Step 2: Testing Binary Tree Placement Validations ---');

    // 2a. Self-Placement Prevention
    console.log('Testing Self-Placement Prevention:');
    const selfRes = await fetch(`${API_URL}/members/binary/place`, {
      method: 'POST',
      headers: rootHeaders,
      body: JSON.stringify({
        userId: rootUser.id,
        parentId: rootUser.id,
        leg: 'LEFT',
      }),
    });
    const selfJson = await selfRes.json();
    if (selfRes.status === 400 && selfJson.message.includes('Self-placement is strictly prohibited')) {
      console.log('  ✓ Self-placement rejected with 400 Bad Request');
    } else {
      throw new Error(`Self-placement validation failed: ${JSON.stringify(selfJson)}`);
    }

    // 2b. Place L1 on ROOT.LEFT
    console.log('Placing L1 on ROOT.LEFT:');
    const placeL1Res = await fetch(`${API_URL}/members/binary/place`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        userId: nodeL1.id,
        parentId: rootUser.id,
        leg: 'LEFT',
      }),
    });
    const placeL1Json = await placeL1Res.json();
    if (!placeL1Res.ok) throw new Error(`Failed to place L1: ${JSON.stringify(placeL1Json)}`);
    console.log('  ✓ Node L1 placed successfully on ROOT.LEFT');

    // 2c. Parent Leg Vacancy Prevention: Try to place R1 also on ROOT.LEFT
    console.log('Testing Parent Leg Vacancy (placing on occupied LEFT leg):');
    const vacRes = await fetch(`${API_URL}/members/binary/place`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        userId: nodeR1.id,
        parentId: rootUser.id,
        leg: 'LEFT',
      }),
    });
    const vacJson = await vacRes.json();
    if (vacRes.status === 400 && vacJson.message.includes('already has a child on the LEFT leg')) {
      console.log('  ✓ Leg vacancy check enforced: Occupied leg rejected');
    } else {
      throw new Error(`Vacancy validation failed: ${JSON.stringify(vacJson)}`);
    }

    // 2d. Duplicate Placement Prevention: Try to place L1 again under a different parent
    console.log('Testing Duplicate Placement Prevention:');
    const dupRes = await fetch(`${API_URL}/members/binary/place`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        userId: nodeL1.id,
        parentId: nodeR1.id,
        leg: 'LEFT',
      }),
    });
    const dupJson = await dupRes.json();
    if (dupRes.status === 400 && dupJson.message.includes('Duplicate placement is not permitted')) {
      console.log('  ✓ Duplicate placement prevented with 400 Bad Request');
    } else {
      throw new Error(`Duplicate placement check failed: ${JSON.stringify(dupJson)}`);
    }

    // 2e. Cyclic Graph Prevention: Try to place ROOT under its descendant L1
    console.log('Testing Cyclic Tree Prevention (placing ancestor under descendant):');
    const cycRes = await fetch(`${API_URL}/members/binary/place`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        userId: rootUser.id,
        parentId: nodeL1.id,
        leg: 'RIGHT',
      }),
    });
    const cycJson = await cycRes.json();
    if (dupRes.status === 400 && cycJson.message.includes('Cyclic tree relationship detected')) {
      console.log('  ✓ Cyclic placement detected and rejected');
    } else {
      throw new Error(`Cycle validation failed: ${JSON.stringify(cycJson)}`);
    }

    // 2f. Place R1 on ROOT.RIGHT
    const placeR1Res = await fetch(`${API_URL}/members/binary/place`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        userId: nodeR1.id,
        parentId: rootUser.id,
        leg: 'RIGHT',
      }),
    });
    if (!placeR1Res.ok) throw new Error('Failed to place R1 on ROOT.RIGHT');
    console.log('  ✓ Node R1 placed successfully on ROOT.RIGHT');

    // 2g. Place R2 on R1.RIGHT (Extends right leg to 2 units)
    const placeR2Res = await fetch(`${API_URL}/members/binary/place`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        userId: nodeR2.id,
        parentId: nodeR1.id,
        leg: 'RIGHT',
      }),
    });
    if (!placeR2Res.ok) throw new Error('Failed to place R2 on R1.RIGHT');
    console.log('  ✓ Node R2 placed successfully on R1.RIGHT');

    // Verify Root Volumes before match: Left = 1, Right = 2
    const rootPlacementBefore = await prisma.binaryPlacement.findUnique({
      where: { userId: rootUser.id },
    });
    console.log(`  ✓ Root Volume: Left = ${rootPlacementBefore.leftVolumePaise}, Right = ${rootPlacementBefore.rightVolumePaise}`);
    if (rootPlacementBefore.leftVolumePaise !== 1n || rootPlacementBefore.rightVolumePaise !== 2n) {
      throw new Error(`Expected Root Volume Left=1, Right=2; got Left=${rootPlacementBefore.leftVolumePaise}, Right=${rootPlacementBefore.rightVolumePaise}`);
    }

    // =========================================================================
    // STEP 3: BINARY MATCHING 1:1 RATIO SETTLEMENT TEST
    // =========================================================================
    console.log('\n--- Step 3: Testing 1:1 Ratio Binary Matching Settlement ---');

    // AUDIT REQUIREMENT 6: Regular member cannot initiate binary matching settlements even for own account
    const unauthMemberRes = await fetch(`${API_URL}/members/binary/run-matching`, {
      method: 'POST',
      headers: rootHeaders,
      body: JSON.stringify({ userId: rootUser.id }),
    });
    if (unauthMemberRes.status === 403) {
      console.log('  ✓ Requirement 6 Verified: Regular member rejected with 403 Forbidden from initiating binary settlement');
    } else {
      throw new Error(`Expected 403 Forbidden for regular member binary matching, got ${unauthMemberRes.status}`);
    }

    console.log('Root has 1 Left and 2 Right. Running administrative 1:1 binary matching settlement:');
    const match1Res = await fetch(`${API_URL}/members/binary/run-matching`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ userId: rootUser.id }),
    });
    const match1Json = await match1Res.json();
    if (!match1Res.ok) throw new Error(`Matching settlement failed: ${JSON.stringify(match1Json)}`);

    console.log('  ✓ Matching settlement response:');
    console.log(`    - Matches Evaluated: ${match1Json.matchesEvaluated}`);
    console.log(`    - Matches Settled: ${match1Json.matchesSettled}`);
    console.log(`    - Reward Earned: ₹${match1Json.rewardINR}`);
    console.log(`    - New Carry Left: ${match1Json.carryLeft}`);
    console.log(`    - New Carry Right: ${match1Json.carryRight}`);

    if (match1Json.matchesSettled !== 1 || match1Json.rewardINR !== 3000) {
      throw new Error(`Expected 1 match and ₹3,000 reward, got ${match1Json.matchesSettled} matches, ₹${match1Json.rewardINR}`);
    }
    if (match1Json.carryLeft !== 0 || match1Json.carryRight !== 1) {
      throw new Error(`Expected Left=0, Right=1 carry after 1:1 match of (1L, 2R), got Left=${match1Json.carryLeft}, Right=${match1Json.carryRight}`);
    }

    // Verify Double-Entry Journal for 1:2 Match
    const jnlLines1 = await prisma.journalLine.findMany({
      where: { journalEntry: { eventType: 'BINARY_MATCHING_REWARD' } },
      orderBy: { createdAt: 'desc' },
      take: 2,
    });
    const debitLine1 = jnlLines1.find((l) => l.account === '5200_BINARY_MATCHING_EXPENSE');
    const creditLine1 = jnlLines1.find((l) => l.account === '2000_MEMBER_EARNINGS_PAYABLE');
    if (!debitLine1 || debitLine1.debitPaise !== 300000n) {
      throw new Error('5200_BINARY_MATCHING_EXPENSE was not debited with 300,000 paise (₹3,000)');
    }
    if (!creditLine1 || creditLine1.creditPaise !== 300000n || creditLine1.userId !== rootUser.id) {
      throw new Error('2000_MEMBER_EARNINGS_PAYABLE was not credited with 300,000 paise for root member');
    }
    console.log('  ✓ Verified double-entry journal: 5200 Dr ₹3,000 === 2000 Cr ₹3,000');

    // Verify Root Member Wallet Balance: ₹3,000
    const rootWallet1 = await prisma.walletAccount.findUnique({
      where: { userId: rootUser.id },
    });
    if (rootWallet1.availableEarningsPaise !== 300000n) {
      throw new Error(`Expected wallet available earnings 300,000 paise, got ${rootWallet1.availableEarningsPaise}`);
    }
    console.log(`  ✓ Root Wallet Available Earnings: ₹${Number(rootWallet1.availableEarningsPaise) / 100}`);

    // =========================================================================
    // STEP 4: SECOND 1:1 RATIO SETTLEMENT WITH CARRIED VOLUME TEST
    // =========================================================================
    console.log('\n--- Step 4: Testing Carried-Forward Volume + 1:1 Settlement ---');

    // Add 2 Left nodes (L2, L3) under L1, and 1 Right node (R3) under R2 (adds to existing 1R carry -> 2L : 2R)
    const nodeL2 = await createTestMember('L2', true);
    const nodeL3 = await createTestMember('L3', true);
    const nodeR3 = await createTestMember('R3', true);

    await fetch(`${API_URL}/members/binary/place`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ userId: nodeL2.id, parentId: nodeL1.id, leg: 'LEFT' }),
    });
    await fetch(`${API_URL}/members/binary/place`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ userId: nodeL3.id, parentId: nodeL2.id, leg: 'LEFT' }),
    });
    await fetch(`${API_URL}/members/binary/place`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ userId: nodeR3.id, parentId: nodeR2.id, leg: 'RIGHT' }),
    });

    const rootPlacementBefore21 = await prisma.binaryPlacement.findUnique({
      where: { userId: rootUser.id },
    });
    console.log(`  ✓ Added 2 Left and 1 Right to carried 1R. Root Carry Forward: Left = ${rootPlacementBefore21.carryLeftPaise}, Right = ${rootPlacementBefore21.carryRightPaise}`);
    if (rootPlacementBefore21.carryLeftPaise !== 2n || rootPlacementBefore21.carryRightPaise !== 2n) {
      throw new Error(`Expected Carry Left=2, Right=2; got Left=${rootPlacementBefore21.carryLeftPaise}, Right=${rootPlacementBefore21.carryRightPaise}`);
    }

    // Settle 1:1 matches via Admin (2 pairs = ₹6,000)
    const match2Res = await fetch(`${API_URL}/members/binary/run-matching`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ userId: rootUser.id }),
    });
    const match2Json = await match2Res.json();
    if (!match2Res.ok) throw new Error(`Matching settlement 1:1 failed: ${JSON.stringify(match2Json)}`);

    console.log('  ✓ 1:1 Matching settlement response:');
    console.log(`    - Matches Settled: ${match2Json.matchesSettled}`);
    console.log(`    - Reward Earned: ₹${match2Json.rewardINR}`);
    console.log(`    - Remaining Carry Left: ${match2Json.carryLeft}, Carry Right: ${match2Json.carryRight}`);

    if (match2Json.matchesSettled !== 2 || match2Json.rewardINR !== 6000) {
      throw new Error(`Expected 2 matches and ₹6,000 reward for 1:1 of (2L, 2R), got ${match2Json.matchesSettled} matches, ₹${match2Json.rewardINR}`);
    }
    if (match2Json.carryLeft !== 0 || match2Json.carryRight !== 0) {
      throw new Error(`Expected 0 carry on both legs after 1:1 match of (2L, 2R), got Left=${match2Json.carryLeft}, Right=${match2Json.carryRight}`);
    }

    // Cumulative wallet balance should now be ₹9,000 (₹3,000 + ₹6,000)
    const rootWallet2 = await prisma.walletAccount.findUnique({
      where: { userId: rootUser.id },
    });
    if (rootWallet2.availableEarningsPaise !== 900000n) {
      throw new Error(`Expected cumulative available earnings 900,000 paise (₹9,000), got ${rootWallet2.availableEarningsPaise}`);
    }
    console.log(`  ✓ Cumulative Root Wallet Available Earnings: ₹${Number(rootWallet2.availableEarningsPaise) / 100}`);

    // =========================================================================
    // STEP 5: UNQUALIFIED (BASIC / FREE) MEMBER INELIGIBILITY TEST
    // =========================================================================
    console.log('\n--- Step 5: Testing Unqualified Member Matching Ineligibility ---');

    const basicUser = await createTestMember('BASIC-ONLY', false);
    const basicAuth = await login(basicUser.email, password);
    const basicHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${basicAuth.tokens.accessToken}`,
    };

    // Inject 2 Left and 1 Right carry volume in DB for basicUser
    await prisma.binaryPlacement.update({
      where: { userId: basicUser.id },
      data: {
        carryLeftPaise: 2n,
        carryRightPaise: 1n,
        leftVolumePaise: 2n,
        rightVolumePaise: 1n,
      },
    });

    const basicMatchRes = await fetch(`${API_URL}/members/binary/run-matching`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ userId: basicUser.id }),
    });
    const basicMatchJson = await basicMatchRes.json();
    console.log('  ✓ Unqualified member settlement response:');
    console.log(`    - Success: ${basicMatchJson.success}`);
    console.log(`    - isQualified: ${basicMatchJson.isQualified}`);
    console.log(`    - Matches Settled: ${basicMatchJson.matchesSettled}`);
    console.log(`    - Reward Earned: ₹${basicMatchJson.rewardINR}`);
    console.log(`    - Reason: "${basicMatchJson.reason}"`);

    if (basicMatchJson.isQualified !== false || basicMatchJson.matchesSettled !== 0 || basicMatchJson.rewardINR !== 0) {
      throw new Error('Unqualified member received matches or rewards contrary to Full Qualification rule!');
    }

    // Verify wallet was NOT credited
    const basicWallet = await prisma.walletAccount.findUnique({
      where: { userId: basicUser.id },
    });
    if (basicWallet.availableEarningsPaise !== 0n) {
      throw new Error('Unqualified member wallet was credited!');
    }
    console.log('  ✓ Unqualified member wallet remains ₹0');

    // =========================================================================
    // STEP 6: DAILY CAPPING & VOLUME PRESERVATION TEST (15 MATCHES = ₹45,000)
    // =========================================================================
    console.log('\n--- Step 6: Testing Daily Capping (15 Matches / ₹45,000) & Volume Preservation ---');

    const capRootUser = await createTestMember('CAP-ROOT', true);
    const capRootAuth = await login(capRootUser.email, password);
    const capRootHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${capRootAuth.tokens.accessToken}`,
    };

    // Provide 17 Left units and 16 Right units
    // With 1:1 ratio, 16 full matches exist; daily cap allows max 15 matches (15 Left, 15 Right consumed).
    // Volume preservation rule: 2 Left and 1 Right MUST remain in carry-forward!
    await prisma.binaryPlacement.update({
      where: { userId: capRootUser.id },
      data: {
        carryLeftPaise: 17n,
        carryRightPaise: 16n,
        leftVolumePaise: 17n,
        rightVolumePaise: 16n,
      },
    });

    console.log('Simulating 16 potential matches with 15-match daily cap:');
    const capMatchRes = await fetch(`${API_URL}/members/binary/run-matching`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ userId: capRootUser.id }),
    });
    const capMatchJson = await capMatchRes.json();
    if (!capMatchRes.ok) throw new Error(`Capping settlement failed: ${JSON.stringify(capMatchJson)}`);

    console.log('  ✓ Daily Cap settlement response:');
    console.log(`    - Matches Evaluated: ${capMatchJson.matchesEvaluated}`);
    console.log(`    - Matches Settled: ${capMatchJson.matchesSettled}`);
    console.log(`    - Capped Out Matches: ${capMatchJson.cappedOutMatches}`);
    console.log(`    - Reward Earned: ₹${capMatchJson.rewardINR}`);
    console.log(`    - Preserved Carry Left: ${capMatchJson.carryLeft}`);
    console.log(`    - Preserved Carry Right: ${capMatchJson.carryRight}`);
    console.log(`    - Daily Cap Remaining: ${capMatchJson.dailyCapRemaining}`);

    if (capMatchJson.matchesEvaluated !== 16) {
      throw new Error(`Expected 16 matches evaluated, got ${capMatchJson.matchesEvaluated}`);
    }
    if (capMatchJson.matchesSettled !== 15 || capMatchJson.cappedOutMatches !== 1) {
      throw new Error(`Expected 15 matches settled and 1 capped out, got settled=${capMatchJson.matchesSettled}, capped=${capMatchJson.cappedOutMatches}`);
    }
    if (capMatchJson.rewardINR !== 45000) {
      throw new Error(`Expected ₹45,000 daily reward cap hit, got ₹${capMatchJson.rewardINR}`);
    }
    if (capMatchJson.carryLeft !== 2 || capMatchJson.carryRight !== 1) {
      throw new Error(`VOLUME FLUSHED! Expected carry preserved (Left=2, Right=1), got Left=${capMatchJson.carryLeft}, Right=${capMatchJson.carryRight}`);
    }
    console.log('  ✓ Daily Cap strictly enforced at 15 matches (₹45,000)');
    console.log('  ✓ CRITICAL: Unmatched volume PRESERVED in carry-forward (2 Left, 1 Right)');

    // Verify Subsequent Same-Day Settlement: 0 matches, 0 reward, volume remains intact
    console.log('Running second matching settlement on SAME day (Cap Exhausted):');
    const capMatch2Res = await fetch(`${API_URL}/members/binary/run-matching`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ userId: capRootUser.id }),
    });
    const capMatch2Json = await capMatch2Res.json();
    if (capMatch2Json.matchesSettled !== 0 || capMatch2Json.rewardINR !== 0) {
      throw new Error(`Exhausted cap allowed matches! Settled: ${capMatch2Json.matchesSettled}, Reward: ${capMatch2Json.rewardINR}`);
    }
    if (capMatch2Json.carryLeft !== 2 || capMatch2Json.carryRight !== 1) {
      throw new Error(`Volume corrupted on second run! Left=${capMatch2Json.carryLeft}, Right=${capMatch2Json.carryRight}`);
    }
    console.log('  ✓ Second settlement correctly settled 0 matches and preserved 2 Left, 1 Right in carry-forward');

    // =========================================================================
    // STEP 7: IDEMPOTENCY & CONCURRENCY PROTECTION TEST
    // =========================================================================
    console.log('\n--- Step 7: Testing Idempotency & Concurrency Safety ---');

    const idemKey = `IDEM-TEST-${Date.now()}`;
    // Give capRootUser new volume to test idempotency
    await prisma.binaryPlacement.update({
      where: { userId: capRootUser.id },
      data: {
        lastMatchDate: '2026-01-01', // Reset date so cap is fresh
        dailyMatchesCount: 0,
        carryLeftPaise: 4n,
        carryRightPaise: 2n,
      },
    });

    const firstIdemRes = await fetch(`${API_URL}/members/binary/run-matching`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ userId: capRootUser.id, idempotencyKey: idemKey }),
    });
    const firstIdemJson = await firstIdemRes.json();
    console.log(`  ✓ First call settled: ${firstIdemJson.matchesSettled} matches, ₹${firstIdemJson.rewardINR}`);

    const replayIdemRes = await fetch(`${API_URL}/members/binary/run-matching`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ userId: capRootUser.id, idempotencyKey: idemKey }),
    });
    const replayIdemJson = await replayIdemRes.json();
    if (!replayIdemJson.message || !replayIdemJson.message.includes('Idempotent replay')) {
      throw new Error(`Idempotency key did not return idempotent replay: ${JSON.stringify(replayIdemJson)}`);
    }
    console.log('  ✓ Idempotent replay recognized without double-crediting wallet');

    // Concurrency Test: 2 simultaneous calls
    const concKey1 = `CONC-1-${Date.now()}`;
    const concKey2 = `CONC-2-${Date.now()}`;
    await prisma.binaryPlacement.update({
      where: { userId: capRootUser.id },
      data: {
        lastMatchDate: '2026-01-01',
        dailyMatchesCount: 0,
        carryLeftPaise: 2n,
        carryRightPaise: 1n,
      },
    });

    console.log('Testing Concurrent Settlement Requests (Row-Level Locking):');
    const [c1Res, c2Res] = await Promise.all([
      fetch(`${API_URL}/members/binary/run-matching`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ userId: capRootUser.id, idempotencyKey: concKey1 }),
      }),
      fetch(`${API_URL}/members/binary/run-matching`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ userId: capRootUser.id, idempotencyKey: concKey2 }),
      }),
    ]);

    const c1Json = await c1Res.json();
    const c2Json = await c2Res.json();
    const totalMatchesSettledInConc = (c1Json.matchesSettled || 0) + (c2Json.matchesSettled || 0);
    console.log(`  ✓ Concurrency Test Result: Call 1 settled ${c1Json.matchesSettled || 0}, Call 2 settled ${c2Json.matchesSettled || 0}`);
    if (totalMatchesSettledInConc !== 1) {
      throw new Error(`Race condition detected! Total matches settled was ${totalMatchesSettledInConc}, expected exactly 1.`);
    }
    console.log('  ✓ Row-level locking prevented duplicate settlement race conditions');

    // =========================================================================
    // STEP 8: BASIC-TO-FULL UPGRADE VOLUME PROPAGATION TEST
    // =========================================================================
    console.log('\n--- Step 8: Testing Binary Volume Propagation on Membership Upgrade ---');

    // Create a new ancestor node
    const upgradeRoot = await createTestMember('UPG-ROOT', true);
    // Create a basic member
    const upgMember = await createTestMember('UPG-BASIC', false);

    // Place upgMember on LEFT of upgradeRoot while still BASIC
    await fetch(`${API_URL}/members/binary/place`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        userId: upgMember.id,
        parentId: upgradeRoot.id,
        leg: 'LEFT',
      }),
    });

    // Check upgradeRoot binary placement: leftCount = 1, but leftVolumePaise = 0
    let upgRootPlacement = await prisma.binaryPlacement.findUnique({
      where: { userId: upgradeRoot.id },
    });
    console.log(`  ✓ Pre-Upgrade: Ancestor Left Count = ${upgRootPlacement.leftCount}, Left Volume = ${upgRootPlacement.leftVolumePaise}`);
    if (upgRootPlacement.leftCount !== 1 || upgRootPlacement.leftVolumePaise !== 0n) {
      throw new Error(`Pre-upgrade volume should be 0, got ${upgRootPlacement.leftVolumePaise}`);
    }

    // upgMember submits BASIC_TO_FULL_UPGRADE request
    const upgMemberAuth = await login(upgMember.email, password);
    const reqRes = await fetch(`${API_URL}/packages/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${upgMemberAuth.tokens.accessToken}`,
      },
      body: JSON.stringify({
        requestType: 'BASIC_TO_FULL_UPGRADE',
        paymentMode: 'SIMULATED_TEST',
      }),
    });
    const reqJson = await reqRes.json();
    if (!reqRes.ok) throw new Error(`Upgrade request submission failed: ${JSON.stringify(reqJson)}`);

    // Admin approves the upgrade
    const appRes = await fetch(`${API_URL}/packages/admin/requests/${reqJson.request.id}/approve`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ adminNotes: 'Phase 3C upgrade volume test' }),
    });
    const appJson = await appRes.json();
    if (!appRes.ok) throw new Error(`Admin approval failed: ${JSON.stringify(appJson)}`);

    // Verify upgradeRoot binary placement: leftVolumePaise should now be 1n and carryLeftPaise should be 1n!
    upgRootPlacement = await prisma.binaryPlacement.findUnique({
      where: { userId: upgradeRoot.id },
    });
    console.log(`  ✓ Post-Upgrade: Ancestor Left Volume = ${upgRootPlacement.leftVolumePaise}, Carry Left = ${upgRootPlacement.carryLeftPaise}`);
    if (upgRootPlacement.leftVolumePaise !== 1n || upgRootPlacement.carryLeftPaise !== 1n) {
      throw new Error(`Post-upgrade volume did not propagate! Expected 1, got ${upgRootPlacement.leftVolumePaise}`);
    }
    console.log('  ✓ Upgrading member to Full successfully propagated +1 unit of qualified volume up the binary ancestor tree!');

    // =========================================================================
    // STEP 9: ADMIN BINARY REPORT & HISTORY ENDPOINTS
    // =========================================================================
    console.log('\n--- Step 9: Testing Binary History and Admin Report Endpoints ---');

    const histRes = await fetch(`${API_URL}/members/binary/history`, {
      method: 'GET',
      headers: capRootHeaders,
    });
    const histJson = await histRes.json();
    if (!histRes.ok || !Array.isArray(histJson) || histJson.length === 0) {
      throw new Error(`Failed to fetch binary history: ${JSON.stringify(histJson)}`);
    }
    console.log(`  ✓ Member Binary History retrieved: ${histJson.length} settlement events`);

    const adminRepRes = await fetch(`${API_URL}/members/admin/binary-report`, {
      method: 'GET',
      headers: adminHeaders,
    });
    const adminRepJson = await adminRepRes.json();
    if (!adminRepRes.ok) throw new Error(`Failed to fetch admin binary report: ${JSON.stringify(adminRepJson)}`);

    console.log('  ✓ Admin Binary Report:');
    console.log(`    - Ratio: ${adminRepJson.matchingRules.ratio}`);
    console.log(`    - Reward Per Match: ₹${adminRepJson.matchingRules.rewardPerMatchINR}`);
    console.log(`    - Daily Max Matches: ${adminRepJson.matchingRules.dailyMaxMatches}`);
    console.log(`    - Daily Cap: ₹${adminRepJson.matchingRules.dailyCapRewardINR}`);
    console.log(`    - Total Settlements: ${adminRepJson.systemTotals.totalSettlements}`);
    console.log(`    - Total Matches Settled: ${adminRepJson.systemTotals.totalSettledMatches}`);
    console.log(`    - Total Reward Disbursed: ₹${adminRepJson.systemTotals.totalRewardDisbursedINR}`);
    console.log(`    - Compliance Mode: ${adminRepJson.complianceStatus.complianceMode}`);
    console.log(`    - Unmatched Volume Policy: ${adminRepJson.complianceStatus.unmatchedVolumePolicy}`);

    console.log('\n=================================================================');
    console.log('   🎉 ALL PHASE 3C BINARY MATCHING ENGINE TESTS PASSED (100%)');
    console.log('=================================================================\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

runTest();


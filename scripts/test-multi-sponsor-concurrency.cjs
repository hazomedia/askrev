/**
 * ASKR EV — MULTI-SPONSOR POWER LEG CONCURRENCY TEST
 *
 * Verifies that simultaneous registrations originating from DIFFERENT sponsors
 * who share the same Power Leg serialize safely and place cleanly without collisions,
 * utilizing PostgreSQL transaction advisory locks and SAVEPOINT-based conflict retries.
 */

const { PrismaClient } = require('d:/Projects/AskrEV/apps/api/node_modules/@prisma/client');
const { BinaryPlacementService } = require('d:/Projects/AskrEV/apps/api/dist/members/binary-placement.service');

const REHEARSAL_DB_URL = 'postgresql://postgres:postgres@localhost:5432/askrev_rehearsal_disposable?schema=public';

const prisma = new PrismaClient({
  datasources: { db: { url: REHEARSAL_DB_URL } },
});

async function main() {
  console.log('=== MULTI-SPONSOR POWER LEG CONCURRENCY TEST ===');
  console.log('Target: Local Rehearsal Database (PostgreSQL 17)');

  // 1. First run migration so tree is established
  const { execSync } = require('child_process');
  execSync(
    `node scripts/migrate-production-directional-binary.cjs --execute-rehearsal --rehearsal-db-url "${REHEARSAL_DB_URL}"`,
    { stdio: 'pipe' }
  );
  console.log('Directional tree established on rehearsal database.');

  // 2. Identify 3 DIFFERENT sponsors sharing the LEFT Power Leg
  const sponA = await prisma.user.findUnique({ where: { memberId: 'ASKR-196200' } });
  const sponB = await prisma.user.findUnique({ where: { memberId: 'ASKR-244795' } });
  const sponC = await prisma.user.findUnique({ where: { memberId: 'ASKR-221132' } });

  console.log(`Sponsor A: ${sponA.memberId} (ID: ${sponA.id})`);
  console.log(`Sponsor B: ${sponB.memberId} (ID: ${sponB.id}) - downline of A`);
  console.log(`Sponsor C: ${sponC.memberId} (ID: ${sponC.id}) - downline of B`);

  // 3. Create 6 distinct candidate users
  const candidates = [
    { memberId: 'CONCUR-A1', fullName: 'Candidate A1', sponsorId: sponA.id },
    { memberId: 'CONCUR-B1', fullName: 'Candidate B1', sponsorId: sponB.id },
    { memberId: 'CONCUR-C1', fullName: 'Candidate C1', sponsorId: sponC.id },
    { memberId: 'CONCUR-A2', fullName: 'Candidate A2', sponsorId: sponA.id },
    { memberId: 'CONCUR-B2', fullName: 'Candidate B2', sponsorId: sponB.id },
    { memberId: 'CONCUR-C2', fullName: 'Candidate C2', sponsorId: sponC.id },
  ];

  const candidateUsers = [];
  for (const c of candidates) {
    // Delete if existing from previous run
    await prisma.binaryPlacement.deleteMany({ where: { user: { memberId: c.memberId } } });
    await prisma.walletAccount.deleteMany({ where: { user: { memberId: c.memberId } } });
    await prisma.user.deleteMany({ where: { memberId: c.memberId } });

    const u = await prisma.user.create({
      data: {
        memberId: c.memberId,
        email: `${c.memberId.toLowerCase()}@example.com`,
        fullName: c.fullName,
        passwordHash: 'dummy',
        sponsorId: c.sponsorId,
        intendedBinarySide: 'LEFT',
      },
    });
    candidateUsers.push(u);
  }

  console.log(`Created ${candidateUsers.length} test users across 3 different sponsors on LEFT leg.`);

  // 4. Instantiate BinaryPlacementService
  const binaryPlacementService = new BinaryPlacementService(prisma);

  // 5. Fire SIMULTANEOUS concurrent registrations using actual database transactions
  console.log('\n--- Launching 6 Simultaneous Concurrent Transactions ---');
  const startTime = Date.now();

  const results = await Promise.all(
    candidateUsers.map((user) =>
      prisma.$transaction(
        async (tx) => {
          return await binaryPlacementService.placeMemberOnRegistration(
            tx,
            user.id,
            user.sponsorId,
            'LEFT'
          );
        },
        { maxWait: 15000, timeout: 30000 }
      )
    )
  );

  const duration = Date.now() - startTime;
  console.log(`All 6 concurrent registrations completed in ${duration}ms!`);

  // 6. Verification
  console.log('\n--- Verification of Placements ---');
  const assignedSlots = new Set();
  const parentIds = new Set();

  for (let i = 0; i < results.length; i++) {
    const res = results[i];
    const candidate = candidates[i];
    const slotKey = `${res.parentId}_${res.leg}`;

    console.log(
      `${candidate.memberId} (Sponsor: ${candidate.sponsorId.slice(0, 8)}) -> Parent: ${res.parentId} | Leg: ${res.leg} | Ancestors Updated: ${res.affectedAncestors.length}`
    );

    if (assignedSlots.has(slotKey)) {
      throw new Error(`COLLISION DETECTED: Multiple users assigned to slot ${slotKey}!`);
    }
    assignedSlots.add(slotKey);
    parentIds.add(res.parentId);

    if (res.leg !== 'LEFT') {
      throw new Error(`VIOLATION: Expected leg LEFT, found ${res.leg}`);
    }
  }

  if (assignedSlots.size !== 6) {
    throw new Error(`Expected 6 distinct slots, found ${assignedSlots.size}`);
  }

  console.log('\n>>> MULTI-SPONSOR CONCURRENCY TEST PASSED (6/6 UNIQUE SLOTS, 0 COLLISIONS) <<<');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Concurrency test failed:', e);
  process.exit(1);
});

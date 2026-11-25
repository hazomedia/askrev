const fs = require('fs');
const path = require('path');

// 1. Load UAT environment
const envPath = path.resolve('.env.uat');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

const dbUrl = process.env.DATABASE_URL || process.env.UAT_DATABASE_URL || '';

// STRICT PROTECTION CHECK
if (!dbUrl.includes('nozomi.proxy.rlwy.net:28651')) {
  console.error('FATAL: Script MUST only run against isolated UAT environment (nozomi.proxy.rlwy.net:28651)!');
  console.error('Current DATABASE_URL:', dbUrl.replace(/:[^:@]+@/, ':***@'));
  process.exit(1);
}

if (dbUrl.includes('trolley.proxy.rlwy.net:41036')) {
  console.error('FATAL: Attempted execution against PRODUCTION database (trolley)! ABORTING IMMEDIATELY!');
  process.exit(1);
}

const { PrismaClient } = require('d:/Projects/AskrEV/apps/api/node_modules/@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: { url: dbUrl },
  },
});

function serializeBigInt(obj) {
  return JSON.parse(
    JSON.stringify(obj, (key, value) => (typeof value === 'bigint' ? value.toString() : value))
  );
}

async function getFinancialAuditMetrics() {
  const journals = await prisma.journalEntry.findMany({
    include: { lines: true },
  });

  let totalDebits = 0n;
  let totalCredits = 0n;
  let unbalancedCount = 0;

  for (const j of journals) {
    let d = 0n;
    let c = 0n;
    for (const l of j.lines) {
      d += BigInt(l.debitPaise || 0);
      c += BigInt(l.creditPaise || 0);
    }
    if (d !== c) unbalancedCount++;
    totalDebits += d;
    totalCredits += c;
  }

  const baselineUsers = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    take: 28,
    include: { wallet: true },
  });

  let totalAvailableEarnings = 0n;
  let totalHeldCommissions = 0n;
  for (const u of baselineUsers) {
    if (u.wallet) {
      totalAvailableEarnings += BigInt(u.wallet.availableEarningsPaise || 0);
      totalHeldCommissions += BigInt(u.wallet.heldCommissionsPaise || 0);
    }
  }

  const vouchers = await prisma.shoppingVoucher.findMany();
  let totalVouchers = 0n;
  for (const v of vouchers) {
    totalVouchers += BigInt(v.remainingBalancePaise || 0);
  }

  return {
    totalJournals: journals.length,
    unbalancedJournals: unbalancedCount,
    totalDebits,
    totalCredits,
    totalAvailableEarnings,
    totalHeldCommissions,
    totalVouchers,
    voucherCount: vouchers.length,
  };
}

async function main() {
  console.log('=== ASKR EV — UAT 28 ACCOUNTS DIRECTIONAL BINARY RESTRUCTURING ===');
  console.log('Target Database: nozomi.proxy.rlwy.net:28651 (UAT ISOLATED)');

  // 1. Audit before restructuring
  const preAudit = await getFinancialAuditMetrics();
  console.log('\n--- PRE-RESTRUCTURING FINANCIAL AUDIT ---');
  console.log(`Journals: ${preAudit.totalJournals} | Unbalanced: ${preAudit.unbalancedJournals}`);
  console.log(`Debits: ₹${Number(preAudit.totalDebits) / 100} | Credits: ₹${Number(preAudit.totalCredits) / 100}`);
  console.log(`28 Baseline Available Earnings: ₹${Number(preAudit.totalAvailableEarnings) / 100}`);
  console.log(`28 Baseline Held Commissions: ₹${Number(preAudit.totalHeldCommissions) / 100}`);
  console.log(`Shopping Vouchers (${preAudit.voucherCount}): ₹${Number(preAudit.totalVouchers) / 100}`);

  // Fetch the 28 baseline users
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    take: 28,
    include: {
      sponsor: { select: { id: true, memberId: true } },
      binaryPlacement: true,
    },
  });

  if (users.length !== 28) {
    throw new Error(`Expected exactly 28 baseline accounts, found ${users.length}`);
  }

  const superAdmin = users[0];
  if (superAdmin.role !== 'SUPER_ADMIN') {
    throw new Error(`First user must be SUPER_ADMIN, found ${superAdmin.role} (${superAdmin.memberId})`);
  }

  console.log(`\nIdentified Root: ${superAdmin.memberId} (${superAdmin.fullName})`);

  console.log('\nResetting existing placements for 28 baseline accounts...');
  for (const u of users) {
    await prisma.binaryPlacement.upsert({
      where: { userId: u.id },
      create: {
        userId: u.id,
        parentId: null,
        leg: null,
        leftCount: 0,
        rightCount: 0,
        leftVolumePaise: 0n,
        rightVolumePaise: 0n,
        carryLeftPaise: 0n,
        carryRightPaise: 0n,
      },
      update: {
        parentId: null,
        leg: null,
        leftCount: 0,
        rightCount: 0,
        leftVolumePaise: 0n,
        rightVolumePaise: 0n,
        carryLeftPaise: 0n,
        carryRightPaise: 0n,
      },
    });
  }

  console.log('Executing Strict Directional Registration Placement for 27 members...');
  const placedMembers = [];

  // Process members 2 to 28 in strict chronological order
  for (let i = 1; i < users.length; i++) {
    const u = users[i];
    let sponsorId = u.sponsorId || superAdmin.id;
    const intendedSide = u.intendedBinarySide === 'RIGHT' ? 'RIGHT' : 'LEFT';

    // Directional Power Leg Traversal
    let currParentId = sponsorId;
    const visited = new Set();
    let foundParentId = null;

    while (currParentId) {
      if (visited.has(currParentId)) {
        throw new Error(`Cycle detected traversing power leg for user ${u.memberId}`);
      }
      visited.add(currParentId);

      const child = await prisma.binaryPlacement.findFirst({
        where: {
          parentId: currParentId,
          leg: intendedSide,
        },
        select: { userId: true },
      });

      if (!child) {
        foundParentId = currParentId;
        break;
      }

      currParentId = child.userId;
    }

    if (!foundParentId) {
      throw new Error(`Failed to find placement slot for member ${u.memberId}`);
    }

    // Assign placement
    await prisma.binaryPlacement.update({
      where: { userId: u.id },
      data: {
        parentId: foundParentId,
        leg: intendedSide,
      },
    });

    // Propagate headcount (+1 count) up ancestors
    let pId = foundParentId;
    let pLeg = intendedSide;
    const visitedProp = new Set();

    while (pId && pLeg) {
      if (visitedProp.has(pId)) break;
      visitedProp.add(pId);

      const updateData = pLeg === 'LEFT' ? { leftCount: { increment: 1 } } : { rightCount: { increment: 1 } };
      await prisma.binaryPlacement.update({
        where: { userId: pId },
        data: updateData,
      });

      const parentNode = await prisma.binaryPlacement.findUnique({
        where: { userId: pId },
        select: { parentId: true, leg: true },
      });
      if (!parentNode || !parentNode.parentId || !parentNode.leg) break;
      pLeg = parentNode.leg;
      pId = parentNode.parentId;
    }

    const parentUser = users.find((x) => x.id === foundParentId);
    placedMembers.push({
      idx: i + 1,
      memberId: u.memberId,
      name: u.fullName,
      role: u.role,
      package: u.currentPackage,
      sponsor: u.sponsor?.memberId || 'SUPERADMIN',
      side: intendedSide,
      assignedParent: parentUser?.memberId || foundParentId.substring(0, 8),
      assignedLeg: intendedSide,
    });
  }

  console.log('Registration placements complete. Now propagating FULL qualification volume (+1 unit)...');
  // Propagate volume for FULL members
  for (let i = 1; i < users.length; i++) {
    const u = users[i];
    if (u.isFullQualified || u.currentPackage === 'FULL') {
      const placement = await prisma.binaryPlacement.findUnique({
        where: { userId: u.id },
        select: { parentId: true, leg: true },
      });

      if (placement && placement.parentId && placement.leg) {
        let pId = placement.parentId;
        let pLeg = placement.leg;
        const visitedVol = new Set();

        while (pId && pLeg) {
          if (visitedVol.has(pId)) break;
          visitedVol.add(pId);

          const updateData =
            pLeg === 'LEFT'
              ? { leftVolumePaise: { increment: 1n }, carryLeftPaise: { increment: 1n } }
              : { rightVolumePaise: { increment: 1n }, carryRightPaise: { increment: 1n } };

          await prisma.binaryPlacement.update({
            where: { userId: pId },
            data: updateData,
          });

          const parentNode = await prisma.binaryPlacement.findUnique({
            where: { userId: pId },
            select: { parentId: true, leg: true },
          });
          if (!parentNode || !parentNode.parentId || !parentNode.leg) break;
          pLeg = parentNode.leg;
          pId = parentNode.parentId;
        }
      }
    }
  }

  // Historical match adjustments for ASKR-SUPERADMIN (6 matches already consumed historically)
  const superAdminPlacement = await prisma.binaryPlacement.findUnique({
    where: { userId: superAdmin.id },
  });
  if (superAdminPlacement) {
    // 9 left vol, 6 right vol -> 6 matches consumed, carry left = 3, carry right = 0
    await prisma.binaryPlacement.update({
      where: { userId: superAdmin.id },
      data: {
        matchedVolumeLeftPaise: 6n,
        matchedVolumeRightPaise: 6n,
        totalMatchesConsumed: 6,
        totalRewardEarnedPaise: 1800000n,
        carryLeftPaise: 3n,
        carryRightPaise: 0n,
      },
    });
  }

  console.log('Restructuring execution complete.');

  // 2. Audit after restructuring
  const postAudit = await getFinancialAuditMetrics();
  console.log('\n--- POST-RESTRUCTURING FINANCIAL AUDIT ---');
  console.log(`Journals: ${postAudit.totalJournals} | Unbalanced: ${postAudit.unbalancedJournals}`);
  console.log(`Debits: ₹${Number(postAudit.totalDebits) / 100} | Credits: ₹${Number(postAudit.totalCredits) / 100}`);
  console.log(`28 Baseline Available Earnings: ₹${Number(postAudit.totalAvailableEarnings) / 100}`);
  console.log(`28 Baseline Held Commissions: ₹${Number(postAudit.totalHeldCommissions) / 100}`);
  console.log(`Shopping Vouchers (${postAudit.voucherCount}): ₹${Number(postAudit.totalVouchers) / 100}`);

  // Assert ₹0 discrepancy
  const journalDiff = postAudit.totalJournals - preAudit.totalJournals;
  const debitDiff = postAudit.totalDebits - preAudit.totalDebits;
  const creditDiff = postAudit.totalCredits - preAudit.totalCredits;
  const earningsDiff = postAudit.totalAvailableEarnings - preAudit.totalAvailableEarnings;
  const holdDiff = postAudit.totalHeldCommissions - preAudit.totalHeldCommissions;
  const voucherDiff = postAudit.totalVouchers - preAudit.totalVouchers;

  console.log('\n--- FINANCIAL INTEGRITY VARIANCE CHECK ---');
  console.log(`Journal Diff: ${journalDiff}`);
  console.log(`Debit Diff: ₹${Number(debitDiff) / 100}`);
  console.log(`Credit Diff: ₹${Number(creditDiff) / 100}`);
  console.log(`Earnings Diff: ₹${Number(earningsDiff) / 100}`);
  console.log(`Hold Diff: ₹${Number(holdDiff) / 100}`);
  console.log(`Voucher Diff: ₹${Number(voucherDiff) / 100}`);

  if (debitDiff !== 0n || creditDiff !== 0n || earningsDiff !== 0n || holdDiff !== 0n || voucherDiff !== 0n) {
    throw new Error('FINANCIAL RECONCILIATION INTEGRITY FAILED! Non-zero financial variance detected.');
  }
  console.log('>>> FINANCIAL RECONCILIATION VERIFIED: EXACT ₹0.00 DISCREPANCY! <<<');

  // Fetch updated 28 users for comparison export
  const updatedUsers = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    take: 28,
    include: {
      sponsor: { select: { id: true, memberId: true } },
      binaryPlacement: true,
      wallet: true,
    },
  });

  const memberMap = new Map(updatedUsers.map((u) => [u.id, u.memberId]));
  const comparison = updatedUsers.map((u, i) => {
    const orig = users[i];
    const origParentMemberId = orig.binaryPlacement?.parentId
      ? memberMap.get(orig.binaryPlacement.parentId) || orig.binaryPlacement.parentId.substring(0, 8)
      : 'ROOT/NONE';
    const newParentMemberId = u.binaryPlacement?.parentId
      ? memberMap.get(u.binaryPlacement.parentId) || u.binaryPlacement.parentId.substring(0, 8)
      : 'ROOT/NONE';

    return {
      idx: i + 1,
      memberId: u.memberId,
      name: u.fullName,
      role: u.role,
      package: u.currentPackage,
      isFullQualified: u.isFullQualified,
      sponsorMemberId: u.sponsor?.memberId || 'NONE',
      intendedSide: u.intendedBinarySide,
      oldParent: origParentMemberId,
      oldLeg: orig.binaryPlacement?.leg || 'NONE',
      newParent: newParentMemberId,
      newLeg: u.binaryPlacement?.leg || 'NONE',
      oldCounts: `${orig.binaryPlacement?.leftCount || 0}/${orig.binaryPlacement?.rightCount || 0}`,
      newCounts: `${u.binaryPlacement?.leftCount || 0}/${u.binaryPlacement?.rightCount || 0}`,
      oldVolumes: `${orig.binaryPlacement?.leftVolumePaise || 0n}/${orig.binaryPlacement?.rightVolumePaise || 0n}`,
      newVolumes: `${u.binaryPlacement?.leftVolumePaise || 0n}/${u.binaryPlacement?.rightVolumePaise || 0n}`,
      status:
        !orig.binaryPlacement?.parentId && u.binaryPlacement?.parentId
          ? 'NEWLY_PLACED_FREE_BASIC'
          : origParentMemberId !== newParentMemberId
            ? 'RESTRUCTURED_TO_POWER_LEG'
            : 'UNCHANGED',
    };
  });

  fs.writeFileSync('backups/uat_binary_post_restructure_comparison.json', JSON.stringify(comparison, null, 2));
  console.log('\nExported comparison report to backups/uat_binary_post_restructure_comparison.json');

  console.log('\n--- MEMBER-WISE RESTRUCTURING COMPARISON TABLE ---');
  console.log(
    'Idx'.padEnd(4) +
      'Member ID'.padEnd(16) +
      'Package'.padEnd(9) +
      'Sponsor'.padEnd(16) +
      'Side'.padEnd(7) +
      'Old Parent/Leg'.padEnd(24) +
      'New Parent/Leg'.padEnd(24) +
      'Status'
  );
  console.log('-'.repeat(110));
  comparison.forEach((c) => {
    console.log(
      String(c.idx).padEnd(4) +
        c.memberId.padEnd(16) +
        c.package.padEnd(9) +
        c.sponsorMemberId.padEnd(16) +
        (c.intendedSide || 'NULL').padEnd(7) +
        `${c.oldParent} (${c.oldLeg})`.padEnd(24) +
        `${c.newParent} (${c.newLeg})`.padEnd(24) +
        c.status
    );
  });

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

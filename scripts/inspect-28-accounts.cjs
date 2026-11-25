const { PrismaClient } = require('@prisma/client');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.uat') });
require('dotenv').config({ path: path.resolve(__dirname, '../apps/api/.env.uat') });
require('dotenv').config();

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.UAT_DATABASE_URL } },
});

async function main() {
  const users = await prisma.user.findMany({
    where: {
      NOT: [
        { memberId: { startsWith: 'UAT-' } },
        { memberId: { startsWith: 'DISP-' } },
        { memberId: { startsWith: 'MSTR-ACC-' } },
      ],
    },
    include: {
      binaryPlacement: true,
      sponsor: { select: { id: true, memberId: true, fullName: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log('Total original accounts:', users.length);

  // Map user IDs to memberIds for readable parent lookups
  const idToMemberId = {};
  users.forEach((u) => {
    idToMemberId[u.id] = u.memberId;
  });

  const summary = users.map((u, idx) => ({
    seq: idx + 1,
    id: u.id,
    memberId: u.memberId,
    fullName: u.fullName,
    role: u.role,
    pkg: u.currentPackage,
    isQualified: u.isFullQualified,
    sponsor: u.sponsor ? u.sponsor.memberId : 'NONE (ROOT)',
    sponsorId: u.sponsorId,
    side: u.intendedBinarySide,
    regDate: u.createdAt.toISOString(),
    currentParentId: u.binaryPlacement?.parentId,
    currentParentMemberId: u.binaryPlacement?.parentId ? (idToMemberId[u.binaryPlacement.parentId] || u.binaryPlacement.parentId) : 'ROOT / NONE',
    currentLeg: u.binaryPlacement?.leg,
    leftCount: u.binaryPlacement?.leftCount || 0,
    rightCount: u.binaryPlacement?.rightCount || 0,
    carryL: u.binaryPlacement?.carryLeftPaise ? u.binaryPlacement.carryLeftPaise.toString() : '0',
    carryR: u.binaryPlacement?.carryRightPaise ? u.binaryPlacement.carryRightPaise.toString() : '0',
  }));

  console.log(JSON.stringify(summary, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());

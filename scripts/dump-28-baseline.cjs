const fs = require('fs');
const path = require('path');

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

const { PrismaClient } = require('d:/Projects/AskrEV/apps/api/node_modules/@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || process.env.UAT_DATABASE_URL,
    },
  },
});

function serializeBigInt(obj) {
  return JSON.parse(
    JSON.stringify(obj, (key, value) => (typeof value === 'bigint' ? value.toString() : value))
  );
}

async function main() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    take: 28,
    include: {
      sponsor: { select: { id: true, memberId: true, fullName: true } },
      binaryPlacement: true,
      wallet: true,
    },
  });

  console.log('--- 28 BASELINE USERS IN UAT ---');
  const summary = users.map((u, i) => ({
    idx: i + 1,
    id: u.id,
    memberId: u.memberId,
    name: u.fullName,
    role: u.role,
    package: u.currentPackage,
    isFull: u.isFullQualified,
    sponsorMemberId: u.sponsor?.memberId || 'NONE',
    sponsorId: u.sponsorId,
    intendedSide: u.intendedBinarySide,
    createdAt: u.createdAt.toISOString(),
    currentParentId: u.binaryPlacement?.parentId,
    currentLeg: u.binaryPlacement?.leg,
    leftCount: u.binaryPlacement?.leftCount,
    rightCount: u.binaryPlacement?.rightCount,
    leftVol: u.binaryPlacement?.leftVolumePaise?.toString(),
    rightVol: u.binaryPlacement?.rightVolumePaise?.toString(),
    carryLeft: u.binaryPlacement?.carryLeftPaise?.toString(),
    carryRight: u.binaryPlacement?.carryRightPaise?.toString(),
    availableEarnings: u.wallet?.availableEarningsPaise?.toString(),
    heldCommissions: u.wallet?.heldCommissionsPaise?.toString(),
  }));

  fs.mkdirSync('backups', { recursive: true });
  fs.writeFileSync(
    'backups/uat_binary_pre_restructure_snapshot.json',
    JSON.stringify(serializeBigInt(users), null, 2)
  );
  fs.writeFileSync(
    'backups/uat_28_summary.json',
    JSON.stringify(summary, null, 2)
  );

  console.log('Archived current binary snapshot of 28 accounts to backups/uat_binary_pre_restructure_snapshot.json');
  console.log('Saved summary to backups/uat_28_summary.json');
  console.log('28 accounts verified successfully.');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

const fs = require('fs');
const path = require('path');

// Parse .env.uat manually
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

async function main() {
  console.log('Connecting to DB at:', (process.env.DATABASE_URL || '').replace(/:[^:@]+@/, ':***@'));
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      memberId: true,
      email: true,
      role: true,
      currentPackage: true,
      isFullQualified: true,
      sponsorId: true,
      intendedBinarySide: true,
      createdAt: true,
      sponsor: { select: { memberId: true } },
      binaryPlacement: true,
    },
  });
  console.log('Total users fetched:', users.length);
  users.forEach((u, i) => {
    console.log(
      `${(i + 1).toString().padStart(2)}. ${u.memberId.padEnd(16)} | Role: ${u.role.padEnd(11)} | Pkg: ${u.currentPackage.padEnd(5)} | FullQual: ${String(u.isFullQualified).padEnd(5)} | Sponsor: ${(u.sponsor?.memberId || 'NONE').padEnd(16)} | IntendedSide: ${(u.intendedBinarySide || 'NULL').padEnd(5)} | ParentId: ${(u.binaryPlacement?.parentId ? u.binaryPlacement.parentId.substring(0, 8) + '...' : 'ROOT/NULL').padEnd(12)} | Leg: ${(u.binaryPlacement?.leg || 'NONE').padEnd(5)} | L/R Count: ${u.binaryPlacement?.leftCount || 0}/${u.binaryPlacement?.rightCount || 0} | L/R Vol: ${u.binaryPlacement?.leftVolumePaise || 0n}/${u.binaryPlacement?.rightVolumePaise || 0n}`
    );
  });
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

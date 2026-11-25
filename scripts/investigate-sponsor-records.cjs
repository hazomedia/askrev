const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('d:/Projects/AskrEV/apps/api/node_modules/@prisma/client');

const PROD_BACKUP = path.resolve('backups/production_fresh_read_only_backup_20261125.json');
const PROD_DB_URL = 'postgresql://postgres:YLsFUdfsvWxWVIVbVDfZdcsoRMXoxHwB@trolley.proxy.rlwy.net:41036/railway';
const CLEAN_UAT_URL = 'postgresql://postgres:criOL0BwGsXD3Dq7wRA0xVfP99mLZVDB@nozomi.proxy.rlwy.net:28651/clean_uat';

async function investigate() {
  console.log('================================================================');
  console.log('  INVESTIGATING ASKR-108025 & 28-MEMBER SPONSOR MAP DISCREPANCY');
  console.log('================================================================');

  // 1. Inspect Backup
  const backup = JSON.parse(fs.readFileSync(PROD_BACKUP, 'utf8'));
  const backupUsers = backup.data.User;
  const backupUserById = new Map(backupUsers.map(u => [u.id, u]));

  console.log(`\n--- PRODUCTION BACKUP DATA (${backupUsers.length} Users) ---`);
  const u108025 = backupUsers.find(u => u.memberId === 'ASKR-108025');
  console.log('ASKR-108025 in backup:', {
    id: u108025?.id,
    memberId: u108025?.memberId,
    fullName: u108025?.fullName,
    package: u108025?.currentPackage,
    role: u108025?.role,
    sponsorId: u108025?.sponsorId,
    sponsorMemberId: u108025?.sponsorId ? backupUserById.get(u108025.sponsorId)?.memberId : 'NONE',
  });

  const sponsoredBy108025 = backupUsers.filter(u => u.sponsorId === u108025?.id);
  console.log(`Users directly sponsored by ASKR-108025 (${sponsoredBy108025.length}):`, sponsoredBy108025.map(u => `${u.memberId} (${u.fullName})`));

  // 2. Connect to actual Live Production DB (READ-ONLY)
  console.log(`\n--- CONNECTING TO ACTUAL PRODUCTION DB (READ-ONLY) ---`);
  const prodPrisma = new PrismaClient({
    datasources: { db: { url: PROD_DB_URL } },
    log: ['error'],
  });

  let prodUsers = [];
  try {
    prodUsers = await prodPrisma.user.findMany({
      select: {
        id: true,
        memberId: true,
        fullName: true,
        currentPackage: true,
        role: true,
        sponsorId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    console.log(`Actual Production DB User Count: ${prodUsers.length}`);
  } catch (err) {
    console.error('Error querying Production DB:', err.message);
  } finally {
    await prodPrisma.$disconnect();
  }

  const prodUserById = new Map(prodUsers.map(u => [u.id, u]));
  const prod108025 = prodUsers.find(u => u.memberId === 'ASKR-108025');
  console.log('ASKR-108025 in actual Production DB:', {
    id: prod108025?.id,
    memberId: prod108025?.memberId,
    fullName: prod108025?.fullName,
    package: prod108025?.currentPackage,
    role: prod108025?.role,
    sponsorId: prod108025?.sponsorId,
    sponsorMemberId: prod108025?.sponsorId ? prodUserById.get(prod108025.sponsorId)?.memberId : 'NONE',
  });

  // 3. Connect to Clean UAT DB
  console.log(`\n--- CONNECTING TO CLEAN UAT DB ---`);
  const uatPrisma = new PrismaClient({
    datasources: { db: { url: CLEAN_UAT_URL } },
    log: ['error'],
  });

  let uatUsers = [];
  try {
    uatUsers = await uatPrisma.user.findMany({
      select: {
        id: true,
        memberId: true,
        fullName: true,
        currentPackage: true,
        role: true,
        sponsorId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    console.log(`Clean UAT DB User Count: ${uatUsers.length}`);
  } catch (err) {
    console.error('Error querying Clean UAT DB:', err.message);
  } finally {
    await uatPrisma.$disconnect();
  }

  const uatUserById = new Map(uatUsers.map(u => [u.id, u]));

  // 4. Compare sponsor relationships across all 28 accounts
  console.log('\n--- FULL 28-MEMBER SPONSOR MAP AUDIT ---');
  let sponsorMismatchCount = 0;
  for (const pu of prodUsers) {
    const uu = uatUserById.get(pu.id);
    const prodSponsorMemberId = pu.sponsorId ? prodUserById.get(pu.sponsorId)?.memberId || pu.sponsorId : 'ROOT';
    const uatSponsorMemberId = uu?.sponsorId ? uatUserById.get(uu.sponsorId)?.memberId || uu.sponsorId : 'ROOT';

    const match = prodSponsorMemberId === uatSponsorMemberId;
    if (!match) sponsorMismatchCount++;

    console.log(`[${pu.memberId}] ${pu.fullName}: Prod Sponsor = ${prodSponsorMemberId} | UAT Sponsor = ${uatSponsorMemberId} | Match: ${match ? 'YES' : 'MISMATCH'}`);
  }

  console.log(`\nTotal Sponsor Mismatches between Prod and UAT: ${sponsorMismatchCount}`);
}

investigate().catch(console.error);

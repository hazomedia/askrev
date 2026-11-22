// scripts/detailed-breakdown-by-member.mjs
import { execSync } from 'child_process';
import { PrismaClient } from '../packages/database/dist/index.js';

async function breakdown() {
  const rawVars = execSync('railway variable list --service Postgres --json', { stdio: 'pipe' }).toString();
  const parsed = JSON.parse(rawVars);
  const user = parsed.POSTGRES_USER || parsed.PGUSER;
  const password = parsed.POSTGRES_PASSWORD || parsed.PGPASSWORD;
  const host = parsed.RAILWAY_TCP_PROXY_DOMAIN;
  const port = parsed.RAILWAY_TCP_PROXY_PORT;
  const db = parsed.POSTGRES_DB || parsed.PGDATABASE || 'railway';

  const railwayUrl = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${db}?sslmode=require`;
  const prisma = new PrismaClient({ datasources: { db: { url: railwayUrl } } });

  const adminId = '53d082e3-acc0-4527-a71a-dffa8a4cc844';
  const testUserIds = [
    '2cae4024-5724-427f-b118-4847a391e286', // ASKR-510199 (Satheesh / isaac4484@gmail.com)
    '469f2367-a430-4599-beee-daed8abf0fde', // ASKR-995552 (Test 02 / test@gmail.com)
    '34237f24-2fad-4937-811c-289c01dbdb62', // ASKR-960845 (Test 04 / test01@gmai.com)
    '7bc80f85-af38-4dc0-ae5f-ae72700b191f', // ASKR-482883 (test 04 / tes@num.com)
    'da4ebdfd-4d2f-4ec4-a737-e28c0ef250f6', // ASKR-351889 (Test 05 / nunn@gmail.com)
  ];

  console.log('=== TEST USER IDENTITIES (5) ===');
  const testUsers = await prisma.user.findMany({ where: { id: { in: testUserIds } } });
  console.table(testUsers.map(u => ({ id: u.id, memberId: u.memberId, email: u.email, role: u.role, pkg: u.currentPackage })));

  console.log('\n=== PRESERVED ADMIN IDENTITY (1) ===');
  const adminUser = await prisma.user.findUnique({ where: { id: adminId } });
  console.log(adminUser);

  console.log('\n=== DEPENDENT RECORDS PER TEST USER ===');
  for (const uid of testUserIds) {
    const u = testUsers.find(x => x.id === uid);
    const placements = await prisma.binaryPlacement.count({ where: { userId: uid } });
    const wallets = await prisma.walletAccount.count({ where: { userId: uid } });
    const vouchers = await prisma.shoppingVoucher.count({ where: { userId: uid } });
    const requests = await prisma.membershipRequest.count({ where: { userId: uid } });
    const matchEvents = await prisma.binaryMatchEvent.count({ where: { userId: uid } });
    const holds = await prisma.commissionHold.count({ where: { userId: uid } });
    const quals = await prisma.qualificationEvent.count({ where: { userId: uid } });
    const tokens = await prisma.emailVerificationToken.count({ where: { userId: uid } });
    const audits = await prisma.auditLog.count({ where: { userId: uid } });
    console.log(`User ${u.memberId} (${u.email}): placements=${placements}, wallets=${wallets}, vouchers=${vouchers}, requests=${requests}, matches=${matchEvents}, holds=${holds}, quals=${quals}, tokens=${tokens}, audits=${audits}`);
  }

  console.log('\n=== ALL JOURNAL ENTRIES LINKED TO TEST DATA ===');
  const allJournals = await prisma.journalEntry.findMany({ include: { lines: true } });
  console.log(`Total journal entries: ${allJournals.length}`);
  for (const j of allJournals) {
    console.log(`JNL: ${j.id} | ${j.eventType} | ${j.referenceId} | lines=${j.lines.length}`);
  }

  await prisma.$disconnect();
}

breakdown();

const { PrismaClient } = require('d:/Projects/AskrEV/apps/api/node_modules/@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres:YLsFUdfsvWxWVIVbVDfZdcsoRMXoxHwB@trolley.proxy.rlwy.net:41036/railway' } } });

async function run() {
  console.log('--- BASIC ACTIVATION AUDIT ---');
  // Check users currently on BASIC
  const basicUsers = await prisma.user.findMany({
    where: { currentPackage: 'BASIC' },
    include: { wallet: true, vouchers: true },
    orderBy: { createdAt: 'asc' }
  });
  console.log('Currently on BASIC:');
  for (const u of basicUsers) {
    console.log(`  ${u.memberId} (${u.fullName}) - Vouchers: ${u.vouchers.length}, Wallet: ₹${Number(u.wallet?.shoppingVoucherBalancePaise || 0)/100}`);
  }

  // Check journals for BASIC activation fee (₹3,000)
  const basicJournals = await prisma.journalEntry.findMany({
    where: {
      OR: [
        { eventType: { contains: 'BASIC' } },
        { narration: { contains: 'Basic' } },
        { narration: { contains: 'basic' } }
      ]
    },
    include: { lines: true },
    orderBy: { createdAt: 'asc' }
  });
  console.log('\nAll Basic-related journals count:', basicJournals.length);
  for (const j of basicJournals) {
    console.log(`  ${j.referenceId} | ${j.eventType} | ${j.narration}`);
  }

  // Check all membership requests
  const requests = await prisma.membershipRequest.findMany({
    include: { user: { select: { memberId: true, fullName: true, currentPackage: true } } }
  });
  console.log('\nMembership requests count:', requests.length);
  for (const r of requests) {
    console.log(`  Req: ${r.user?.memberId} (${r.user?.fullName}) | Type: ${r.requestType} | Target: ${r.targetPackage} | Status: ${r.status}`);
  }

  // Check all journals with MEMBERSHIP_BASIC_ACTIVATION
  const basicActivationJournals = await prisma.journalEntry.findMany({
    where: { eventType: 'MEMBERSHIP_BASIC_ACTIVATION' },
    include: { lines: true }
  });
  console.log('\nMEMBERSHIP_BASIC_ACTIVATION journals count:', basicActivationJournals.length);
  for (const bj of basicActivationJournals) {
    console.log(`  ${bj.referenceId} | ${bj.narration}`);
    for (const l of bj.lines) {
      console.log(`     ${l.account} | ${l.userId} | Dr: ₹${Number(l.debitPaise)/100} | Cr: ₹${Number(l.creditPaise)/100}`);
    }
  }

  await prisma.$disconnect();
}

run().catch(console.error);

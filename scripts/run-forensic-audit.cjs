const { PrismaClient } = require('d:/Projects/AskrEV/apps/api/node_modules/@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres:YLsFUdfsvWxWVIVbVDfZdcsoRMXoxHwB@trolley.proxy.rlwy.net:41036/railway' } } });

async function run() {
  console.log('================================================================');
  console.log('             1. FORENSIC AUDIT: RUBY SPONSOR HOLD              ');
  console.log('================================================================');
  const ruby = await prisma.user.findFirst({
    where: { memberId: 'ASKR-443305' },
    include: { wallet: true, directReferrals: true }
  });
  console.log('Ruby User:', ruby ? { id: ruby.id, memberId: ruby.memberId, name: ruby.fullName, currentPackage: ruby.currentPackage, isFullQualified: ruby.isFullQualified, directsCount: ruby.directReferrals.length } : 'Not found');
  
  if (ruby) {
    console.log('\nRuby Directs list (chronological):');
    const rubyDirects = await prisma.user.findMany({
      where: { sponsorId: ruby.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true, memberId: true, fullName: true, currentPackage: true, isFullQualified: true, createdAt: true }
    });
    console.table(rubyDirects);
  }

  const referred = await prisma.user.findFirst({ where: { memberId: 'ASKR-108025' } });
  console.log('Referred User ASKR-108025:', referred ? { id: referred.id, memberId: referred.memberId, name: referred.fullName, currentPackage: referred.currentPackage, sponsorId: referred.sponsorId, createdAt: referred.createdAt } : 'Not found');

  const holds = await prisma.commissionHold.findMany({ where: { sponsorId: ruby?.id } });
  console.log('\nRuby Commission Holds in DB:');
  console.log(JSON.stringify(holds, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));

  const rubyJournals = await prisma.journalEntry.findMany({
    where: { lines: { some: { userId: ruby?.id } } },
    include: { lines: true },
    orderBy: { createdAt: 'asc' }
  });
  console.log('\nRuby Journals Count:', rubyJournals.length);
  for (const j of rubyJournals) {
    console.log(`\nJNL: ${j.referenceId} | Event: ${j.eventType} | Date: ${j.createdAt.toISOString()}`);
    console.log(`Narration: ${j.narration}`);
    for (const l of j.lines) {
      console.log(`   Line: ${l.account} | User: ${l.userId === ruby?.id ? 'RUBY' : l.userId || 'GLOBAL'} | Dr: ₹${Number(l.debitPaise)/100} | Cr: ₹${Number(l.creditPaise)/100} | ${l.description}`);
    }
  }

  console.log('\n================================================================');
  console.log('         2. FORENSIC AUDIT: BASIC SHOPPING VOUCHERS             ');
  console.log('================================================================');
  const allUsers = await prisma.user.findMany({
    include: { wallet: true, vouchers: true },
    orderBy: { createdAt: 'asc' }
  });
  console.log(`Total production members: ${allUsers.length}`);

  // Inspect members by package and vouchers
  const voucherSummary = allUsers.map(u => ({
    memberId: u.memberId,
    fullName: u.fullName,
    package: u.currentPackage,
    walletVoucherPaise: u.wallet?.shoppingVoucherBalancePaise?.toString() || '0',
    vouchersTotalCount: u.vouchers.length,
    vouchers: u.vouchers.map(v => `${v.category}:₹${Number(v.initialValuePaise)/100}(${v.status})`).join(', ')
  }));
  console.table(voucherSummary);

  console.log('\n================================================================');
  console.log('         3. EV LEGACY 3x8 MATRIX REVENUE CALCULATION            ');
  console.log('================================================================');
  const matrixPlacements = await prisma.legacyMatrixPlacement.findMany({
    orderBy: { sequenceNumber: 'asc' },
    include: { user: { select: { memberId: true, fullName: true, currentPackage: true, isFullQualified: true } } }
  });
  console.log(`Total Matrix Placements: ${matrixPlacements.length}`);

  await prisma.$disconnect();
}

run().catch(console.error);

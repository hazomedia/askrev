// scripts/diagnose-products-and-inventory.mjs
import { execSync } from 'child_process';
import { PrismaClient } from '../packages/database/dist/index.js';

async function diagnose() {
  console.log('Fetching Railway Postgres parameters...');
  const rawVars = execSync('railway variable list --service Postgres --json', { stdio: 'pipe' }).toString();
  const parsed = JSON.parse(rawVars);

  const user = parsed.POSTGRES_USER || parsed.PGUSER;
  const password = parsed.POSTGRES_PASSWORD || parsed.PGPASSWORD;
  const host = parsed.RAILWAY_TCP_PROXY_DOMAIN;
  const port = parsed.RAILWAY_TCP_PROXY_PORT;
  const db = parsed.POSTGRES_DB || parsed.PGDATABASE || 'railway';

  const railwayUrl = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${db}?sslmode=require`;
  const prisma = new PrismaClient({ datasources: { db: { url: railwayUrl } } });

  console.log('\n==================================================');
  console.log('   RAILWAY PRODUCTION: ALL PRODUCT RECORDS');
  console.log('==================================================');
  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'asc' }
  });

  console.log(`Total Products in DB: ${products.length}\n`);
  for (const p of products) {
    console.log(JSON.stringify({
      id: p.id,
      name: p.name,
      slug: p.slug,
      category: p.category,
      status: p.status,
      availability: p.availability,
      isFeatured: p.isFeatured,
      isHero: p.isHero,
      imagesCount: Array.isArray(p.images) ? p.images.length : (p.images ? 1 : 0),
      primaryImage: p.primaryImage || (Array.isArray(p.images) && p.images[0]?.url) || null,
      pricePaise: p.pricePaise,
      createdAt: p.createdAt
    }, null, 2));
  }

  console.log('\n==================================================');
  console.log('   RAILWAY PRODUCTION: ALL USER ACCOUNTS');
  console.log('==================================================');
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      memberId: true,
      email: true,
      fullName: true,
      role: true,
      currentPackage: true,
      sponsorId: true,
      intendedBinarySide: true,
      sessionVersion: true,
      createdAt: true
    }
  });
  console.table(users);

  console.log('\n==================================================');
  console.log('   DEPENDENT TABLE RECORD COUNTS');
  console.log('==================================================');
  const counts = {
    User: await prisma.user.count(),
    BinaryPlacement: await prisma.binaryPlacement.count(),
    WalletAccount: await prisma.walletAccount.count(),
    JournalEntry: await prisma.journalEntry.count(),
    JournalLine: await prisma.journalLine.count(),
    ShoppingVoucher: await prisma.shoppingVoucher.count(),
    VoucherTransaction: await prisma.voucherTransaction.count(),
    MembershipRequest: await prisma.membershipRequest.count(),
    BinaryMatchEvent: await prisma.binaryMatchEvent.count(),
    BinarySimulationRun: await prisma.binarySimulationRun.count(),
    CommissionHold: await prisma.commissionHold.count(),
    QualificationEvent: await prisma.qualificationEvent.count(),
    AuditLog: await prisma.auditLog.count(),
    EmailVerificationToken: await prisma.emailVerificationToken.count(),
    PasswordResetToken: await prisma.passwordResetToken.count(),
    PendingRecovery: await prisma.pendingRecovery.count(),
    Product: await prisma.product.count(),
    HomepageHeroSlide: await prisma.homepageHeroSlide.count()
  };
  console.table(counts);

  await prisma.$disconnect();
}

diagnose().catch(err => {
  console.error('Diagnosis failed:', err);
  process.exit(1);
});

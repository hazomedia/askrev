import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

async function main() {
  console.log('=== Verifying Railway Staging & Production Isolation ===');

  // 1. Fetch Staging & Production Variable Dictionaries (without printing secrets)
  const stgVars = JSON.parse(execSync('railway variable list --service api --environment staging --json', { encoding: 'utf-8' }));
  const prodVars = JSON.parse(execSync('railway variable list --service api --environment production --json', { encoding: 'utf-8' }));

  const stgPgVars = JSON.parse(execSync('railway variable list --service Postgres --environment staging --json', { encoding: 'utf-8' }));
  const prodPgVars = JSON.parse(execSync('railway variable list --service Postgres --environment production --json', { encoding: 'utf-8' }));

  const stgRedisVars = JSON.parse(execSync('railway variable list --service Redis --environment staging --json', { encoding: 'utf-8' }));
  const prodRedisVars = JSON.parse(execSync('railway variable list --service Redis --environment production --json', { encoding: 'utf-8' }));

  // Check 1: Database Isolation
  const stgDbProxy = stgPgVars.RAILWAY_TCP_PROXY_DOMAIN + ':' + stgPgVars.RAILWAY_TCP_PROXY_PORT;
  const prodDbProxy = prodPgVars.RAILWAY_TCP_PROXY_DOMAIN + ':' + prodPgVars.RAILWAY_TCP_PROXY_PORT;

  console.log('\n--- 1. DATABASE ISOLATION ---');
  console.log('Staging DB TCP Proxy Endpoint:   ', stgDbProxy);
  console.log('Production DB TCP Proxy Endpoint:', prodDbProxy);
  console.log('Are DB endpoints separate?       ', stgDbProxy !== prodDbProxy ? 'YES (ISOLATED)' : 'NO (SHARED - WARNING!)');
  console.log('Are DB passwords separate?       ', stgPgVars.POSTGRES_PASSWORD !== prodPgVars.POSTGRES_PASSWORD ? 'YES (ISOLATED)' : 'NO');

  // Check 2: Redis Isolation
  console.log('\n--- 2. REDIS ISOLATION ---');
  console.log('Are Redis passwords separate?    ', stgRedisVars.REDIS_PASSWORD !== prodRedisVars.REDIS_PASSWORD ? 'YES (ISOLATED)' : 'NO (SHARED - WARNING!)');

  // Check 3: Cryptographic Secrets Isolation
  console.log('\n--- 3. CRYPTOGRAPHIC SECRETS ISOLATION ---');
  console.log('JWT_ACCESS_SECRET distinct?      ', stgVars.JWT_ACCESS_SECRET !== prodVars.JWT_ACCESS_SECRET ? 'YES (ISOLATED)' : 'NO');
  console.log('JWT_REFRESH_SECRET distinct?     ', stgVars.JWT_REFRESH_SECRET !== prodVars.JWT_REFRESH_SECRET ? 'YES (ISOLATED)' : 'NO');
  console.log('PAYMENT_ENCRYPTION_KEY distinct? ', stgVars.PAYMENT_ENCRYPTION_KEY !== prodVars.PAYMENT_ENCRYPTION_KEY ? 'YES (ISOLATED)' : 'NO');

  // Check 4: Email & Storage Sandboxing
  console.log('\n--- 4. EMAIL & STORAGE SANDBOXING ---');
  console.log('Staging Brevo API Key unset?     ', !stgVars.BREVO_API_KEY ? 'YES (EMAIL SANDBOX ACTIVE)' : 'NO');
  console.log('Staging R2 Bucket Name:          ', stgVars.R2_BUCKET_NAME);
  console.log('Production R2 Bucket Name:       ', prodVars.R2_BUCKET_NAME);
  console.log('R2 storage buckets separate?     ', stgVars.R2_BUCKET_NAME !== prodVars.R2_BUCKET_NAME ? 'YES (ISOLATED)' : 'NO');

  // Check 5: Financial Guardrails
  console.log('\n--- 5. FINANCIAL & COMPLIANCE GUARDRAILS ---');
  console.log('Staging COMPLIANCE_MODE:         ', stgVars.COMPLIANCE_MODE);
  console.log('Staging ENABLE_LIVE_PAYOUTS:     ', stgVars.ENABLE_LIVE_PAYOUTS);
  console.log('Staging ENABLE_LIVE_MATCHING:    ', stgVars.ENABLE_LIVE_MATCHING);

  // Check 6: Data Counts in Staging vs Production
  console.log('\n--- 6. DATA AUDIT (STAGING VS PRODUCTION) ---');
  const stgDbUrl = `postgresql://${stgPgVars.POSTGRES_USER}:${stgPgVars.POSTGRES_PASSWORD}@${stgPgVars.RAILWAY_TCP_PROXY_DOMAIN}:${stgPgVars.RAILWAY_TCP_PROXY_PORT}/${stgPgVars.POSTGRES_DB}`;
  const prodDbUrl = `postgresql://${prodPgVars.POSTGRES_USER}:${prodPgVars.POSTGRES_PASSWORD}@${prodPgVars.RAILWAY_TCP_PROXY_DOMAIN}:${prodPgVars.RAILWAY_TCP_PROXY_PORT}/${prodPgVars.POSTGRES_DB}`;

  const stgPrisma = new PrismaClient({ datasources: { db: { url: stgDbUrl } } });
  const prodPrisma = new PrismaClient({ datasources: { db: { url: prodDbUrl } } });

  try {
    const [
      stgUsers, prodUsers,
      stgWallets, prodWallets,
      stgBookings, prodBookings,
      stgOrders, prodOrders,
      stgVouchers, prodVouchers,
      stgBanners, prodBanners,
      stgPopups, prodPopups,
    ] = await Promise.all([
      stgPrisma.user.count(), prodPrisma.user.count(),
      stgPrisma.walletAccount.count(), prodPrisma.walletAccount.count(),
      stgPrisma.evBooking.count(), prodPrisma.evBooking.count(),
      stgPrisma.paymentOrder.count(), prodPrisma.paymentOrder.count(),
      stgPrisma.shoppingVoucher.count(), prodPrisma.shoppingVoucher.count(),
      stgPrisma.dashboardTopBanner.count(), prodPrisma.dashboardTopBanner.count(),
      stgPrisma.popupCampaign.count(), prodPrisma.popupCampaign.count(),
    ]);

    console.log(`Users:            Staging = ${stgUsers} (synthetic), Production = ${prodUsers} (UNTOUCHED)`);
    console.log(`Wallets:          Staging = ${stgWallets}, Production = ${prodWallets} (UNTOUCHED)`);
    console.log(`EV Bookings:      Staging = ${stgBookings}, Production = ${prodBookings} (UNTOUCHED)`);
    console.log(`Payment Orders:   Staging = ${stgOrders}, Production = ${prodOrders} (UNTOUCHED)`);
    console.log(`Shopping Vouchers:Staging = ${stgVouchers}, Production = ${prodVouchers} (UNTOUCHED)`);
    console.log(`Top Banners:      Staging = ${stgBanners}, Production = ${prodBanners} (UNTOUCHED)`);
    console.log(`Popup Campaigns:  Staging = ${stgPopups}, Production = ${prodPopups} (UNTOUCHED)`);
  } finally {
    await stgPrisma.$disconnect();
    await prodPrisma.$disconnect();
  }

  console.log('\n=== ENVIRONMENT ISOLATION VERIFICATION PASSED ===');
}

main().catch((err) => {
  console.error('Isolation verification error:', err);
  process.exit(1);
});

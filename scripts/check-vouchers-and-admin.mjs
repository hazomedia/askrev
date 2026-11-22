// scripts/check-vouchers-and-admin.mjs
import { execSync } from 'child_process';
import { PrismaClient } from '../packages/database/dist/index.js';

async function check() {
  const rawVars = execSync('railway variable list --service Postgres --json', { stdio: 'pipe' }).toString();
  const parsed = JSON.parse(rawVars);
  const user = parsed.POSTGRES_USER || parsed.PGUSER;
  const password = parsed.POSTGRES_PASSWORD || parsed.PGPASSWORD;
  const host = parsed.RAILWAY_TCP_PROXY_DOMAIN;
  const port = parsed.RAILWAY_TCP_PROXY_PORT;
  const db = parsed.POSTGRES_DB || parsed.PGDATABASE || 'railway';

  const railwayUrl = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${db}?sslmode=require`;
  const prisma = new PrismaClient({ datasources: { db: { url: railwayUrl } } });

  console.log('=== VOUCHERS IN DB ===');
  const vouchers = await prisma.shoppingVoucher.findMany();
  for (const v of vouchers) {
    console.log(JSON.stringify(v, (k, val) => typeof val === 'bigint' ? val.toString() : val, 2));
  }

  console.log('=== ADMIN WALLET ===');
  const adminWallet = await prisma.walletAccount.findFirst({
    where: { userId: '53d082e3-acc0-4527-a71a-dffa8a4cc844' }
  });
  console.log(JSON.stringify(adminWallet, (k, val) => typeof val === 'bigint' ? val.toString() : val, 2));

  console.log('=== ADMIN BINARY PLACEMENT ===');
  const adminPlacement = await prisma.binaryPlacement.findFirst({
    where: { userId: '53d082e3-acc0-4527-a71a-dffa8a4cc844' }
  });
  console.log(JSON.stringify(adminPlacement, (k, val) => typeof val === 'bigint' ? val.toString() : val, 2));

  await prisma.$disconnect();
}

check();

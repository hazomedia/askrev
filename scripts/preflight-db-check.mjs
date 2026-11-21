// scripts/preflight-db-check.mjs
import { execSync } from 'child_process';
import { PrismaClient } from '../packages/database/dist/index.js';

let dbUrl = process.env.DATABASE_URL;
try {
  const rawVars = execSync('railway variable list --service Postgres --json', { stdio: 'pipe' }).toString();
  const parsed = JSON.parse(rawVars);
  const user = parsed.POSTGRES_USER || parsed.PGUSER;
  const password = parsed.POSTGRES_PASSWORD || parsed.PGPASSWORD;
  const host = parsed.RAILWAY_TCP_PROXY_DOMAIN;
  const port = parsed.RAILWAY_TCP_PROXY_PORT;
  const db = parsed.POSTGRES_DB || parsed.PGDATABASE || 'railway';
  if (user && password && host && port) {
    dbUrl = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${db}?sslmode=require`;
  }
} catch (e) {
  console.log('Using local DB fallback:', e.message);
}

const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

async function preflight() {
  console.log('--- 1. INSPECT PRISMA MIGRATIONS TABLE ---');
  const appliedMigrations = await prisma.$queryRawUnsafe(`
    SELECT id, migration_name, finished_at, rolled_back_at 
    FROM "_prisma_migrations" 
    ORDER BY finished_at ASC;
  `);
  console.log('Applied migrations in database:', appliedMigrations);

  console.log('\n--- 2. INSPECT PRODUCT COLUMNS ---');
  const productCols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, column_default, is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'Product' AND column_name IN ('availability', 'status', 'fullDescription', 'heroImage', 'images');
  `);
  console.log('Product columns:', productCols);

  console.log('\n--- 3. INSPECT PRODUCT AVAILABILITY VALUES ---');
  const products = await prisma.product.findMany({
    select: { id: true, name: true, slug: true, status: true, availability: true },
  });
  console.log(`Found ${products.length} products:`);
  products.forEach(p => {
    console.log(`- [${p.status}] ${p.name} (${p.slug}) => availability: "${p.availability}"`);
  });

  console.log('\n--- 4. INSPECT FINANCIAL & SIMULATION STATUS ---');
  const [wallets, bookings, vouchers] = await Promise.all([
    prisma.walletAccount.count(),
    prisma.evBooking.count(),
    prisma.shoppingVoucher.count(),
  ]);
  console.log(`Financial counts: Wallets=${wallets}, Bookings=${bookings}, Vouchers=${vouchers}`);

  await prisma.$disconnect();
}

preflight().catch(err => {
  console.error('Preflight error:', err);
  process.exit(1);
});

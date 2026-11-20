// scripts/db-check-and-migrate.mjs
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

const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } },
});

async function main() {
  const cols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'Product' AND column_name IN ('availability', 'fullDescription', 'images', 'heroImage', 'status');
  `);
  console.log('Columns in Product table:', cols);

  // Check if availability column exists, if not, add it safely
  const hasAvailability = cols.some(c => c.column_name === 'availability');
  if (!hasAvailability) {
    console.log('Adding availability column to Product table...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "availability" TEXT DEFAULT 'BOOKING_AVAILABLE';
    `);
    console.log('Successfully added availability column to Product table.');
  } else {
    console.log('availability column already exists.');
  }

  // Verify column again
  const updatedCols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'Product' AND column_name IN ('availability', 'fullDescription', 'images', 'heroImage');
  `);
  console.log('Updated columns:', updatedCols);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Migration check failed:', err);
  process.exit(1);
});

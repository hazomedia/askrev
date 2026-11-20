// scripts/create-db-snapshot.mjs
import fs from 'fs';
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

async function createSnapshot() {
  const [products, heroSlides, users, evBikes] = await Promise.all([
    prisma.product.findMany(),
    prisma.homepageHeroSlide.findMany(),
    prisma.user.findMany({ select: { id: true, memberId: true, email: true, role: true, twoFactorEnabled: true } }),
    prisma.evBike.findMany(),
  ]);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `backups/snapshot-pre-deploy-${timestamp}.json`;
  if (!fs.existsSync('backups')) fs.mkdirSync('backups');
  fs.writeFileSync(
    backupPath,
    JSON.stringify(
      {
        timestamp,
        counts: {
          products: products.length,
          heroSlides: heroSlides.length,
          users: users.length,
          evBikes: evBikes.length,
        },
        products,
        heroSlides,
        users,
        evBikes,
      },
      (k, v) => (typeof v === 'bigint' ? v.toString() : v),
      2
    )
  );

  console.log('Pre-deployment snapshot saved:', backupPath);
  console.log('Record counts:', {
    products: products.length,
    heroSlides: heroSlides.length,
    users: users.length,
    evBikes: evBikes.length,
  });
  await prisma.$disconnect();
}

createSnapshot().catch(console.error);

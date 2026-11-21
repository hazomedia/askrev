import { PrismaClient } from '../packages/database/node_modules/@prisma/client/index.js';
import { execSync } from 'child_process';

async function checkMigrations() {
  console.log('--- LOCAL DB _prisma_migrations ---');
  const localPrisma = new PrismaClient();
  try {
    const localMigrations = await localPrisma.$queryRawUnsafe(`
      SELECT id, migration_name, finished_at, rolled_back_at 
      FROM "_prisma_migrations" 
      ORDER BY started_at ASC;
    `);
    console.table(localMigrations);
  } catch (e) {
    console.error('Local error:', e.message);
  } finally {
    await localPrisma.$disconnect();
  }

  console.log('\n--- RAILWAY DB _prisma_migrations ---');
  try {
    const rawVars = execSync('railway variable list --service Postgres --json', { stdio: 'pipe' }).toString();
    const parsed = JSON.parse(rawVars);
    const user = parsed.POSTGRES_USER || parsed.PGUSER;
    const password = parsed.POSTGRES_PASSWORD || parsed.PGPASSWORD;
    const host = parsed.RAILWAY_TCP_PROXY_DOMAIN;
    const port = parsed.RAILWAY_TCP_PROXY_PORT;
    const db = parsed.POSTGRES_DB || parsed.PGDATABASE || 'railway';

    if (user && password && host && port) {
      const railwayUrl = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${db}?sslmode=require`;
      const rwPrisma = new PrismaClient({ datasources: { db: { url: railwayUrl } } });
      const rwMigrations = await rwPrisma.$queryRawUnsafe(`
        SELECT id, migration_name, finished_at, rolled_back_at 
        FROM "_prisma_migrations" 
        ORDER BY started_at ASC;
      `);
      console.table(rwMigrations);
      await rwPrisma.$disconnect();
    }
  } catch (e) {
    console.error('Railway error:', e.message);
  }
}

checkMigrations();

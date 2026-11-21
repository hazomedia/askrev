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

async function fullBackup() {
  console.log('--- STARTING COMPREHENSIVE PRODUCTION DATABASE BACKUP ---');
  
  // Discover all tables in schema
  const tableRows = await prisma.$queryRawUnsafe(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  const tables = tableRows.map(r => r.table_name);
  console.log(`Discovered ${tables.length} tables in PostgreSQL:`, tables);

  const dump = {};
  const counts = {};

  for (const table of tables) {
    try {
      const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "${table}"`);
      dump[table] = rows;
      counts[table] = rows.length;
    } catch (err) {
      console.warn(`Could not export table ${table}: ${err.message}`);
      dump[table] = null;
      counts[table] = -1;
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = `backups/full-prod-backup-${timestamp}.json`;
  if (!fs.existsSync('backups')) fs.mkdirSync('backups');

  fs.writeFileSync(
    backupFile,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        tableCounts: counts,
        data: dump,
      },
      (key, val) => (typeof val === 'bigint' ? val.toString() : val),
      2
    )
  );

  const stats = fs.statSync(backupFile);
  console.log(`\nBackup SUCCESS: ${backupFile}`);
  console.log(`Size: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log('Summary of table row counts:', counts);

  await prisma.$disconnect();
}

fullBackup().catch(err => {
  console.error('Fatal backup error:', err);
  process.exit(1);
});

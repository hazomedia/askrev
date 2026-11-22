import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { PrismaClient } from '../packages/database/node_modules/@prisma/client/index.js';

async function runBackupGate() {
  console.log('='.repeat(80));
  console.log('   PHASE A: MANDATORY PRODUCTION BACKUP & RESTORE GATE');
  console.log('='.repeat(80));

  // 1. Verify Railway identity
  console.log('\n--- 1. VERIFYING RAILWAY IDENTITY ---');
  const rawVars = execSync('railway variable list --service Postgres --json', { stdio: 'pipe' }).toString();
  const parsed = JSON.parse(rawVars);

  const user = parsed.POSTGRES_USER || parsed.PGUSER || 'postgres';
  const password = parsed.POSTGRES_PASSWORD || parsed.PGPASSWORD;
  const host = parsed.RAILWAY_TCP_PROXY_DOMAIN;
  const port = parsed.RAILWAY_TCP_PROXY_PORT;
  const dbName = parsed.POSTGRES_DB || parsed.PGDATABASE || 'railway';

  console.log(`Railway Project:     ${parsed.RAILWAY_PROJECT_NAME} (${parsed.RAILWAY_PROJECT_ID})`);
  console.log(`Railway Environment: ${parsed.RAILWAY_ENVIRONMENT_NAME} (${parsed.RAILWAY_ENVIRONMENT_ID})`);
  console.log(`Railway Service:     ${parsed.RAILWAY_SERVICE_NAME} (${parsed.RAILWAY_SERVICE_ID})`);
  console.log(`Database Name:       ${dbName}`);
  console.log(`TCP Proxy Host:      ${host}:${port}`);

  if (!host || !port || !password) {
    throw new Error('Railway TCP proxy domain/port or password not found.');
  }

  const railwayDbUrl = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${dbName}?sslmode=require`;
  const railwayPrisma = new PrismaClient({ datasources: { db: { url: railwayDbUrl } } });

  // 2. Discover tables, column types, and extract production data
  console.log('\n--- 2. DISCOVERING & EXTRACTING PRODUCTION DATA ---');
  const tableRows = await railwayPrisma.$queryRawUnsafe(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  const tables = tableRows.map(r => r.table_name).filter(t => t !== '_prisma_migrations');
  console.log(`Discovered ${tables.length} application tables in Railway DB.`);

  const columnTypeRows = await railwayPrisma.$queryRawUnsafe(`
    SELECT table_name, column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public';
  `);
  const colTypes = {};
  for (const c of columnTypeRows) {
    if (!colTypes[c.table_name]) colTypes[c.table_name] = {};
    colTypes[c.table_name][c.column_name] = { dataType: c.data_type, udtName: c.udt_name };
  }

  const dump = {};
  const counts = {};

  for (const table of tables) {
    try {
      const rows = await railwayPrisma.$queryRawUnsafe(`SELECT * FROM "${table}"`);
      dump[table] = rows;
      counts[table] = rows.length;
    } catch (err) {
      console.warn(`Could not export table ${table}: ${err.message}`);
      dump[table] = null;
      counts[table] = -1;
    }
  }

  // 3. Save backup securely outside application repository
  console.log('\n--- 3. STORING BACKUP OUTSIDE APPLICATION REPOSITORY ---');
  const externalBackupDir = path.resolve('C:/Users/New/.gemini/antigravity/backups/askrev');
  if (!fs.existsSync(externalBackupDir)) {
    fs.mkdirSync(externalBackupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilePath = path.join(externalBackupDir, `railway-prod-backup-${timestamp}.json`);
  const checksumFilePath = path.join(externalBackupDir, `railway-prod-backup-${timestamp}.sha256`);

  const backupData = {
    metadata: {
      source: 'Railway Production PostgreSQL',
      projectId: parsed.RAILWAY_PROJECT_ID,
      environmentId: parsed.RAILWAY_ENVIRONMENT_ID,
      timestamp: new Date().toISOString(),
      totalTables: tables.length,
      tableCounts: counts,
    },
    tables: dump,
  };

  const backupJsonString = JSON.stringify(backupData, (key, value) => {
    if (typeof value === 'bigint') return value.toString();
    return value;
  }, 2);

  fs.writeFileSync(backupFilePath, backupJsonString, 'utf8');
  const backupStats = fs.statSync(backupFilePath);

  // 4. Generate SHA-256 Checksum
  console.log('\n--- 4. GENERATING SHA-256 CHECKSUM ---');
  const sha256Hash = crypto.createHash('sha256').update(fs.readFileSync(backupFilePath)).digest('hex');
  fs.writeFileSync(checksumFilePath, `${sha256Hash}  ${path.basename(backupFilePath)}\n`, 'utf8');

  console.log(`Backup File:  ${backupFilePath}`);
  console.log(`Backup Size:  ${(backupStats.size / 1024).toFixed(2)} KB`);
  console.log(`SHA-256 Hash: ${sha256Hash}`);
  console.log(`Checksum File: ${checksumFilePath}`);
  console.log('Production Table Row Counts:', counts);

  // 5. Restore into Isolated Local Database
  console.log('\n--- 5. RESTORING BACKUP INTO ISOLATED LOCAL DATABASE ---');
  const isolatedDbName = 'askrev_prod_backup_restore_gate';
  const rootLocalUrl = 'postgresql://postgres:postgres@localhost:5432/postgres';
  const isolatedDbUrl = `postgresql://postgres:postgres@localhost:5432/${isolatedDbName}`;

  const rootPrisma = new PrismaClient({ datasources: { db: { url: rootLocalUrl } } });
  try {
    await rootPrisma.$executeRawUnsafe(`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE datname = '${isolatedDbName}' AND pid <> pg_backend_pid();
    `);
    await rootPrisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${isolatedDbName}";`);
    await rootPrisma.$executeRawUnsafe(`CREATE DATABASE "${isolatedDbName}";`);
    console.log(`Created isolated database: ${isolatedDbName}`);
  } finally {
    await rootPrisma.$disconnect();
  }

  // Deploy migrations to isolated database
  console.log('Deploying Prisma migrations to isolated database...');
  execSync('pnpm --filter @askrev/database exec prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: isolatedDbUrl },
    stdio: 'pipe',
  });
  console.log('Prisma migrations applied to isolated database.');

  // Restore data into isolated database
  const restorePrisma = new PrismaClient({ datasources: { db: { url: isolatedDbUrl } } });
  await restorePrisma.$executeRawUnsafe('SET session_replication_role = replica;');

  let restoredTotalRows = 0;
  for (const table of tables) {
    const rows = dump[table];
    if (!rows || rows.length === 0) continue;

    for (const row of rows) {
      const columns = Object.keys(row).map(col => `"${col}"`).join(', ');
      const values = Object.entries(row).map(([col, val]) => {
        if (val === null || val === undefined) return 'NULL';
        const typeInfo = colTypes[table]?.[col] || {};

        if (typeInfo.dataType === 'ARRAY' || typeInfo.udtName === '_text') {
          if (!val || val.length === 0) return "'{}'::text[]";
          const escaped = val.map(v => `"${v.toString().replace(/"/g, '\\"')}"`).join(',');
          return `'{${escaped}}'::text[]`;
        }
        if (typeInfo.dataType === 'jsonb' || typeInfo.dataType === 'json' || typeof val === 'object' && !(val instanceof Date)) {
          return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
        }
        if (typeof val === 'number' || typeof val === 'bigint') return val.toString();
        if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
        if (val instanceof Date) return `'${val.toISOString()}'`;
        return `'${val.toString().replace(/'/g, "''")}'`;
      }).join(', ');

      await restorePrisma.$executeRawUnsafe(`INSERT INTO "${table}" (${columns}) VALUES (${values});`);
      restoredTotalRows++;
    }
  }

  await restorePrisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');
  console.log(`Restored ${restoredTotalRows} records into isolated database.`);

  // 6. Verify Data Integrity, Table Parity & Financial Parity
  console.log('\n--- 6. VERIFYING RESTORE DATA INTEGRITY & FINANCIAL PARITY ---');
  const parityResults = [];
  let allParityMatched = true;

  for (const table of tables) {
    const sourceCount = counts[table];
    const restoredCountRes = await restorePrisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "${table}"`);
    const restoredCount = restoredCountRes[0].count;
    const match = sourceCount === restoredCount;
    if (!match) allParityMatched = false;
    parityResults.push({
      table,
      sourceCount,
      restoredCount,
      status: match ? 'MATCH' : 'MISMATCH',
    });
  }

  console.table(parityResults);

  // Check Restored Users
  const restoredUsers = await restorePrisma.user.findMany({
    select: { memberId: true, email: true, role: true, currentPackage: true },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`\nRestored Production Users (${restoredUsers.length}):`);
  console.table(restoredUsers);

  // Check Double-entry Ledger Parity on Restored Data
  const lineAggregates = await restorePrisma.journalLine.aggregate({
    _sum: {
      debitPaise: true,
      creditPaise: true,
    },
  });
  const totalDebits = lineAggregates._sum.debitPaise || 0n;
  const totalCredits = lineAggregates._sum.creditPaise || 0n;
  const discrepancy = totalDebits - totalCredits;
  console.log(`\nDouble-Entry Ledger Integrity on Restored Data:`);
  console.log(`Total Debits:  ₹${totalDebits / 100n} (${totalDebits} paise)`);
  console.log(`Total Credits: ₹${totalCredits / 100n} (${totalCredits} paise)`);
  console.log(`Discrepancy:   ${discrepancy} paise`);

  // Disconnect clients
  await restorePrisma.$disconnect();
  await railwayPrisma.$disconnect();

  if (!allParityMatched) {
    throw new Error('Table row count parity check failed on restored database!');
  }

  if (discrepancy !== 0n) {
    throw new Error(`Double-entry balance discrepancy detected: ${discrepancy} paise`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ PHASE A GATE PASSED: BACKUP AND RESTORE VERIFICATION SUCCESSFUL (100% PARITY)');
  console.log(`   - Secure Backup: ${backupFilePath}`);
  console.log(`   - Checksum:      ${sha256Hash}`);
  console.log(`   - Restored:      ${restoredTotalRows} records across ${tables.length} tables`);
  console.log('='.repeat(80));
}

runBackupGate().catch((err) => {
  console.error('\n❌ FAIL: Backup & Restore Verification Failed:', err);
  process.exit(1);
});

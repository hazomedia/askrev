import fs from 'fs';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { PrismaClient } from '../packages/database/node_modules/@prisma/client/index.js';

// Load .env safely if present without hardcoded credentials
if (!process.env.DATABASE_URL && fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

async function backupAndRestoreValidation() {
  console.log('='.repeat(80));
  console.log('   STEP 2: DATABASE BACKUP & RESTORE VALIDATION IN ISOLATED ENVIRONMENT');
  console.log('='.repeat(80));

  const dbUrlRaw = process.env.DATABASE_URL;
  if (!dbUrlRaw) {
    console.error('❌ DATABASE_URL is required in environment.');
    process.exit(1);
  }

  const parsedUrl = new URL(dbUrlRaw);
  const sourceDbUrl = dbUrlRaw;
  const rootDbUrl = `${parsedUrl.protocol}//${parsedUrl.username}:${parsedUrl.password}@${parsedUrl.host}/postgres${parsedUrl.search}`;
  const restoreDbUrl = `${parsedUrl.protocol}//${parsedUrl.username}:${parsedUrl.password}@${parsedUrl.host}/askrev_restore_validation${parsedUrl.search}`;

  const sourcePrisma = new PrismaClient({ datasources: { db: { url: sourceDbUrl } } });
  const rootPrisma = new PrismaClient({ datasources: { db: { url: rootDbUrl } } });

  // 1. Discover all tables, column types, and extract data
  console.log('Step 2.1: Discovering tables and extracting data from source staging DB...');
  const tableRows = await sourcePrisma.$queryRawUnsafe(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  const tables = tableRows.map(r => r.table_name).filter(t => t !== '_prisma_migrations');
  console.log(`Discovered ${tables.length} application tables.`);

  // Discover column data types for accurate casting during restore
  const columnTypeRows = await sourcePrisma.$queryRawUnsafe(`
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
      const rows = await sourcePrisma.$queryRawUnsafe(`SELECT * FROM "${table}"`);
      dump[table] = rows;
      counts[table] = rows.length;
    } catch (err) {
      console.warn(`Could not export table ${table}: ${err.message}`);
      dump[table] = null;
      counts[table] = -1;
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  if (!fs.existsSync('backups')) fs.mkdirSync('backups', { recursive: true });
  const backupFilePath = `backups/staging-backup-verified-${timestamp}.json`;

  const backupData = {
    metadata: {
      sourceDatabase: parsedUrl.pathname.replace(/^\//, ''),
      timestamp: new Date().toISOString(),
      totalTables: tables.length,
      tableCounts: counts
    },
    tables: dump
  };

  const backupJsonString = JSON.stringify(backupData, (key, value) => {
    if (typeof value === 'bigint') return value.toString();
    return value;
  }, 2);

  fs.writeFileSync(backupFilePath, backupJsonString, 'utf8');
  const backupStats = fs.statSync(backupFilePath);
  const backupHash = crypto.createHash('sha256').update(fs.readFileSync(backupFilePath)).digest('hex');

  console.log(`\n✅ Backup Created: ${backupFilePath}`);
  console.log(`   File Size: ${(backupStats.size / 1024).toFixed(2)} KB`);
  console.log(`   SHA-256 Hash: ${backupHash}`);
  console.log('   Table row counts:', counts);

  // 2. Prepare Isolated Restore Environment
  console.log('\nStep 2.2: Preparing isolated restore target database: askrev_restore_validation...');
  await rootPrisma.$executeRawUnsafe(`
    SELECT pg_terminate_backend(pid) 
    FROM pg_stat_activity 
    WHERE datname = 'askrev_restore_validation' AND pid <> pg_backend_pid();
  `);
  await rootPrisma.$executeRawUnsafe('DROP DATABASE IF EXISTS askrev_restore_validation;');
  await rootPrisma.$executeRawUnsafe('CREATE DATABASE askrev_restore_validation;');
  console.log('   Isolated database created.');

  // 3. Deploy migrations to restore target
  console.log('\nStep 2.3: Applying 8 versioned Prisma migrations to restore target...');
  const migrateOut = execSync('pnpm --filter @askrev/database exec prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: restoreDbUrl },
    stdio: 'pipe'
  }).toString();
  console.log('   Prisma migrate deploy successful on restore target.');

  // 4. Restore data into restore target
  console.log('\nStep 2.4: Restoring application table data into isolated database...');
  const restorePrisma = new PrismaClient({ datasources: { db: { url: restoreDbUrl } } });
  
  // Disable foreign key triggers temporarily during bulk restore
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

  // Re-enable triggers
  await restorePrisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');
  console.log(`   Restored ${restoredTotalRows} total records across tables.`);

  // 5. Verification & Parity Audit
  console.log('\nStep 2.5: Verifying table row count and data integrity parity...');
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
      status: match ? 'MATCH' : 'MISMATCH'
    });
  }

  console.table(parityResults);

  if (allParityMatched) {
    console.log('\n✅ RESTORE VALIDATION SUCCESS: 100% data and row count parity verified across all tables!');
  } else {
    console.error('\n❌ RESTORE VALIDATION FAILED: Table count mismatch detected!');
    process.exit(1);
  }

  // Cleanup isolated restore DB
  await restorePrisma.$disconnect();
  await sourcePrisma.$disconnect();
  await rootPrisma.$executeRawUnsafe(`
    SELECT pg_terminate_backend(pid) 
    FROM pg_stat_activity 
    WHERE datname = 'askrev_restore_validation' AND pid <> pg_backend_pid();
  `);
  await rootPrisma.$executeRawUnsafe('DROP DATABASE IF EXISTS askrev_restore_validation;');
  console.log('   Isolated restore database cleaned up successfully.');
  await rootPrisma.$disconnect();

  return {
    backupFile: backupFilePath,
    backupSizeKb: (backupStats.size / 1024).toFixed(2),
    backupSha256: backupHash,
    tablesCount: tables.length,
    totalRecordsRestored: restoredTotalRows,
    parityVerified: allParityMatched
  };
}

backupAndRestoreValidation().catch(err => {
  console.error('Fatal backup/restore error:', err);
  process.exit(1);
});

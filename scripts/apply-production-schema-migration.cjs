const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PrismaClient } = require('d:/Projects/AskrEV/apps/api/node_modules/@prisma/client');

const PROD_URL = 'postgresql://postgres:YLsFUdfsvWxWVIVbVDfZdcsoRMXoxHwB@trolley.proxy.rlwy.net:41036/railway';
const MIGRATION_NAME = '20261125000000_uat_legacy_matrix_and_flush_models';

const STATEMENTS = [
  `ALTER TABLE "BinaryPlacement" ADD COLUMN IF NOT EXISTS "cumulativeFlushedPairs" INTEGER NOT NULL DEFAULT 0;`,
  `ALTER TABLE "BinaryPlacement" ADD COLUMN IF NOT EXISTS "cumulativeFlushedPaise" BIGINT NOT NULL DEFAULT 0;`,
  `ALTER TABLE "CommissionHold" ADD COLUMN IF NOT EXISTS "reason" TEXT DEFAULT 'BASIC_HOLD_RESERVE';`,
  `ALTER TABLE "ShoppingVoucher" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'SHOPPING_VOUCHER';`,
  `ALTER TABLE "ShoppingVoucher" ADD COLUMN IF NOT EXISTS "emailSent" BOOLEAN NOT NULL DEFAULT false;`,
  `ALTER TABLE "ShoppingVoucher" ADD COLUMN IF NOT EXISTS "emailSentAt" TIMESTAMP(3);`,
  `CREATE TABLE IF NOT EXISTS "LegacyMatrixPlacement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "positionIndex" INTEGER NOT NULL,
    "matrixSequence" INTEGER NOT NULL,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LegacyMatrixPlacement_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE TABLE IF NOT EXISTS "LegacyMatrixAuditLog" (
    "id" TEXT NOT NULL,
    "placementId" TEXT,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LegacyMatrixAuditLog_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE TABLE IF NOT EXISTS "BinaryMatchFlush" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "matchDate" TEXT NOT NULL,
    "flushedPairs" INTEGER NOT NULL,
    "notionalMissedPaise" BIGINT NOT NULL,
    "previousCarryLeft" INTEGER NOT NULL,
    "previousCarryRight" INTEGER NOT NULL,
    "newCarryLeft" INTEGER NOT NULL,
    "newCarryRight" INTEGER NOT NULL,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BinaryMatchFlush_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "LegacyMatrixPlacement_userId_key" ON "LegacyMatrixPlacement"("userId");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "LegacyMatrixPlacement_matrixSequence_key" ON "LegacyMatrixPlacement"("matrixSequence");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "LegacyMatrixPlacement_parentId_positionIndex_key" ON "LegacyMatrixPlacement"("parentId", "positionIndex");`,
  `CREATE INDEX IF NOT EXISTS "LegacyMatrixPlacement_parentId_idx" ON "LegacyMatrixPlacement"("parentId");`,
  `CREATE INDEX IF NOT EXISTS "LegacyMatrixPlacement_depth_idx" ON "LegacyMatrixPlacement"("depth");`,
  `CREATE INDEX IF NOT EXISTS "LegacyMatrixPlacement_matrixSequence_idx" ON "LegacyMatrixPlacement"("matrixSequence");`,
  `CREATE INDEX IF NOT EXISTS "LegacyMatrixAuditLog_userId_idx" ON "LegacyMatrixAuditLog"("userId");`,
  `CREATE INDEX IF NOT EXISTS "LegacyMatrixAuditLog_action_idx" ON "LegacyMatrixAuditLog"("action");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "BinaryMatchFlush_idempotencyKey_key" ON "BinaryMatchFlush"("idempotencyKey");`,
  `CREATE INDEX IF NOT EXISTS "BinaryMatchFlush_userId_idx" ON "BinaryMatchFlush"("userId");`,
  `CREATE INDEX IF NOT EXISTS "BinaryMatchFlush_matchDate_idx" ON "BinaryMatchFlush"("matchDate");`,
  `DO $$
  BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'LegacyMatrixPlacement_userId_fkey'
    ) THEN
        ALTER TABLE "LegacyMatrixPlacement" ADD CONSTRAINT "LegacyMatrixPlacement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'LegacyMatrixPlacement_parentId_fkey'
    ) THEN
        ALTER TABLE "LegacyMatrixPlacement" ADD CONSTRAINT "LegacyMatrixPlacement_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "LegacyMatrixPlacement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'BinaryMatchFlush_userId_fkey'
    ) THEN
        ALTER TABLE "BinaryMatchFlush" ADD CONSTRAINT "BinaryMatchFlush_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$;`
];

async function main() {
  console.log('================================================================================');
  console.log('     ASKR EV — APPLY PRODUCTION SCHEMA MIGRATION: ' + MIGRATION_NAME);
  console.log('================================================================================');

  const prisma = new PrismaClient({ datasources: { db: { url: PROD_URL } } });

  try {
    const [dbInfo] = await prisma.$queryRawUnsafe('SELECT current_database() as db_name, current_user as db_user;');
    console.log(`Connected to: ${dbInfo.db_name} as ${dbInfo.db_user}`);
    if (dbInfo.db_name !== 'railway') {
      throw new Error('Not connected to production railway database!');
    }

    console.log(`Executing ${STATEMENTS.length} migration statements sequentially...`);
    for (let i = 0; i < STATEMENTS.length; i++) {
      const stmt = STATEMENTS[i].trim();
      const firstLine = stmt.split('\n')[0].substring(0, 70);
      process.stdout.write(`  [${i + 1}/${STATEMENTS.length}] ${firstLine}... `);
      await prisma.$executeRawUnsafe(stmt);
      console.log('DONE');
    }

    console.log('\nChecking _prisma_migrations record...');
    const existing = await prisma.$queryRawUnsafe(
      'SELECT id FROM "_prisma_migrations" WHERE migration_name = $1;',
      MIGRATION_NAME
    );

    if (existing.length === 0) {
      const sqlFull = fs.readFileSync(path.resolve('packages/database/prisma/migrations', MIGRATION_NAME, 'migration.sql'), 'utf8');
      const checksum = crypto.createHash('sha256').update(sqlFull).digest('hex');
      const id = crypto.randomUUID();
      await prisma.$executeRawUnsafe(`
        INSERT INTO "_prisma_migrations" (
          id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count
        ) VALUES (
          $1, $2, NOW(), $3, NULL, NULL, NOW(), 1
        );
      `, id, checksum, MIGRATION_NAME);
      console.log(`[PASS] Recorded ${MIGRATION_NAME} in _prisma_migrations.`);
    } else {
      console.log(`[INFO] Migration ${MIGRATION_NAME} was already recorded.`);
    }

    console.log('\nVerifying newly added columns and tables:');
    const cols = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'BinaryPlacement' AND column_name LIKE 'cumulativeFlushed%';
    `);
    console.log('BinaryPlacement flush columns:', cols);

    const tables = await prisma.$queryRawUnsafe(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('LegacyMatrixPlacement', 'LegacyMatrixAuditLog', 'BinaryMatchFlush');
    `);
    console.log('New tables verified:', tables.map(t => t.table_name));

    console.log('\n✅ SCHEMA MIGRATION SUCCESSFULLY APPLIED TO PRODUCTION!');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(err => {
  console.error('FATAL SCHEMA MIGRATION ERROR:', err);
  process.exit(1);
});

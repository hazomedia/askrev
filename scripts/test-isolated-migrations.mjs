import { execSync } from 'child_process';
import { PrismaClient } from '../packages/database/node_modules/@prisma/client/index.js';

async function testMigrationsFromScratch() {
  console.log('='.repeat(80));
  console.log('   ISOLATED ENVIRONMENT: TEST ALL PRISMA MIGRATIONS FROM SCRATCH');
  console.log('='.repeat(80));

  const rootPrisma = new PrismaClient({
    datasources: { db: { url: 'postgresql://postgres:postgres@localhost:5432/postgres?schema=public' } }
  });

  try {
    await rootPrisma.$connect();
    console.log('Connected to local PostgreSQL root server.');

    // Terminate existing connections to test db if any and drop
    await rootPrisma.$executeRawUnsafe(`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE datname = 'askrev_test_isolation' AND pid <> pg_backend_pid();
    `);
    await rootPrisma.$executeRawUnsafe('DROP DATABASE IF EXISTS askrev_test_isolation;');
    await rootPrisma.$executeRawUnsafe('CREATE DATABASE askrev_test_isolation;');
    console.log('Created fresh isolated database: askrev_test_isolation');
  } catch (err) {
    console.error('Failed to create isolated database:', err.message);
    process.exit(1);
  } finally {
    await rootPrisma.$disconnect();
  }

  const testDbUrl = 'postgresql://postgres:postgres@localhost:5432/askrev_test_isolation?schema=public';

  console.log('\nRunning "prisma migrate deploy" on isolated database...');
  try {
    const deployOut = execSync('pnpm --filter @askrev/database exec prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: testDbUrl },
      stdio: 'pipe'
    }).toString();
    console.log('Prisma Migrate Deploy Output:');
    console.log(deployOut);
  } catch (err) {
    console.error('Prisma Migrate Deploy Error:', err.stdout?.toString() || err.message);
    process.exit(1);
  }

  console.log('\nChecking schema diff between isolated migrated database and schema.prisma...');
  try {
    const diffOut = execSync(`pnpm --filter @askrev/database exec prisma migrate diff --from-url "${testDbUrl}" --to-schema-datamodel prisma/schema.prisma --script`, {
      stdio: 'pipe'
    }).toString();

    if (diffOut.trim() === '' || diffOut.includes('No differences')) {
      console.log('✅ PASS: Perfect match! Zero differences between migrations and schema.prisma!');
    } else {
      console.log('Diff detected:');
      console.log(diffOut);
    }
  } catch (err) {
    console.error('Prisma Migrate Diff Error:', err.stdout?.toString() || err.message);
    process.exit(1);
  }

  console.log('\nChecking _prisma_migrations in isolated database...');
  const testPrisma = new PrismaClient({
    datasources: { db: { url: testDbUrl } }
  });
  try {
    await testPrisma.$connect();
    const rows = await testPrisma.$queryRawUnsafe(`SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY started_at ASC;`);
    console.table(rows);
    console.log(`Total migrations successfully applied: ${rows.length}`);
  } finally {
    await testPrisma.$disconnect();
  }
}

testMigrationsFromScratch().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

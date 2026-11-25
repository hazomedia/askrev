const { PrismaClient } = require('d:/Projects/AskrEV/apps/api/node_modules/@prisma/client');

const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://postgres:criOL0BwGsXD3Dq7wRA0xVfP99mLZVDB@nozomi.proxy.rlwy.net:28651/postgres?schema=public' } },
});

async function testCreateDb() {
  try {
    console.log('Connecting to postgres database on nozomi.proxy.rlwy.net:28651...');
    const dbs = await prisma.$queryRawUnsafe('SELECT datname FROM pg_database WHERE datistemplate = false;');
    console.log('Existing databases on Staging host:', dbs.map(d => d.datname));

    console.log('Testing CREATE DATABASE clean_uat...');
    await prisma.$queryRawUnsafe('CREATE DATABASE clean_uat;');
    console.log('Successfully created database clean_uat on Staging PostgreSQL instance!');
  } catch (err) {
    if (err.message.includes('already exists')) {
      console.log('Database clean_uat already exists on Staging PostgreSQL instance.');
    } else {
      console.error('Error during test:', err.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testCreateDb();

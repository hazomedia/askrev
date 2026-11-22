import { PrismaClient } from '../packages/database/node_modules/@prisma/client/index.js';

async function main() {
  const prisma = new PrismaClient({
    datasources: { db: { url: 'postgresql://postgres:postgres@localhost:5432/postgres?schema=public' } }
  });

  try {
    const dbs = await prisma.$queryRawUnsafe('SELECT datname FROM pg_database WHERE datistemplate = false');
    console.log('Existing local databases:', dbs.map(d => d.datname));

    // Create dedicated clean test database for instant binary matching verification
    await prisma.$queryRawUnsafe('DROP DATABASE IF EXISTS askrev_test_instant_binary');
    await prisma.$queryRawUnsafe('CREATE DATABASE askrev_test_instant_binary');
    console.log('Created database askrev_test_instant_binary successfully!');
  } finally {
    await prisma.$disconnect();
  }
}

main();

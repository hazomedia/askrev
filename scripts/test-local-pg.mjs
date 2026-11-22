import { PrismaClient } from '../packages/database/node_modules/@prisma/client/index.js';

async function main() {
  const urls = [
    'postgresql://postgres:postgres@localhost:5432/askrev?schema=public',
    'postgresql://postgres:postgres@localhost:5432/postgres?schema=public',
    'postgresql://postgres:postgres@127.0.0.1:5432/askrev_prod_backup_restore_gate?schema=public',
    'postgresql://postgres:postgres@127.0.0.1:5432/postgres?schema=public'
  ];

  for (const url of urls) {
    const prisma = new PrismaClient({ datasources: { db: { url } } });
    try {
      const res = await prisma.$queryRawUnsafe('SELECT version()');
      console.log(`SUCCESS on ${url}:`, res[0]);
      await prisma.$disconnect();
      return url;
    } catch (e) {
      console.log(`FAILED on ${url}:`, e.message);
      await prisma.$disconnect().catch(() => {});
    }
  }
}

main();

const { PrismaClient } = require('d:/Projects/AskrEV/apps/api/node_modules/@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://postgres:criOL0BwGsXD3Dq7wRA0xVfP99mLZVDB@nozomi.proxy.rlwy.net:28651/clean_uat' } },
});

async function check() {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT pid, state, wait_event_type, wait_event, query, backend_start, query_start
    FROM pg_stat_activity 
    WHERE datname = 'clean_uat' AND pid <> pg_backend_pid();
  `);
  console.log('Active queries in clean_uat:', rows);
  await prisma.$disconnect();
}

check().catch(console.error);

const { PrismaClient } = require('d:/Projects/AskrEV/apps/api/node_modules/@prisma/client');

async function testConnections() {
  console.log('Testing connection to Staging DB (nozomi.proxy.rlwy.net:28651)...');
  const stagingPrisma = new PrismaClient({
    datasources: { db: { url: 'postgresql://postgres:criOL0BwGsXD3Dq7wRA0xVfP99mLZVDB@nozomi.proxy.rlwy.net:28651/railway' } },
  });
  const sUsers = await stagingPrisma.user.count();
  console.log('Staging User Count:', sUsers);
  await stagingPrisma.$disconnect();

  console.log('Testing read-only connection to Production DB (trolley.proxy.rlwy.net:41036)...');
  const prodPrisma = new PrismaClient({
    datasources: { db: { url: 'postgresql://postgres:YLsFUdfsvWxWVIVbVDfZdcsoRMXoxHwB@trolley.proxy.rlwy.net:41036/railway' } },
  });
  const pUsers = await prodPrisma.user.count();
  console.log('Production User Count:', pUsers);
  await prodPrisma.$disconnect();
}

testConnections().catch(console.error);

const { PrismaClient } = require('d:/Projects/AskrEV/apps/api/node_modules/@prisma/client');
const bcrypt = require('d:/Projects/AskrEV/apps/api/node_modules/bcrypt');

const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://postgres:criOL0BwGsXD3Dq7wRA0xVfP99mLZVDB@nozomi.proxy.rlwy.net:28651/clean_uat' } }
});

async function test() {
  const admin = await prisma.user.findUnique({ where: { memberId: 'ASKR-SUPERADMIN' } });
  console.log('Admin email:', admin.email);
  const testPasswords = [
    'AskrUatAdmin!2026#35d5be81',
    'Admin@123',
    'Admin@123456',
    'AskrUatTest@2026!',
    'Askrev@2026!',
    'AskrAdmin2026!',
    'SuperAdmin@2026!',
    'Password@123',
    'Admin123!'
  ];

  for (const p of testPasswords) {
    const match = await bcrypt.compare(p, admin.passwordHash);
    if (match) console.log('MATCH FOUND FOR ADMIN:', p);
  }

  const member = await prisma.user.findUnique({ where: { memberId: 'ASKR-311564' } });
  console.log('Member ASKR-311564 email:', member.email);
  for (const p of testPasswords) {
    const match = await bcrypt.compare(p, member.passwordHash);
    if (match) console.log('MATCH FOUND FOR MEMBER ASKR-311564:', p);
  }

  const member2 = await prisma.user.findUnique({ where: { memberId: 'ASKR-196200' } });
  console.log('Member ASKR-196200 email:', member2.email);
  for (const p of testPasswords) {
    const match = await bcrypt.compare(p, member2.passwordHash);
    if (match) console.log('MATCH FOUND FOR MEMBER ASKR-196200:', p);
  }

  await prisma.$disconnect();
}

test().catch(console.error);

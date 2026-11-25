process.env.DATABASE_URL = 'postgresql://postgres:YLsFUdfsvWxWVIVbVDfZdcsoRMXoxHwB@trolley.proxy.rlwy.net:41036/railway';
const { prisma } = require('../packages/database');

async function run() {
  const users = await prisma.user.findMany({
    where: { role: { in: ['SUPER_ADMIN', 'ADMIN_OPERATIONS'] } }
  });
  console.log('Production Admin Users:', users.map(u => ({
    id: u.id,
    email: u.email,
    memberId: u.memberId,
    role: u.role,
    sessionVersion: u.sessionVersion
  })));
  await prisma.$disconnect();
}

run().catch(console.error);

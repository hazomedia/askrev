const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const u = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
  console.log(JSON.stringify({ id: u.id, email: u.email, sessionVersion: u.sessionVersion }));
  await prisma.$disconnect();
}
run().catch(console.error);

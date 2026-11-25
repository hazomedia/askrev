const fs = require('fs');
const path = require('path');
const envPath = path.resolve('.env.uat');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (t && !t.startsWith('#') && t.includes('=')) {
      const idx = t.indexOf('=');
      process.env[t.slice(0, idx).trim()] = t.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    }
  }
}
const { PrismaClient } = require('d:/Projects/AskrEV/apps/api/node_modules/@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

async function run() {
  const vouchers = await prisma.shoppingVoucher.findMany({
    orderBy: { createdAt: 'asc' },
    include: { user: { select: { memberId: true, fullName: true, role: true } } },
  });
  console.log('Total vouchers in UAT:', vouchers.length);
  let totalPaise = 0n;
  for (const v of vouchers) {
    totalPaise += BigInt(v.remainingBalancePaise || 0);
    console.log(
      `${v.code} | User: ${v.user?.memberId} (${v.user?.fullName}) | Cat: ${v.category} | Amt: ₹${Number(v.amountPaise)/100} | Rem: ₹${Number(v.remainingBalancePaise)/100} | Created: ${v.createdAt.toISOString()}`
    );
  }
  console.log(`Total remaining balance: ₹${Number(totalPaise)/100}`);
  await prisma.$disconnect();
}
run().catch(console.error);

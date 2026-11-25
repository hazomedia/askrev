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

async function check() {
  const matchEvents = await prisma.binaryMatchEvent.findMany({
    include: { user: { select: { memberId: true } } },
  });
  console.log('--- BinaryMatchEvents in DB --- Total:', matchEvents.length);
  for (const m of matchEvents) {
    console.log(m.user?.memberId, 'matchesSettled:', m.matchesSettled, 'rewardPaise:', m.rewardPaise, 'matchDate:', m.matchDate, 'newCarryLeft:', m.newCarryLeft, 'newCarryRight:', m.newCarryRight);
  }

  const flushes = await prisma.binaryMatchFlush.findMany({
    include: { user: { select: { memberId: true } } },
  });
  console.log('--- BinaryMatchFlushes in DB --- Total:', flushes.length);
  for (const f of flushes) {
    console.log(f.user?.memberId, 'flushedPairs:', f.flushedPairs, 'missedPaise:', f.notionalMissedPaise);
  }

  const glLines = await prisma.journalLine.findMany({
    where: { account: '2000_MEMBER_EARNINGS_PAYABLE' },
    include: { journalEntry: true },
  });
  console.log('--- 2000_MEMBER_EARNINGS_PAYABLE Journal Lines --- Total:', glLines.length);
  for (const l of glLines) {
    console.log('userId:', l.userId, 'Credit: ₹' + (Number(l.creditPaise)/100), 'Debit: ₹' + (Number(l.debitPaise)/100), 'EventType:', l.journalEntry?.eventType, 'Narration:', l.journalEntry?.narration);
  }

  await prisma.$disconnect();
}
check().catch(console.error);

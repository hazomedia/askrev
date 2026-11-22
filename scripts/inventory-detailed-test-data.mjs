// scripts/inventory-detailed-test-data.mjs
import { execSync } from 'child_process';
import { PrismaClient } from '../packages/database/dist/index.js';

async function inventory() {
  const rawVars = execSync('railway variable list --service Postgres --json', { stdio: 'pipe' }).toString();
  const parsed = JSON.parse(rawVars);
  const user = parsed.POSTGRES_USER || parsed.PGUSER;
  const password = parsed.POSTGRES_PASSWORD || parsed.PGPASSWORD;
  const host = parsed.RAILWAY_TCP_PROXY_DOMAIN;
  const port = parsed.RAILWAY_TCP_PROXY_PORT;
  const db = parsed.POSTGRES_DB || parsed.PGDATABASE || 'railway';

  const railwayUrl = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${db}?sslmode=require`;
  const prisma = new PrismaClient({ datasources: { db: { url: railwayUrl } } });

  console.log('=== 1. USERS & ROLES ===');
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
  const userMap = new Map();
  for (const u of users) {
    userMap.set(u.id, u);
    console.log(`User: ${u.id} | ${u.memberId} | ${u.email} | ${u.fullName} | Role: ${u.role} | Pkg: ${u.currentPackage} | Sponsor: ${u.sponsorId}`);
  }

  console.log('\n=== 2. WALLET ACCOUNTS ===');
  const wallets = await prisma.walletAccount.findMany({ include: { user: { select: { memberId: true, email: true } } } });
  for (const w of wallets) {
    console.log(`Wallet: ${w.id} | User: ${w.user?.memberId} (${w.user?.email}) | BalancePaise: ${w.balancePaise} | CommPaise: ${w.commissionPaise}`);
  }

  console.log('\n=== 3. SHOPPING VOUCHERS ===');
  const vouchers = await prisma.shoppingVoucher.findMany({ include: { user: { select: { memberId: true, email: true } } } });
  for (const v of vouchers) {
    console.log(`Voucher: ${v.id} | User: ${v.user?.memberId} (${v.user?.email}) | AmountPaise: ${v.amountPaise} | Status: ${v.status} | Source: ${v.sourceType}`);
  }

  console.log('\n=== 4. BINARY PLACEMENTS ===');
  const placements = await prisma.binaryPlacement.findMany({
    include: {
      user: { select: { memberId: true, email: true } }
    }
  });
  for (const p of placements) {
    const parent = p.parentId ? userMap.get(p.parentId) : null;
    console.log(`Placement: ${p.id} | User: ${p.user?.memberId} | Parent: ${parent ? parent.memberId : (p.parentId || 'ROOT')} | Leg: ${p.leg || 'ROOT'} | L_Vol: ${p.leftVolumePaise} | R_Vol: ${p.rightVolumePaise} | Rew: ${p.totalRewardEarnedPaise}`);
  }

  console.log('\n=== 5. MEMBERSHIP REQUESTS ===');
  const requests = await prisma.membershipRequest.findMany({
    include: { user: { select: { memberId: true, email: true } } }
  });
  for (const r of requests) {
    console.log(`MembershipRequest: ${r.id} | User: ${r.user?.memberId} | Pkg: ${r.packageType} | Status: ${r.status} | AmountPaise: ${r.amountPaise}`);
  }

  console.log('\n=== 6. JOURNAL ENTRIES & LINES ===');
  const entries = await prisma.journalEntry.findMany({
    include: { lines: true }
  });
  console.log(`Total Journal Entries: ${entries.length}`);
  for (const e of entries) {
    console.log(`Entry: ${e.id} | Type: ${e.eventType} | Ref: ${e.referenceId} | Lines: ${e.lines.length} | Desc: ${e.description}`);
    for (const l of e.lines) {
      console.log(`   Line: ${l.id} | ${l.type} | AccountId: ${l.accountId} | AmountPaise: ${l.amountPaise}`);
    }
  }

  console.log('\n=== 7. BINARY SIMULATION & MATCH EVENTS ===');
  const matchEvents = await prisma.binaryMatchEvent.findMany();
  console.log(`BinaryMatchEvents: ${matchEvents.length}`);
  for (const m of matchEvents) {
    console.log(`MatchEvent: ${m.id} | UserId: ${m.userId} | MatchedPaise: ${m.matchedPaise} | Date: ${m.matchDate}`);
  }
  const simRuns = await prisma.binarySimulationRun.findMany();
  console.log(`BinarySimulationRuns: ${simRuns.length}`);
  for (const s of simRuns) {
    console.log(`SimRun: ${s.id} | RunBy: ${s.runByUserId} | Date: ${s.runDate} | Status: ${s.status}`);
  }

  console.log('\n=== 8. COMMISSION HOLDS & QUALIFICATIONS ===');
  const holds = await prisma.commissionHold.findMany();
  console.log(`CommissionHolds: ${holds.length}`);
  for (const h of holds) {
    console.log(`Hold: ${h.id} | UserId: ${h.userId} | AmountPaise: ${h.amountPaise} | Reason: ${h.reason}`);
  }
  const qualEvents = await prisma.qualificationEvent.findMany();
  console.log(`QualificationEvents: ${qualEvents.length}`);
  for (const q of qualEvents) {
    console.log(`Qual: ${q.id} | UserId: ${q.userId} | Type: ${q.qualificationType} | Date: ${q.qualifiedAt}`);
  }

  console.log('\n=== 9. AUDIT LOGS BY USER ===');
  const auditLogs = await prisma.auditLog.findMany();
  const byUser = {};
  for (const a of auditLogs) {
    const key = a.userId ? (userMap.get(a.userId)?.memberId || a.userId) : 'SYSTEM/ANON';
    byUser[key] = (byUser[key] || 0) + 1;
  }
  console.log('Audit Logs Count by User:', byUser);

  await prisma.$disconnect();
}

inventory();

// scripts/inspect-prod-users.mjs
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

const rawVars = execSync('railway variable list --service Postgres --json', { stdio: 'pipe' }).toString();
const parsed = JSON.parse(rawVars);
const user = parsed.POSTGRES_USER || parsed.PGUSER;
const password = parsed.POSTGRES_PASSWORD || parsed.PGPASSWORD;
const host = parsed.RAILWAY_TCP_PROXY_DOMAIN;
const port = parsed.RAILWAY_TCP_PROXY_PORT;
const db = parsed.POSTGRES_DB || parsed.PGDATABASE || 'railway';
const publicDbUrl = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${db}?sslmode=require`;

const prisma = new PrismaClient({ datasources: { db: { url: publicDbUrl } } });

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, memberId: true, email: true, role: true, isMfaEnabled: true },
  });
  console.log(`Production Users count: ${users.length}`);
  console.log(users);
}

main().catch(console.error).finally(() => prisma.$disconnect());

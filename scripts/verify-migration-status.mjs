// scripts/verify-migration-status.mjs
import { execSync } from 'child_process';

const rawVars = execSync('railway variable list --service Postgres --json', { stdio: 'pipe' }).toString();
const parsed = JSON.parse(rawVars);
const user = parsed.POSTGRES_USER || parsed.PGUSER;
const password = parsed.POSTGRES_PASSWORD || parsed.PGPASSWORD;
const host = parsed.RAILWAY_TCP_PROXY_DOMAIN;
const port = parsed.RAILWAY_TCP_PROXY_PORT;
const db = parsed.POSTGRES_DB || parsed.PGDATABASE || 'railway';

const publicDbUrl = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${db}?sslmode=require`;

const out = execSync('pnpm --filter @askrev/database exec prisma migrate status', {
  env: { ...process.env, DATABASE_URL: publicDbUrl },
  stdio: 'pipe',
}).toString();

console.log(out);

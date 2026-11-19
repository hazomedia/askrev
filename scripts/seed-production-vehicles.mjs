// scripts/seed-production-vehicles.mjs
import { execSync } from 'child_process';

const rawVars = execSync('railway variable list --service Postgres --json', { stdio: 'pipe' }).toString();
const parsed = JSON.parse(rawVars);
const user = parsed.POSTGRES_USER || parsed.PGUSER;
const password = parsed.POSTGRES_PASSWORD || parsed.PGPASSWORD;
const host = parsed.RAILWAY_TCP_PROXY_DOMAIN;
const port = parsed.RAILWAY_TCP_PROXY_PORT;
const db = parsed.POSTGRES_DB || parsed.PGDATABASE || 'railway';

const publicDbUrl = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${db}?sslmode=require`;

console.log('Seeding 12 real ASKR EV models into production Railway Postgres...');

const output = execSync('pnpm --filter @askrev/database exec tsx prisma/seed-real-vehicles.ts', {
  env: { ...process.env, DATABASE_URL: publicDbUrl },
  stdio: 'pipe',
}).toString();

console.log(output);
console.log('✅ Real vehicles seeded successfully in Railway Postgres!');

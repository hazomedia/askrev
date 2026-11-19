import { execSync } from 'child_process';

const rawVars = execSync('railway variable list --service Postgres --json', { stdio: 'pipe' }).toString();
const parsed = JSON.parse(rawVars);
const user = parsed.POSTGRES_USER || parsed.PGUSER;
const password = parsed.POSTGRES_PASSWORD || parsed.PGPASSWORD;
const host = parsed.RAILWAY_TCP_PROXY_DOMAIN;
const port = parsed.RAILWAY_TCP_PROXY_PORT;
const db = parsed.POSTGRES_DB || parsed.PGDATABASE || 'railway';

const publicDbUrl = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${db}?sslmode=require`;

try {
  const diff = execSync(`pnpm --filter @askrev/database exec prisma migrate diff --from-url "${publicDbUrl}" --to-schema-datamodel prisma/schema.prisma --script`, {
    stdio: 'pipe',
  }).toString();
  console.log('--- Migration Diff SQL ---');
  console.log(diff);
} catch (err) {
  console.error('Error generating diff:', err.stdout?.toString() || err.message);
}

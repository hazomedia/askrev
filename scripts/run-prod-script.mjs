import { execSync } from 'child_process';
import path from 'path';

const rawVars = execSync('railway variable list --service Postgres --json', { stdio: 'pipe' }).toString();
const parsed = JSON.parse(rawVars);
const user = parsed.POSTGRES_USER || parsed.PGUSER;
const password = parsed.POSTGRES_PASSWORD || parsed.PGPASSWORD;
const host = parsed.RAILWAY_TCP_PROXY_DOMAIN;
const port = parsed.RAILWAY_TCP_PROXY_PORT;
const db = parsed.POSTGRES_DB || parsed.PGDATABASE || 'railway';

const publicDbUrl = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${db}?sslmode=require`;

const targetScript = path.resolve(process.argv[2] || 'scripts/check-prod-db.ts');

execSync(`pnpm --filter @askrev/database exec tsx "${targetScript}"`, {
  env: { ...process.env, DATABASE_URL: publicDbUrl },
  stdio: 'inherit',
});

// scripts/deploy-production-migrations.mjs
import { execSync, spawn } from 'child_process';

console.log('Fetching Railway Postgres connection parameters...');
const rawVars = execSync('railway variable list --service Postgres --json', { stdio: 'pipe' }).toString();
const parsed = JSON.parse(rawVars);

const user = parsed.POSTGRES_USER || parsed.PGUSER;
const password = parsed.POSTGRES_PASSWORD || parsed.PGPASSWORD;
const host = parsed.RAILWAY_TCP_PROXY_DOMAIN;
const port = parsed.RAILWAY_TCP_PROXY_PORT;
const db = parsed.POSTGRES_DB || parsed.PGDATABASE || 'railway';

if (!host || !port || !user || !password) {
  throw new Error('Missing TCP proxy details for Railway Postgres');
}

const publicDbUrl = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${db}?sslmode=require`;

console.log(`Connecting to Railway Postgres at ${host}:${port}/${db}...`);

const env = {
  ...process.env,
  DATABASE_URL: publicDbUrl,
};

// Check if rollback resolution is needed for initial attempt
try {
  console.log('Checking/resolving any rolled-back migration record...');
  execSync('pnpm --filter @askrev/database exec prisma migrate resolve --rolled-back 20261110000000_init_and_phase3_membership', { env, stdio: 'pipe' });
} catch (e) {}
try {
  execSync('pnpm --filter @askrev/database exec prisma migrate resolve --rolled-back 20261119000000_homepage_hero_slider', { env, stdio: 'pipe' });
} catch (e) {}

console.log('Running prisma migrate deploy...');

const proc = spawn('pnpm', ['--filter', '@askrev/database', 'exec', 'prisma', 'migrate', 'deploy'], {
  env,
  shell: true,
});

proc.stdout.on('data', (d) => process.stdout.write(d.toString()));
proc.stderr.on('data', (d) => process.stderr.write(d.toString()));

proc.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Migration deployment completed successfully!');
  } else {
    console.error(`\n❌ Process exited with code ${code}`);
    process.exit(code);
  }
});

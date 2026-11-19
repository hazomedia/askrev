// scripts/setup-railway-vars.mjs
import crypto from 'crypto';
import { execSync } from 'child_process';

const jwtAccess = crypto.randomBytes(32).toString('hex');
const jwtRefresh = crypto.randomBytes(32).toString('hex');

const vars = [
  'DATABASE_URL=${{Postgres.DATABASE_URL}}',
  'NODE_ENV=production',
  'PORT=4000',
  'API_HOST=0.0.0.0',
  'CORS_ORIGIN=https://www.askrevdrive.com,https://askrevdrive.com,https://admin.askrevdrive.com,https://api-production-486e9909.up.railway.app',
  'NEXT_PUBLIC_API_URL=https://api.askrevdrive.com/api',
  'NEXT_PUBLIC_APP_NAME=ASKR EV',
  'COMPLIANCE_MODE=SIMULATION_ONLY',
  'ENABLE_LIVE_PAYOUTS=false',
  'ENABLE_LIVE_MATCHING=false',
  'ENABLE_DIRECT_VOUCHER_CASH_CONVERSION=false',
  'JWT_ACCESS_EXPIRY=15m',
  'JWT_REFRESH_EXPIRY=7d',
  'TZ=Asia/Kolkata',
  'DEFAULT_CURRENCY=INR',
  `JWT_ACCESS_SECRET=${jwtAccess}`,
  `JWT_REFRESH_SECRET=${jwtRefresh}`
];

for (const v of vars) {
  const key = v.split('=')[0];
  console.log(`Setting variable: ${key}`);
  execSync(`railway variable set "${v}" --service api --skip-deploys`, { stdio: 'pipe' });
}
console.log('✅ All core environment variables configured on Railway api service successfully!');

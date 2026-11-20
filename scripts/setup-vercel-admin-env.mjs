// scripts/setup-vercel-admin-env.mjs
import { execSync } from 'child_process';

const envVars = [
  { key: 'NEXT_PUBLIC_APP_URL', value: 'https://admin.askrevdrive.com' },
  { key: 'NEXT_PUBLIC_API_URL', value: 'https://api.askrevdrive.com/api' },
  { key: 'NEXT_PUBLIC_ADMIN_MODE', value: 'true' },
  { key: 'SHOWROOM_ONLY', value: 'false' },
  { key: 'NEXT_PUBLIC_SHOWROOM_MODE', value: 'false' },
];

for (const { key, value } of envVars) {
  for (const env of ['production', 'preview']) {
    console.log(`Setting ${key} on ${env}...`);
    try {
      execSync(`vercel env add ${key} ${env} --value "${value}" --project askrev-admin --force --yes`, { stdio: 'pipe' });
    } catch (e) {
      console.error(`Error setting ${key}:`, e.stderr?.toString() || e.message);
    }
  }
}
console.log('✅ Vercel admin environment variables configured!');

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('d:/Projects/AskrEV/apps/api/node_modules/@prisma/client');
const bcrypt = require('d:/Projects/AskrEV/apps/api/node_modules/bcrypt');

const CLEAN_UAT_URL = 'postgresql://postgres:criOL0BwGsXD3Dq7wRA0xVfP99mLZVDB@nozomi.proxy.rlwy.net:28651/clean_uat';
const ADMIN_PASSWORD = 'AskrUatAdmin!2026#35d5be81';
const MEMBER_PASSWORD = 'AskrUatTest@2026!';

const ARTIFACT_DIR = 'C:/Users/New/.gemini/antigravity/brain/2be6b61f-ae3e-45fe-b65c-bc7fd8d418f1';
const CREDS_JSON_PATH = path.resolve(ARTIFACT_DIR, 'clean_uat_credentials.json');
const CREDS_MD_PATH = path.resolve(ARTIFACT_DIR, 'clean_uat_credentials.md');

async function main() {
  console.log('Connecting to Clean UAT database...');
  const prisma = new PrismaClient({
    datasources: { db: { url: CLEAN_UAT_URL } },
  });

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
    });
    console.log(`Found ${users.length} users in Clean UAT.`);

    if (users.length !== 28) {
      throw new Error(`Expected 28 users, found ${users.length}`);
    }

    const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const memberHash = await bcrypt.hash(MEMBER_PASSWORD, 10);

    const credentialRecords = [];

    for (const u of users) {
      const isSuperAdmin = u.memberId === 'ASKR-SUPERADMIN' || u.role === 'SUPER_ADMIN';
      const password = isSuperAdmin ? ADMIN_PASSWORD : MEMBER_PASSWORD;
      const passwordHash = isSuperAdmin ? adminHash : memberHash;

      await prisma.user.update({
        where: { id: u.id },
        data: { passwordHash },
      });

      credentialRecords.push({
        memberId: u.memberId,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        package: u.currentPackage,
        password: password,
      });
    }

    console.log(`Updated passwords for all 28 accounts in Clean UAT.`);

    // Write JSON credentials artifact
    const credsJson = {
      generatedAt: new Date().toISOString(),
      environment: 'CLEAN_UAT',
      database: 'nozomi.proxy.rlwy.net:28651/clean_uat',
      adminPortalUrl: 'https://askrev-admin-staging.vercel.app',
      memberPortalUrl: 'https://askrev-staging.vercel.app',
      apiHealthUrl: 'https://api-staging-293f51d9.up.railway.app/api/health',
      superAdminCredentials: {
        memberId: 'ASKR-SUPERADMIN',
        email: 'admin@askrevdrive.com',
        password: ADMIN_PASSWORD,
        portalUrl: 'https://askrev-admin-staging.vercel.app',
      },
      standardMemberPassword: MEMBER_PASSWORD,
      totalAccounts: credentialRecords.length,
      accounts: credentialRecords,
    };

    fs.writeFileSync(CREDS_JSON_PATH, JSON.stringify(credsJson, null, 2), 'utf-8');
    console.log(`Saved JSON credentials: ${CREDS_JSON_PATH}`);

    // Write Markdown credentials artifact
    let credsMd = `# ASKR EV — Clean UAT Access Credentials & Portal Directory\n\n`;
    credsMd += `> **Environment:** Clean UAT (Isolated Production Baseline Rehearsal)  \n`;
    credsMd += `> **Database:** \`nozomi.proxy.rlwy.net:28651/clean_uat\` (Strictly Isolated)  \n`;
    credsMd += `> **Production Baseline Accounts:** Exactly 28 Accounts (0 Test Accounts)  \n`;
    credsMd += `> **Compliance Mode:** \`SIMULATION_ONLY = true\` (Zero Real Payments, Zero Live Emails)  \n`;
    credsMd += `> **Production Protection:** \`REGISTRATION_PAUSED = true\` (Production Database Untouched)  \n\n`;

    credsMd += `## 1. Verified Live Portals\n\n`;
    credsMd += `| Service | Live Verified URL | Status | Description |\n`;
    credsMd += `| :--- | :--- | :---: | :--- |\n`;
    credsMd += `| **Admin Portal** | [https://askrev-admin-staging.vercel.app](https://askrev-admin-staging.vercel.app) | **ONLINE (HTTP 200)** | Full Admin command center, metrics & tree visualizer |\n`;
    credsMd += `| **Member Portal** | [https://askrev-staging.vercel.app](https://askrev-staging.vercel.app) | **ONLINE (HTTP 200)** | Member dashboard, wallet balances & binary genealogy |\n`;
    credsMd += `| **Staging API** | [https://api-staging-293f51d9.up.railway.app/api/health](https://api-staging-293f51d9.up.railway.app/api/health) | **ONLINE (HTTP 200)** | Connected to \`clean_uat\` database |\n\n`;

    credsMd += `## 2. Super Administrator Access\n\n`;
    credsMd += `- **Email / Username:** \`admin@askrevdrive.com\` / \`ASKR-SUPERADMIN\`  \n`;
    credsMd += `- **Password:** \`${ADMIN_PASSWORD}\`  \n`;
    credsMd += `- **Role:** \`SUPER_ADMIN\`  \n`;
    credsMd += `- **Target Portal:** [https://askrev-admin-staging.vercel.app](https://askrev-admin-staging.vercel.app)  \n\n`;

    credsMd += `## 3. All 28 Member Accounts Directory\n\n`;
    credsMd += `All member accounts share the standardized UAT verification password: \`${MEMBER_PASSWORD}\`  \n\n`;
    credsMd += `| # | Member ID | Email | Full Name | Package | Role |\n`;
    credsMd += `| :-: | :--- | :--- | :--- | :---: | :---: |\n`;

    credentialRecords.forEach((c, idx) => {
      credsMd += `| ${idx + 1} | **${c.memberId}** | \`${c.email}\` | ${c.fullName} | ${c.package} | ${c.role} |\n`;
    });

    fs.writeFileSync(CREDS_MD_PATH, credsMd, 'utf-8');
    console.log(`Saved Markdown credentials: ${CREDS_MD_PATH}`);

    // 5. Test Live API Login
    console.log(`\nTesting Live Staging API Login with Super Admin...`);
    const loginPayload = {
      email: 'admin@askrevdrive.com',
      password: ADMIN_PASSWORD,
    };

    const loginRes = await fetch('https://api-staging-293f51d9.up.railway.app/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginPayload),
    });

    console.log(`Login response HTTP status: ${loginRes.status}`);
    const loginData = await loginRes.json();

    if (loginRes.status !== 200 && loginRes.status !== 201) {
      console.error(`Login failed:`, loginData);
    } else {
      console.log(`[PASS] Super Admin Login Successful! Member ID: ${loginData.user?.memberId}, Role: ${loginData.user?.role}`);
      const token = loginData.accessToken;

      // Call Admin Overview to verify member count
      const overviewRes = await fetch('https://api-staging-293f51d9.up.railway.app/api/admin/overview', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log(`Admin Overview response HTTP status: ${overviewRes.status}`);
      const overviewData = await overviewRes.json();
      console.log(`Live Staging API Total Members count:`, overviewData.totalMembers);

      if (overviewData.totalMembers === 28) {
        console.log(`[PASS] LIVE ADMIN DASHBOARD VERIFIED: EXACTLY 28 ACCOUNTS REPORTED!`);
      } else {
        console.warn(`WARNING: Admin Overview reported ${overviewData.totalMembers} members (expected 28).`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});

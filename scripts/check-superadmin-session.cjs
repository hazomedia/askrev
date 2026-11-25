const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:YLsFUdfsvWxWVIVbVDfZdcsoRMXoxHwB@trolley.proxy.rlwy.net:41036/railway',
  ssl: false,
});

async function run() {
  await client.connect();
  const res = await client.query('SELECT id, email, role, "sessionVersion" FROM "User" WHERE role = \'SUPER_ADMIN\'');
  console.log('Super admins:', res.rows);
  await client.end();
}

run().catch(console.error);

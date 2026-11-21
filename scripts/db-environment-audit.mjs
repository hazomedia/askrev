import { PrismaClient } from '../packages/database/node_modules/@prisma/client/index.js';
import { execSync } from 'child_process';

async function audit() {
  console.log('='.repeat(80));
  console.log('   ASKR EV — DATABASE & ENVIRONMENT IDENTITY AUDIT');
  console.log('='.repeat(80));

  // 1. Local / Default Connection
  const prismaLocal = new PrismaClient();
  try {
    const dbInfo = await prismaLocal.$queryRawUnsafe(`
      SELECT 
        current_database() as db_name, 
        current_user as db_user, 
        version() as pg_version,
        inet_server_addr() as server_ip,
        inet_server_port() as server_port;
    `);
    console.log('DEFAULT/LOCAL PRISMA CONNECTION:');
    console.log(dbInfo);

    const tables = await prismaLocal.$queryRawUnsafe(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    console.log(`Discovered ${tables.length} tables in Local DB.`);

    const users = await prismaLocal.user.findMany({
      select: { id: true, memberId: true, email: true, role: true, currentPackage: true, createdAt: true },
      orderBy: { createdAt: 'asc' }
    });
    console.log(`\nUsers count in Local DB: ${users.length}`);
    users.forEach((u, i) => {
      console.log(`  [${i+1}] ${u.memberId} | ${u.email} | ${u.role} | ${u.currentPackage}`);
    });

  } catch (err) {
    console.error('Local DB Error:', err.message);
  } finally {
    await prismaLocal.$disconnect();
  }

  // 2. Railway Database Connection
  try {
    const rawVars = execSync('railway variable list --service Postgres --json', { stdio: 'pipe' }).toString();
    const parsed = JSON.parse(rawVars);
    const user = parsed.POSTGRES_USER || parsed.PGUSER;
    const password = parsed.POSTGRES_PASSWORD || parsed.PGPASSWORD;
    const host = parsed.RAILWAY_TCP_PROXY_DOMAIN;
    const port = parsed.RAILWAY_TCP_PROXY_PORT;
    const db = parsed.POSTGRES_DB || parsed.PGDATABASE || 'railway';

    if (user && password && host && port) {
      const railwayUrl = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${db}?sslmode=require`;
      const prismaRailway = new PrismaClient({ datasources: { db: { url: railwayUrl } } });
      
      const dbInfoRailway = await prismaRailway.$queryRawUnsafe(`
        SELECT 
          current_database() as db_name, 
          current_user as db_user, 
          inet_server_addr() as server_ip,
          inet_server_port() as server_port;
      `);
      console.log('\n' + '='.repeat(80));
      console.log('RAILWAY PRODUCTION/HOSTED DB CONNECTION:');
      console.log(dbInfoRailway);

      const usersRailway = await prismaRailway.user.findMany({
        select: { id: true, memberId: true, email: true, role: true, currentPackage: true, createdAt: true },
        orderBy: { createdAt: 'asc' }
      });
      console.log(`Users count in Railway DB: ${usersRailway.length}`);
      usersRailway.forEach((u, i) => {
        console.log(`  [${i+1}] ${u.memberId} | ${u.email} | ${u.role} | ${u.currentPackage}`);
      });

      await prismaRailway.$disconnect();
    }
  } catch (err) {
    console.error('Railway DB Error / Check bypassed:', err.message);
  }
}

audit();

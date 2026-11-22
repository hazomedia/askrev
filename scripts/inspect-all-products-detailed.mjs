// scripts/inspect-all-products-detailed.mjs
import { execSync } from 'child_process';
import { PrismaClient } from '../packages/database/dist/index.js';

async function inspect() {
  const rawVars = execSync('railway variable list --service Postgres --json', { stdio: 'pipe' }).toString();
  const parsed = JSON.parse(rawVars);
  const user = parsed.POSTGRES_USER || parsed.PGUSER;
  const password = parsed.POSTGRES_PASSWORD || parsed.PGPASSWORD;
  const host = parsed.RAILWAY_TCP_PROXY_DOMAIN;
  const port = parsed.RAILWAY_TCP_PROXY_PORT;
  const db = parsed.POSTGRES_DB || parsed.PGDATABASE || 'railway';

  const railwayUrl = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${db}?sslmode=require`;
  const prisma = new PrismaClient({ datasources: { db: { url: railwayUrl } } });

  const products = await prisma.product.findMany({
    orderBy: [{ category: 'asc' }, { displayOrder: 'asc' }, { createdAt: 'asc' }]
  });

  console.log(`=== FULL INVENTORY: ${products.length} PRODUCTS IN RAILWAY PRODUCTION DB ===\n`);
  for (const p of products) {
    console.log(`[${p.category}] ${p.name} (Slug: ${p.slug})`);
    console.log(`  ID:            ${p.id}`);
    console.log(`  Status:        ${p.status}`);
    console.log(`  Availability:  ${p.availability}`);
    console.log(`  Price:         ₹${p.pricePaise / 100} (${p.pricePaise} paise)`);
    console.log(`  Featured/Hero: Featured=${p.isFeatured}, Hero=${p.isHero}`);
    console.log(`  Primary Image: ${p.primaryImage}`);
    console.log(`  Images:        ${JSON.stringify(p.images)}`);
    console.log(`  Specs:         Range=${p.rangeKm}km, Speed=${p.topSpeedKmh}km/h, Battery=${p.batteryKwh}kWh`);
    console.log(`  Created:       ${p.createdAt.toISOString()}`);
    console.log('-'.repeat(60));
  }

  await prisma.$disconnect();
}

inspect();

import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

async function main() {
  const rows = await p.product.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      slugAliases: true,
      brand: true,
      oemManufacturer: true,
      oemModelName: true,
      status: true,
      displayOrder: true,
    },
    orderBy: { displayOrder: 'asc' },
  });

  console.log('Total products in DB:', rows.length);
  for (const r of rows) {
    console.log(
      `${r.displayOrder} | ${r.name} | slug: ${r.slug} | aliases: [${r.slugAliases.join(', ')}] | brand: ${r.brand} | OEM: ${r.oemManufacturer || '-'} | status: ${r.status}`
    );
  }
}

main().finally(() => p.$disconnect());

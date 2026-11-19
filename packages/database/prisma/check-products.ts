import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      slugAliases: true,
      category: true,
      brand: true,
      oemManufacturer: true,
      oemModelName: true,
      status: true,
      displayOrder: true,
    },
    orderBy: { displayOrder: 'asc' },
  });

  console.log(`\n=== Total Products in DB: ${products.length} ===`);
  for (const p of products) {
    console.log(
      `${String(p.displayOrder).padStart(2, ' ')} | [${p.status.padEnd(9)}] | ${p.category.padEnd(8)} | ${p.name.padEnd(20)} | slug: ${p.slug.padEnd(16)} | aliases: [${p.slugAliases.join(', ')}] | OEM: ${p.oemManufacturer || '-'}`
    );
  }
}

main().finally(() => prisma.$disconnect());

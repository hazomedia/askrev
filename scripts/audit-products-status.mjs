// scripts/audit-products-status.mjs
import { PrismaClient } from '../packages/database/dist/index.js';

const prisma = new PrismaClient();

async function audit() {
  const products = await prisma.product.findMany({
    include: {
      heroSlides: { select: { id: true, heading: true } },
      evBike: {
        include: {
          _count: { select: { bookings: true } },
        },
      },
    },
    orderBy: [{ category: 'asc' }, { displayOrder: 'asc' }],
  });

  console.log(`\n=== PRODUCT INVENTORY AUDIT (${products.length} Products Found) ===\n`);
  for (const p of products) {
    const colorCount = Array.isArray(p.colors) ? p.colors.length : 0;
    const bookingCount = p.evBike?._count?.bookings || 0;
    console.log(
      `[${p.status}] ${p.name.padEnd(20)} | Slug: ${p.slug.padEnd(16)} | Cat: ${p.category.padEnd(8)} | Colors: ${colorCount} | Bookings: ${bookingCount} | HeroSlides: ${p.heroSlides.length}`
    );
  }

  // Also check EvBikes
  const evBikes = await prisma.evBike.findMany({
    include: {
      _count: { select: { bookings: true, products: true } },
    },
  });
  console.log(`\n=== EV BIKES AUDIT (${evBikes.length} Records Found) ===\n`);
  for (const b of evBikes) {
    console.log(`EvBike: ${b.modelCode.padEnd(16)} | Name: ${b.name.padEnd(20)} | Bookings: ${b._count.bookings} | Products: ${b._count.products}`);
  }
}

audit()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

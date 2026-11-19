import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

async function run() {
  const products = await p.product.findMany({ orderBy: { displayOrder: 'asc' } });
  console.log(`Total products in DB: ${products.length}\n`);

  for (const prod of products) {
    const gallery = Array.isArray(prod.images) ? (prod.images as any[]).map((img: any) => img.url) : [];
    const variantImgs = Array.isArray(prod.colors) ? (prod.colors as any[]).map((c: any) => c.primaryImage || (c.images && c.images[0]?.url)) : [];
    console.log(`[${prod.status}] [${prod.category}] ${prod.name} (slug: ${prod.slug})`);
    console.log(`  ID: ${prod.id}`);
    console.log(`  Featured: ${prod.isFeatured} | Hero: ${prod.isHero}`);
    console.log(`  Primary Image: ${prod.heroImage || prod.thumbnailImage}`);
    console.log(`  Gallery Images (${gallery.length}): ${gallery.join(', ')}`);
    console.log(`  Variant Images (${variantImgs.length}): ${variantImgs.join(', ')}`);
    console.log('');
  }
}

run().finally(() => p.$disconnect());

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, memberId: true, email: true, role: true, twoFactorEnabled: true },
  });
  console.log(`Users count: ${users.length}`);
  console.log(users);

  const heroSlides = await prisma.homepageHeroSlide.findMany({
    select: { id: true, heading: true, status: true, sortOrder: true },
  });
  console.log(`Hero Slides count: ${heroSlides.length}`);
  console.log(heroSlides);

  const products = await prisma.product.findMany({
    select: { id: true, slug: true, name: true, status: true, category: true, isFeatured: true },
  });
  console.log(`Products count: ${products.length}`);
  console.log(products);
}

main().catch(console.error).finally(() => prisma.$disconnect());

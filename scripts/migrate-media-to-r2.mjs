// scripts/migrate-media-to-r2.mjs
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(path.resolve('apps/api/package.json'));
const dotenv = require('dotenv');
const {
  S3Client,
  HeadObjectCommand,
  PutObjectCommand,
} = require('@aws-sdk/client-s3');
const { PrismaClient } = require('@prisma/client');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'apps/api/.env') });

const prisma = new PrismaClient();
const isExecute = process.argv.includes('--execute');

const accountId = process.env.R2_ACCOUNT_ID?.trim();
const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
const bucketName = process.env.R2_BUCKET_NAME?.trim() || 'askrev-media';

if (!accountId || !accessKeyId || !secretAccessKey) {
  console.error('❌ Cloudflare R2 credentials missing in environment.');
  process.exit(1);
}

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

function detectMagicMime(buffer) {
  if (!buffer || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mime: 'image/png', ext: 'png' };
  }
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { mime: 'image/webp', ext: 'webp' };
  }
  return null;
}

async function migrate() {
  console.log('================================================================');
  console.log(`  ASKR EV — CLOUDFLARE R2 MEDIA MIGRATION UTILITY (${isExecute ? 'EXECUTE MODE' : 'DRY RUN'})`);
  console.log('================================================================\n');

  const webPublicDir = path.resolve(process.cwd(), 'apps/web/public');
  const migrationManifest = [];

  // 1. Audit HomepageHeroSlides
  const slides = await prisma.homepageHeroSlide.findMany();
  console.log(`Found ${slides.length} HomepageHeroSlide records to evaluate.`);

  for (const slide of slides) {
    if (slide.desktopImageUrl && !slide.desktopImageUrl.startsWith('/api/media/')) {
      const localRelPath = slide.desktopImageUrl.replace(/^\//, '');
      const fullPath = path.join(webPublicDir, localRelPath);
      if (fs.existsSync(fullPath)) {
        const buf = fs.readFileSync(fullPath);
        const detected = detectMagicMime(buf) || { mime: 'image/jpeg', ext: path.extname(fullPath).slice(1) || 'jpg' };
        const objectKey = `hero/desktop/${crypto.randomUUID()}.${detected.ext}`;
        migrationManifest.push({
          type: 'SLIDE_DESKTOP',
          id: slide.id,
          name: slide.heading,
          localPath: fullPath,
          oldUrl: slide.desktopImageUrl,
          objectKey,
          newUrl: `/api/media/${objectKey}`,
          mime: detected.mime,
          buffer: buf,
        });
      }
    }

    if (slide.mobileImageUrl && !slide.mobileImageUrl.startsWith('/api/media/')) {
      const localRelPath = slide.mobileImageUrl.replace(/^\//, '');
      const fullPath = path.join(webPublicDir, localRelPath);
      if (fs.existsSync(fullPath)) {
        const buf = fs.readFileSync(fullPath);
        const detected = detectMagicMime(buf) || { mime: 'image/jpeg', ext: path.extname(fullPath).slice(1) || 'jpg' };
        const objectKey = `hero/mobile/${crypto.randomUUID()}.${detected.ext}`;
        migrationManifest.push({
          type: 'SLIDE_MOBILE',
          id: slide.id,
          name: slide.heading,
          localPath: fullPath,
          oldUrl: slide.mobileImageUrl,
          objectKey,
          newUrl: `/api/media/${objectKey}`,
          mime: detected.mime,
          buffer: buf,
        });
      }
    }
  }

  // 2. Audit Products
  const products = await prisma.product.findMany();
  console.log(`Found ${products.length} Product records to evaluate.\n`);

  for (const prod of products) {
    if (prod.heroImage && !prod.heroImage.startsWith('/api/media/')) {
      const localRelPath = prod.heroImage.replace(/^\//, '');
      const fullPath = path.join(webPublicDir, localRelPath);
      if (fs.existsSync(fullPath)) {
        const buf = fs.readFileSync(fullPath);
        const detected = detectMagicMime(buf) || { mime: 'image/jpeg', ext: path.extname(fullPath).slice(1) || 'jpg' };
        const cleanSlug = prod.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 35);
        const objectKey = `vehicles/${cleanSlug}/gallery/${crypto.randomUUID()}.${detected.ext}`;
        migrationManifest.push({
          type: 'PRODUCT_HERO',
          id: prod.id,
          name: prod.name,
          localPath: fullPath,
          oldUrl: prod.heroImage,
          objectKey,
          newUrl: `/api/media/${objectKey}`,
          mime: detected.mime,
          buffer: buf,
        });
      }
    }
  }

  console.log(`Identified ${migrationManifest.length} local media assets eligible for R2 upload:`);
  migrationManifest.forEach((item, idx) => {
    console.log(`  [${idx + 1}] ${item.type}: "${item.name}" -> ${item.objectKey} (${(item.buffer.length / 1024).toFixed(1)} KB)`);
  });

  if (!isExecute) {
    console.log('\n💡 Dry-run complete. To execute upload to Cloudflare R2 and update database, pass --execute.');
    await prisma.$disconnect();
    return;
  }

  console.log('\n🚀 Starting R2 upload & database URL updates...');
  let uploadedCount = 0;
  const rollbackLog = [];

  for (const item of migrationManifest) {
    try {
      // 1. Upload to Cloudflare R2
      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: item.objectKey,
          Body: item.buffer,
          ContentType: item.mime,
          CacheControl: 'public, max-age=86400, stale-while-revalidate=3600',
          Metadata: {
            migratedFrom: item.oldUrl,
            migratedAt: new Date().toISOString(),
          },
        })
      );

      // 2. Verify with HeadObject
      await s3Client.send(
        new HeadObjectCommand({
          Bucket: bucketName,
          Key: item.objectKey,
        })
      );

      // 3. Update DB record
      if (item.type === 'SLIDE_DESKTOP') {
        await prisma.homepageHeroSlide.update({
          where: { id: item.id },
          data: { desktopImageUrl: item.newUrl },
        });
      } else if (item.type === 'SLIDE_MOBILE') {
        await prisma.homepageHeroSlide.update({
          where: { id: item.id },
          data: { mobileImageUrl: item.newUrl },
        });
      } else if (item.type === 'PRODUCT_HERO') {
        await prisma.product.update({
          where: { id: item.id },
          data: { heroImage: item.newUrl, thumbnailImage: item.newUrl },
        });
      }

      rollbackLog.push({ id: item.id, type: item.type, oldUrl: item.oldUrl, newUrl: item.newUrl, objectKey: item.objectKey });
      uploadedCount++;
      console.log(`  ✅ [${uploadedCount}/${migrationManifest.length}] Uploaded & Updated: ${item.name} (${item.newUrl})`);
    } catch (err) {
      console.error(`  ❌ Failed migrating ${item.name}: ${err.message}`);
    }
  }

  // Save rollback log
  const rollbackPath = path.resolve(process.cwd(), 'scripts/migration-rollback.json');
  fs.writeFileSync(rollbackPath, JSON.stringify(rollbackLog, null, 2));
  console.log(`\n🎉 Migration complete. Uploaded ${uploadedCount} assets to R2. Rollback manifest saved to ${rollbackPath}.`);
  console.log('Original files in apps/web/public/ remain untouched and intact on disk.');

  await prisma.$disconnect();
}

migrate().catch(console.error);

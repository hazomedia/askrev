const { PrismaClient } = require('../packages/database');

async function ensureTables(dbUrl, label) {
  console.log(`Ensuring support tables on [${label}]...`);
  const prisma = new PrismaClient({
    datasources: { db: { url: dbUrl } }
  });

  try {
    // 1. MemberSupportConsent table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "MemberSupportConsent" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "memberId" TEXT NOT NULL,
        "consentCode" TEXT NOT NULL,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "isConsumed" BOOLEAN NOT NULL DEFAULT false,
        "consumedAt" TIMESTAMP(3),
        "consumedByAdmin" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "MemberSupportConsent_pkey" PRIMARY KEY ("id")
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "MemberSupportConsent_consentCode_key" ON "MemberSupportConsent"("consentCode");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "MemberSupportConsent_memberId_idx" ON "MemberSupportConsent"("memberId");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "MemberSupportConsent_consentCode_idx" ON "MemberSupportConsent"("consentCode");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "MemberSupportConsent_isConsumed_idx" ON "MemberSupportConsent"("isConsumed");
    `);

    // 2. AdminSupportSession table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AdminSupportSession" (
        "id" TEXT NOT NULL,
        "sessionTokenHash" TEXT NOT NULL,
        "exchangeCodeHash" TEXT,
        "exchangeConsumedAt" TIMESTAMP(3),
        "adminUserId" TEXT NOT NULL,
        "adminEmail" TEXT NOT NULL,
        "targetUserId" TEXT NOT NULL,
        "targetMemberId" TEXT NOT NULL,
        "permissions" TEXT[] DEFAULT ARRAY['READ_ONLY'::TEXT],
        "scope" TEXT NOT NULL DEFAULT 'admin_support:read_only',
        "reason" TEXT NOT NULL,
        "consentReference" TEXT NOT NULL,
        "consentVerifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "consentProof" TEXT,
        "isRevoked" BOOLEAN NOT NULL DEFAULT false,
        "revokedAt" TIMESTAMP(3),
        "revokedBy" TEXT,
        "revocationReason" TEXT,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "AdminSupportSession_pkey" PRIMARY KEY ("id")
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "AdminSupportSession_sessionTokenHash_key" ON "AdminSupportSession"("sessionTokenHash");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "AdminSupportSession_exchangeCodeHash_key" ON "AdminSupportSession"("exchangeCodeHash");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "AdminSupportSession_adminUserId_idx" ON "AdminSupportSession"("adminUserId");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "AdminSupportSession_targetUserId_idx" ON "AdminSupportSession"("targetUserId");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "AdminSupportSession_isRevoked_idx" ON "AdminSupportSession"("isRevoked");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "AdminSupportSession_expiresAt_idx" ON "AdminSupportSession"("expiresAt");
    `);

    console.log(`✅ Support tables verified successfully on [${label}].`);
  } catch (err) {
    console.error(`❌ Failed on [${label}]:`, err.message);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

async function run() {
  const localUrl = process.env.LOCAL_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/askrev?schema=public';
  const prodUrl = 'postgresql://postgres:YLsFUdfsvWxWVIVbVDfZdcsoRMXoxHwB@trolley.proxy.rlwy.net:41036/railway';

  try {
    await ensureTables(localUrl, 'Local DB');
  } catch (e) {
    console.log('Local DB note:', e.message);
  }

  await ensureTables(prodUrl, 'Production Railway DB');
}

run().catch(console.error);

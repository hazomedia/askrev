import { PrismaClient, UserRole, MembershipPackage } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function generateSecurePassword(length = 24): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*-_=+';
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset[bytes[i] % charset.length];
  }
  return result;
}

async function main() {
  const email = (process.env.ADMIN_EMAIL || process.argv[2] || 'admin@askrevdrive.com').toLowerCase().trim();
  let password = process.env.ADMIN_PASSWORD || process.argv[3];
  let generated = false;

  if (!password) {
    password = generateSecurePassword(24);
    generated = true;
  }

  if (password === 'Admin@123456') {
    console.error('❌ Error: Default development passwords are strictly prohibited in production.');
    process.exit(1);
  }

  if (password.length < 12) {
    console.error('❌ Error: Production Super Admin password must be at least 12 characters.');
    process.exit(1);
  }

  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: UserRole.SUPER_ADMIN,
    },
    create: {
      memberId: 'ASKR-SUPERADMIN',
      email,
      passwordHash,
      fullName: process.env.ADMIN_NAME || 'Super Administrator',
      phone: process.env.ADMIN_PHONE || '+919999999999',
      role: UserRole.SUPER_ADMIN,
      currentPackage: MembershipPackage.FULL,
      isFullQualified: true,
      wallet: {
        create: {
          availableEarningsPaise: 0n,
          heldCommissionsPaise: 0n,
          pendingRecoveryPaise: 0n,
          shoppingVoucherBalancePaise: 0n,
        },
      },
      binaryPlacement: {
        create: {},
      },
    },
  });

  console.log('================================================================');
  console.log('✅ PRODUCTION SUPER ADMIN ACCOUNT PROVISIONED');
  console.log('================================================================');
  console.log(`Email:      ${admin.email}`);
  console.log(`Member ID:  ${admin.memberId}`);
  console.log(`Role:       ${admin.role}`);
  if (generated) {
    console.log(`Initial Password: ${password}`);
    console.log('⚠️  Store this initial credential securely! Reset after first login.');
  } else {
    console.log('Password:   [Set from environment variable]');
  }
  console.log(`2FA Status: ${admin.twoFactorEnabled ? 'Enabled' : 'Disabled (setup recommended on initial login)'}`);
  console.log('================================================================');
}

main().catch(console.error).finally(() => prisma.$disconnect());

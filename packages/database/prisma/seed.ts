import { PrismaClient, UserRole, MembershipPackage } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding ASKR EV Database ---');

  const defaultPassword = await bcrypt.hash('Admin@123456', 10);
  const memberPassword = await bcrypt.hash('Member@123456', 10);

  // 1. Super Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@askrev.com' },
    update: {},
    create: {
      memberId: 'ASKR-ADMIN-01',
      email: 'admin@askrev.com',
      passwordHash: defaultPassword,
      fullName: 'Chief Super Admin',
      phone: '+919876543210',
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
  console.log(`✓ Super Admin seeded: ${admin.email}`);

  // 2. Admin Operations
  const ops = await prisma.user.upsert({
    where: { email: 'ops@askrev.com' },
    update: {},
    create: {
      memberId: 'ASKR-OPS-01',
      email: 'ops@askrev.com',
      passwordHash: defaultPassword,
      fullName: 'Operations Manager',
      phone: '+919876543211',
      role: UserRole.ADMIN_OPERATIONS,
      currentPackage: MembershipPackage.FULL,
      isFullQualified: true,
      wallet: { create: {} },
      binaryPlacement: { create: {} },
    },
  });
  console.log(`✓ Ops Admin seeded: ${ops.email}`);

  // 3. Finance Manager
  const finance = await prisma.user.upsert({
    where: { email: 'finance@askrev.com' },
    update: {},
    create: {
      memberId: 'ASKR-FIN-01',
      email: 'finance@askrev.com',
      passwordHash: defaultPassword,
      fullName: 'Finance Controller',
      phone: '+919876543212',
      role: UserRole.FINANCE_MANAGER,
      currentPackage: MembershipPackage.FULL,
      isFullQualified: true,
      wallet: { create: {} },
      binaryPlacement: { create: {} },
    },
  });
  console.log(`✓ Finance Manager seeded: ${finance.email}`);

  // 4. Sponsor A (Rahul Sharma)
  const sponsorA = await prisma.user.upsert({
    where: { email: 'rahul.sponsor@askrev.com' },
    update: {},
    create: {
      memberId: 'ASKR-100001',
      email: 'rahul.sponsor@askrev.com',
      passwordHash: memberPassword,
      fullName: 'Rahul Sharma (Sponsor A)',
      phone: '+919811100001',
      role: UserRole.MEMBER,
      currentPackage: MembershipPackage.FULL,
      isFullQualified: true,
      wallet: {
        create: {
          availableEarningsPaise: 0n,
          heldCommissionsPaise: 0n,
          pendingRecoveryPaise: 0n,
          shoppingVoucherBalancePaise: 3000000n, // ₹30,000 voucher from Full membership
        },
      },
      binaryPlacement: { create: {} },
    },
  });
  console.log(`✓ Primary Sponsor A seeded: ${sponsorA.fullName} [${sponsorA.memberId}]`);

  // 5. Direct Referrals B, C, D, E for testing
  const referrals = [
    { memberId: 'ASKR-100002', email: 'b.patel@askrev.com', name: 'Member B (Priya Patel)' },
    { memberId: 'ASKR-100003', email: 'c.kumar@askrev.com', name: 'Member C (Amit Kumar)' },
    { memberId: 'ASKR-100004', email: 'd.singh@askrev.com', name: 'Member D (Neha Singh)' },
    { memberId: 'ASKR-100005', email: 'e.joshi@askrev.com', name: 'Member E (Vikram Joshi)' },
  ];

  for (const ref of referrals) {
    await prisma.user.upsert({
      where: { email: ref.email },
      update: {},
      create: {
        memberId: ref.memberId,
        email: ref.email,
        passwordHash: memberPassword,
        fullName: ref.name,
        phone: '+919811100099',
        role: UserRole.MEMBER,
        currentPackage: MembershipPackage.BASIC,
        isFullQualified: false,
        sponsorId: sponsorA.id,
        wallet: { create: {} },
        binaryPlacement: { create: { parentId: sponsorA.id } },
      },
    });
  }
  console.log(`✓ Direct referrals B, C, D, E seeded under Sponsor A`);

  // 6. EV Bike Demo Models
  const bikes = [
    {
      modelCode: 'ASKR-THUNDER-PRO',
      name: 'ASKR Thunder Pro',
      tagline: 'High-Torque Performance Urban Commuter',
      batteryCapacityKwh: 3.8,
      rangeKm: 135,
      topSpeedKmh: 95,
      chargingTimeHours: 3.5,
      exShowroomPricePaise: 12500000n, // ₹1,25,000
      bookingAmountPaise: 500000n, // ₹5,000
      voucherRedeemLimitPaise: 1500000n, // Max ₹15,000 voucher redeemable
      imageUrl: '/images/bikes/thunder-pro.webp',
      isAvailable: true,
    },
    {
      modelCode: 'ASKR-CITY-CRUISE',
      name: 'ASKR City Cruise',
      tagline: 'Ultra-Efficient Daily City Rider',
      batteryCapacityKwh: 2.5,
      rangeKm: 90,
      topSpeedKmh: 70,
      chargingTimeHours: 2.8,
      exShowroomPricePaise: 8900000n, // ₹89,000
      bookingAmountPaise: 300000n, // ₹3,000
      voucherRedeemLimitPaise: 1000000n, // Max ₹10,000 voucher redeemable
      imageUrl: '/images/bikes/city-cruise.webp',
      isAvailable: true,
    },
    {
      modelCode: 'ASKR-APEX-SPORT',
      name: 'ASKR Apex Sport',
      tagline: 'Track-Inspired Speed & Smart Telemetry',
      batteryCapacityKwh: 5.2,
      rangeKm: 175,
      topSpeedKmh: 120,
      chargingTimeHours: 4.0,
      exShowroomPricePaise: 16500000n, // ₹1,65,000
      bookingAmountPaise: 1000000n, // ₹10,000
      voucherRedeemLimitPaise: 3000000n, // Max ₹30,000 voucher redeemable
      imageUrl: '/images/bikes/apex-sport.webp',
      isAvailable: true,
    },
  ];

  for (const bike of bikes) {
    await prisma.evBike.upsert({
      where: { modelCode: bike.modelCode },
      update: {},
      create: bike,
    });
  }
  console.log(`✓ 3 Demo EV Bike Models seeded`);

  console.log('--- Database Seeding Complete ---');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient, UserRole, MembershipPackage, BinaryLeg, BannerStatus, PopupFrequency, PaymentOrderStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { seedProducts } from './seed-products';
import { seedRealVehicles } from './seed-real-vehicles';

const prisma = new PrismaClient();

export async function seedStaging() {
  console.log('=== SEEDING ASKR EV STAGING ENVIRONMENT (SYNTHETIC DATA ONLY) ===');

  const adminPassword = await bcrypt.hash('Admin@123456', 10);
  const memberPassword = await bcrypt.hash('Member@123456', 10);

  // 1. Super Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@askrev.com' },
    update: {},
    create: {
      memberId: 'ASKR-ADMIN-01',
      email: 'admin@askrev.com',
      passwordHash: adminPassword,
      fullName: 'Staging Super Admin',
      phone: '+919999000001',
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
      binaryPlacement: { create: {} },
    },
  });
  console.log(`✓ Super Admin seeded: ${admin.email}`);

  // 2. Admin Operations & Finance
  await prisma.user.upsert({
    where: { email: 'ops@askrev.com' },
    update: {},
    create: {
      memberId: 'ASKR-OPS-01',
      email: 'ops@askrev.com',
      passwordHash: adminPassword,
      fullName: 'Staging Ops Admin',
      phone: '+919999000002',
      role: UserRole.ADMIN_OPERATIONS,
      currentPackage: MembershipPackage.FULL,
      isFullQualified: true,
      wallet: { create: {} },
      binaryPlacement: { create: {} },
    },
  });

  await prisma.user.upsert({
    where: { email: 'finance@askrev.com' },
    update: {},
    create: {
      memberId: 'ASKR-FIN-01',
      email: 'finance@askrev.com',
      passwordHash: adminPassword,
      fullName: 'Staging Finance Controller',
      phone: '+919999000003',
      role: UserRole.FINANCE_MANAGER,
      currentPackage: MembershipPackage.FULL,
      isFullQualified: true,
      wallet: { create: {} },
      binaryPlacement: { create: {} },
    },
  });
  console.log('✓ Ops and Finance Admins seeded');

  // 3. Synthetic Tier Profiles: EV GO, EV PRO, EV ULTRA
  const evGo = await prisma.user.upsert({
    where: { email: 'evgo.member@askrev.com' },
    update: {},
    create: {
      memberId: 'ASKR-GO-001',
      email: 'evgo.member@askrev.com',
      passwordHash: memberPassword,
      fullName: 'Gaurav Oak (EV GO Member)',
      phone: '+919811100010',
      role: UserRole.FREE_USER,
      currentPackage: MembershipPackage.FREE,
      isFullQualified: false,
      wallet: {
        create: {
          availableEarningsPaise: 0n,
          heldCommissionsPaise: 0n,
          pendingRecoveryPaise: 0n,
          shoppingVoucherBalancePaise: 0n,
        },
      },
      binaryPlacement: { create: {} },
    },
  });

  const evPro = await prisma.user.upsert({
    where: { email: 'evpro.member@askrev.com' },
    update: {},
    create: {
      memberId: 'ASKR-PRO-001',
      email: 'evpro.member@askrev.com',
      passwordHash: memberPassword,
      fullName: 'Prashant Roy (EV PRO Member)',
      phone: '+919811100020',
      role: UserRole.MEMBER,
      currentPackage: MembershipPackage.BASIC,
      isFullQualified: false,
      wallet: {
        create: {
          availableEarningsPaise: 300000n, // ₹3,000 simulated earnings
          heldCommissionsPaise: 0n,
          pendingRecoveryPaise: 0n,
          shoppingVoucherBalancePaise: 300000n, // ₹3,000 voucher
        },
      },
      binaryPlacement: { create: {} },
    },
  });

  const evUltra = await prisma.user.upsert({
    where: { email: 'evultra.member@askrev.com' },
    update: {},
    create: {
      memberId: 'ASKR-ULTRA-001',
      email: 'evultra.member@askrev.com',
      passwordHash: memberPassword,
      fullName: 'Urvashi Rao (EV ULTRA Member)',
      phone: '+919811100030',
      role: UserRole.MEMBER,
      currentPackage: MembershipPackage.FULL,
      isFullQualified: true,
      wallet: {
        create: {
          availableEarningsPaise: 1500000n, // ₹15,000 simulated earnings
          heldCommissionsPaise: 0n,
          pendingRecoveryPaise: 0n,
          shoppingVoucherBalancePaise: 3000000n, // ₹30,000 voucher
        },
      },
      binaryPlacement: { create: {} },
    },
  });
  console.log(`✓ Synthetic tier members seeded: EV GO [${evGo.memberId}], EV PRO [${evPro.memberId}], EV ULTRA [${evUltra.memberId}]`);

  // 4. Binary Tree Scenario: Root Sponsor + LEFT & RIGHT Legs
  const sponsorRoot = await prisma.user.upsert({
    where: { email: 'rahul.sponsor@askrev.com' },
    update: {},
    create: {
      memberId: 'ASKR-100001',
      email: 'rahul.sponsor@askrev.com',
      passwordHash: memberPassword,
      fullName: 'Rahul Sharma (Root Sponsor)',
      phone: '+919811100001',
      role: UserRole.MEMBER,
      currentPackage: MembershipPackage.FULL,
      isFullQualified: true,
      wallet: {
        create: {
          availableEarningsPaise: 600000n, // ₹6,000 earnings
          heldCommissionsPaise: 0n,
          pendingRecoveryPaise: 0n,
          shoppingVoucherBalancePaise: 3000000n, // ₹30,000 voucher
        },
      },
      binaryPlacement: {
        create: {
          leftCount: 3,
          rightCount: 1,
          leftVolumePaise: 900000n,
          rightVolumePaise: 300000n,
          carryLeftPaise: 600000n, // 2 pairs carry on left
          carryRightPaise: 0n,
          totalMatchesConsumed: 1,
          totalRewardEarnedPaise: 300000n, // 1 pair settled (₹3,000)
        },
      },
    },
  });

  // Left child (Priya Patel)
  const leftChild = await prisma.user.upsert({
    where: { email: 'priya.left@askrev.com' },
    update: {},
    create: {
      memberId: 'ASKR-100002',
      email: 'priya.left@askrev.com',
      passwordHash: memberPassword,
      fullName: 'Priya Patel (Left Leg)',
      phone: '+919811100002',
      role: UserRole.MEMBER,
      currentPackage: MembershipPackage.BASIC,
      isFullQualified: false,
      sponsorId: sponsorRoot.id,
      wallet: {
        create: {
          availableEarningsPaise: 300000n,
          shoppingVoucherBalancePaise: 300000n,
        },
      },
      binaryPlacement: {
        create: {
          parentId: sponsorRoot.id,
          leg: BinaryLeg.LEFT,
          leftCount: 1,
          rightCount: 1,
          leftVolumePaise: 300000n,
          rightVolumePaise: 300000n,
          carryLeftPaise: 0n,
          carryRightPaise: 0n,
          totalMatchesConsumed: 1,
          totalRewardEarnedPaise: 300000n,
        },
      },
    },
  });

  // Right child (Amit Kumar)
  const rightChild = await prisma.user.upsert({
    where: { email: 'amit.right@askrev.com' },
    update: {},
    create: {
      memberId: 'ASKR-100003',
      email: 'amit.right@askrev.com',
      passwordHash: memberPassword,
      fullName: 'Amit Kumar (Right Leg)',
      phone: '+919811100003',
      role: UserRole.MEMBER,
      currentPackage: MembershipPackage.BASIC,
      isFullQualified: false,
      sponsorId: sponsorRoot.id,
      wallet: {
        create: {
          availableEarningsPaise: 0n,
          shoppingVoucherBalancePaise: 300000n,
        },
      },
      binaryPlacement: {
        create: {
          parentId: sponsorRoot.id,
          leg: BinaryLeg.RIGHT,
          leftCount: 0,
          rightCount: 0,
          leftVolumePaise: 0n,
          rightVolumePaise: 0n,
        },
      },
    },
  });

  // Sub-children under Priya (Left-Left and Left-Right)
  await prisma.user.upsert({
    where: { email: 'neha.subleft@askrev.com' },
    update: {},
    create: {
      memberId: 'ASKR-100004',
      email: 'neha.subleft@askrev.com',
      passwordHash: memberPassword,
      fullName: 'Neha Singh (Left Sub-Leg)',
      phone: '+919811100004',
      role: UserRole.MEMBER,
      currentPackage: MembershipPackage.BASIC,
      isFullQualified: false,
      sponsorId: leftChild.id,
      wallet: { create: {} },
      binaryPlacement: {
        create: {
          parentId: leftChild.id,
          leg: BinaryLeg.LEFT,
        },
      },
    },
  });

  await prisma.user.upsert({
    where: { email: 'vikram.subright@askrev.com' },
    update: {},
    create: {
      memberId: 'ASKR-100005',
      email: 'vikram.subright@askrev.com',
      passwordHash: memberPassword,
      fullName: 'Vikram Joshi (Right Sub-Leg)',
      phone: '+919811100005',
      role: UserRole.MEMBER,
      currentPackage: MembershipPackage.BASIC,
      isFullQualified: false,
      sponsorId: leftChild.id,
      wallet: { create: {} },
      binaryPlacement: {
        create: {
          parentId: leftChild.id,
          leg: BinaryLeg.RIGHT,
        },
      },
    },
  });
  console.log(`✓ Binary Tree Scenario seeded with root, LEFT leg, RIGHT leg, and sub-children`);

  // 5. Seed Demo EV Bike Models
  const thunderPro = await prisma.evBike.upsert({
    where: { modelCode: 'ASKR-THUNDER-PRO' },
    update: {},
    create: {
      modelCode: 'ASKR-THUNDER-PRO',
      name: 'ASKR Thunder Pro',
      tagline: 'High-Torque Performance Urban Commuter',
      batteryCapacityKwh: 3.8,
      rangeKm: 135,
      topSpeedKmh: 95,
      chargingTimeHours: 3.5,
      exShowroomPricePaise: 12500000n, // ₹1,25,000
      bookingAmountPaise: 300000n, // ₹3,000
      voucherRedeemLimitPaise: 1500000n, // ₹15,000
      imageUrl: '/images/bikes/thunder-pro.webp',
      isAvailable: true,
    },
  });

  const apexSport = await prisma.evBike.upsert({
    where: { modelCode: 'ASKR-APEX-SPORT' },
    update: {},
    create: {
      modelCode: 'ASKR-APEX-SPORT',
      name: 'ASKR Apex Sport',
      tagline: 'Track-Inspired Speed & Smart Telemetry',
      batteryCapacityKwh: 5.2,
      rangeKm: 175,
      topSpeedKmh: 120,
      chargingTimeHours: 4.0,
      exShowroomPricePaise: 16500000n, // ₹1,65,000
      bookingAmountPaise: 3300000n, // ₹33,000
      voucherRedeemLimitPaise: 3000000n, // ₹30,000
      imageUrl: '/images/bikes/apex-sport.webp',
      isAvailable: true,
    },
  });
  console.log('✓ Demo EV Bikes seeded');

  // Seed Product Catalog & Real Vehicles
  await seedProducts();
  await seedRealVehicles();
  console.log('✓ Product catalog & Real vehicles seeded');

  // 6. Seed Synthetic Shopping Vouchers
  await prisma.shoppingVoucher.upsert({
    where: { voucherCode: 'VCHR-STG-100001' },
    update: {},
    create: {
      voucherCode: 'VCHR-STG-100001',
      userId: sponsorRoot.id,
      initialValuePaise: 3000000n,
      remainingBalancePaise: 3000000n,
      issuedReason: 'FULL_MEMBERSHIP_ACTIVATION_GRANT',
      status: 'ACTIVE',
      expiresAt: new Date('2099-12-31T23:59:59.999Z'),
    },
  });

  await prisma.shoppingVoucher.upsert({
    where: { voucherCode: 'VCHR-STG-ULTRA-001' },
    update: {},
    create: {
      voucherCode: 'VCHR-STG-ULTRA-001',
      userId: evUltra.id,
      initialValuePaise: 3000000n,
      remainingBalancePaise: 3000000n,
      issuedReason: 'FULL_MEMBERSHIP_ACTIVATION_GRANT',
      status: 'ACTIVE',
      expiresAt: new Date('2099-12-31T23:59:59.999Z'),
    },
  });

  await prisma.shoppingVoucher.upsert({
    where: { voucherCode: 'VCHR-STG-PRO-001' },
    update: {},
    create: {
      voucherCode: 'VCHR-STG-PRO-001',
      userId: evPro.id,
      initialValuePaise: 300000n,
      remainingBalancePaise: 300000n,
      issuedReason: 'BASIC_MEMBERSHIP_ACTIVATION_GRANT',
      status: 'ACTIVE',
      expiresAt: new Date('2099-12-31T23:59:59.999Z'),
    },
  });
  console.log('✓ Synthetic Shopping Vouchers seeded');

  // 7. Seed Simulated Bookings & Payments
  await prisma.evBooking.upsert({
    where: { bookingNumber: 'BK-STG-PRO-001' },
    update: {},
    create: {
      bookingNumber: 'BK-STG-PRO-001',
      userId: evPro.id,
      bikeId: thunderPro.id,
      bookingAmountPaise: 300000n, // ₹3,000
      voucherAppliedPaise: 0n,
      netCashPaidPaise: 300000n,
      bookingStatus: 'PAYMENT_VERIFIED',
      paymentReference: 'UTR-STG-PRO-998811',
    },
  });

  await prisma.paymentOrder.upsert({
    where: { merchantReference: 'RCPT-STG-PRO-001' },
    update: {},
    create: {
      merchantReference: 'RCPT-STG-PRO-001',
      userId: evPro.id,
      memberId: evPro.memberId,
      provider: 'SIMULATED',
      requestType: 'BASIC_ACTIVATION',
      amountPaise: 300000n,
      status: PaymentOrderStatus.VERIFIED,
      providerOrderId: 'SIM-ORD-PRO-001',
      providerPaymentId: 'SIM-PAY-PRO-001',
      verifiedAt: new Date(),
    },
  });

  await prisma.evBooking.upsert({
    where: { bookingNumber: 'BK-STG-ULTRA-001' },
    update: {},
    create: {
      bookingNumber: 'BK-STG-ULTRA-001',
      userId: evUltra.id,
      bikeId: apexSport.id,
      bookingAmountPaise: 3300000n, // ₹33,000
      voucherAppliedPaise: 0n,
      netCashPaidPaise: 3300000n,
      bookingStatus: 'PAYMENT_VERIFIED',
      paymentReference: 'UTR-STG-ULTRA-998833',
    },
  });

  await prisma.paymentOrder.upsert({
    where: { merchantReference: 'RCPT-STG-ULTRA-001' },
    update: {},
    create: {
      merchantReference: 'RCPT-STG-ULTRA-001',
      userId: evUltra.id,
      memberId: evUltra.memberId,
      provider: 'SIMULATED',
      requestType: 'FULL_ACTIVATION',
      amountPaise: 3300000n,
      status: PaymentOrderStatus.VERIFIED,
      providerOrderId: 'SIM-ORD-ULTRA-001',
      providerPaymentId: 'SIM-PAY-ULTRA-001',
      verifiedAt: new Date(),
    },
  });
  console.log('✓ Simulated EV Bookings and Verified Payment Orders seeded');

  // 8. Seed Promotional Top Banner Carousel Slides
  await prisma.dashboardTopBanner.deleteMany({});
  await prisma.dashboardTopBanner.createMany({
    data: [
      {
        title: 'ASKR EV Urban Mobility Fleet',
        subtitle: 'Smart • Connected • Sustainable Electric Mobility',
        badgeText: 'ELECTRIC MOBILITY',
        buttonText: 'EXPLORE FLEET',
        desktopImageUrl: '/uploads/hero/desktop/urban-fleet-hero---harsil-leo-_1795105582720_1e863ffb12443fbf.webp',
        mobileImageUrl: '/uploads/hero/desktop/urban-fleet-hero---harsil-leo-_1795105582720_1e863ffb12443fbf.webp',
        linkUrl: '/dashboard',
        altText: 'ASKR EV Urban Fleet',
        displayOrder: 0,
        status: BannerStatus.PUBLISHED,
        isEnabled: true,
        autoplayInterval: 5000,
      },
      {
        title: 'EV PRO & EV ULTRA Booking Program',
        subtitle: 'Book with ₹3,000 or ₹33,000 & Earn Shopping Vouchers',
        badgeText: 'EARN WITH EV',
        buttonText: 'BOOK NOW',
        desktopImageUrl: '/uploads/hero/desktop/urban-fleet-hero---harsil-leo-_1795105582720_1e863ffb12443fbf.webp',
        mobileImageUrl: '/uploads/hero/desktop/urban-fleet-hero---harsil-leo-_1795105582720_1e863ffb12443fbf.webp',
        linkUrl: '/book',
        altText: 'ASKR EV Booking Program',
        displayOrder: 1,
        status: BannerStatus.PUBLISHED,
        isEnabled: true,
        autoplayInterval: 5000,
      },
    ],
  });
  console.log('✓ Dashboard Top Banner promotional carousel slides seeded');

  // 9. Seed Default Welcome Popup Campaign (EVERY_VISIT)
  await prisma.popupCampaign.upsert({
    where: { id: 'staging-welcome-popup-01' },
    update: {
      frequency: PopupFrequency.EVERY_VISIT,
      status: BannerStatus.PUBLISHED,
    },
    create: {
      id: 'staging-welcome-popup-01',
      name: 'ASKR EV Welcome',
      heading: 'WELCOME TO ASKR EV',
      subheading: 'Experience Sustainable Mobility & Earn with Every Referral',
      message: 'Direct Referral Rewards & Instant Binary Matching • 100% Value Shopping Vouchers on EV Booking • Official EV Fleet Access & Nationwide Dealership Support',
      buttonText: 'EXPLORE DASHBOARD',
      buttonLink: '/dashboard',
      footerText: 'SMART MOBILITY • CONNECTED FUTURE',
      imageUrl: '/uploads/hero/desktop/urban-fleet-hero---harsil-leo-_1795105582720_1e863ffb12443fbf.webp',
      frequency: PopupFrequency.EVERY_VISIT,
      status: BannerStatus.PUBLISHED,
    },
  });
  console.log('✓ ASKR EV Welcome Popup Campaign (EVERY_VISIT) seeded');

  console.log('=== STAGING DATABASE SEEDING COMPLETED SUCCESSFULLY ===');
}

if (require.main === module) {
  seedStaging()
    .catch((e) => {
      console.error('Error seeding staging database:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

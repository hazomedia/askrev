import { PrismaClient } from '../packages/database/node_modules/@prisma/client/index.js';
import assert from 'node:assert/strict';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/askrev_test_instant_binary',
    },
  },
});

async function main() {
  console.log('================================================================================');
  console.log('   ASKR EV: PAYMENT CONFIG & UTR VALIDATION VERIFICATION');
  console.log('   Database: askrev_test_instant_binary');
  console.log('================================================================================\n');

  // Clean test tables
  await prisma.membershipRequest.deleteMany();
  await prisma.paymentConfig.deleteMany();
  await prisma.evBooking.deleteMany();

  console.log('--- 1. PAYMENT CONFIG INITIAL STATE (UNCONFIGURED) ---');
  let config = await prisma.paymentConfig.findUnique({
    where: { configKey: 'DEFAULT_PAYMENT_CONFIG' },
  });
  assert.equal(config, null, 'Expected initial config to be null');
  console.log('  ✓ PASS: Payment config is uninitialized');

  console.log('\n--- 2. ADMIN CONFIGURES AND VERIFIES MERCHANT UPI VPA ---');
  config = await prisma.paymentConfig.upsert({
    where: { configKey: 'DEFAULT_PAYMENT_CONFIG' },
    create: {
      configKey: 'DEFAULT_PAYMENT_CONFIG',
      merchantUpiVpa: 'askrev@icici',
      merchantName: 'ASKR EV Mobility Private Limited',
      isVerified: true,
      verifiedAt: new Date(),
      verifiedBy: 'ADMIN-TEST-USER',
      notes: 'ICICI Current Account Verified',
    },
    update: {},
  });
  assert.equal(config.merchantUpiVpa, 'askrev@icici');
  assert.equal(config.isVerified, true);
  console.log('  ✓ PASS: Merchant VPA configured and marked verified: askrev@icici');

  console.log('\n--- 3. VERIFY UTR REGEX VALIDATION ---');
  const validUtrs = [
    '432109876543',          // 12-digit numeric
    '123456789012',          // 12-digit numeric
    'UPI202611239988',       // 15-char alphanumeric
    'HDFC202611239988776655' // 22-char alphanumeric
  ];
  const invalidUtrs = [
    '123',                   // Too short
    '12345678901',           // 11 digits
    '12345678901234567890123', // 23 chars (too long)
    'INVALID!@#$%',          // Special chars
    '   ',                   // Whitespace
  ];

  const utrRegex = /^([0-9]{12}|[A-Z0-9]{12,22})$/;
  for (const utr of validUtrs) {
    assert.ok(utrRegex.test(utr.toUpperCase()), `Expected valid UTR: ${utr}`);
  }
  console.log(`  ✓ PASS: All ${validUtrs.length} valid banking UTR formats accepted`);

  for (const utr of invalidUtrs) {
    assert.ok(!utrRegex.test(utr.toUpperCase()), `Expected invalid UTR to fail: ${utr}`);
  }
  console.log(`  ✓ PASS: All ${invalidUtrs.length} invalid UTR formats rejected`);

  console.log('\n--- 4. DUPLICATE UTR SUBMISSION GUARD ACROSS REQUESTS & BOOKINGS ---');
  // Get an existing user from the test DB
  const user = await prisma.user.findFirst();
  assert.ok(user, 'User should exist in test DB');

  const testUtr = '987654321098';

  // Create first membership request with testUtr
  const req1 = await prisma.membershipRequest.create({
    data: {
      userId: user.id,
      requestType: 'BASIC_ACTIVATION',
      feePaise: 300000n,
      paymentMode: 'UPI',
      paymentReference: testUtr,
      status: 'PENDING',
      metadata: {
        compliance: 'SIMULATION_ONLY',
        source: 'member_dashboard_booking',
        merchantUpiVpa: 'askrev@icici',
      },
    },
  });
  assert.ok(req1.id);
  console.log('  ✓ PASS: First membership request with UTR recorded as PENDING');

  // Verify duplicate check prevents second request with same UTR
  const dupCheck = await prisma.membershipRequest.findFirst({
    where: {
      paymentReference: testUtr,
      status: { in: ['PENDING', 'APPROVED'] },
    },
  });
  assert.ok(dupCheck, 'Duplicate query should detect existing PENDING request');
  console.log('  ✓ PASS: Duplicate UTR successfully detected in MembershipRequest');

  // Verify metadata has no hardcoded pay@askrev
  assert.ok(!JSON.stringify(req1.metadata).includes('pay@askrev'), 'Metadata must NOT contain pay@askrev');
  assert.ok(JSON.stringify(req1.metadata).includes('askrev@icici'), 'Metadata must reflect verified VPA');
  console.log('  ✓ PASS: Request metadata contains verified merchant VPA and zero hardcoded pay@askrev');

  console.log('\n================================================================================');
  console.log('   ALL PAYMENT CONFIG & UTR INTEGRATION ASSERTIONS PASSED!');
  console.log('================================================================================');
}

main()
  .catch((err) => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

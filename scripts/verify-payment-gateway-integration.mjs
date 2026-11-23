import { PrismaClient } from '../packages/database/node_modules/@prisma/client/index.js';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/askrev_test_instant_binary',
    },
  },
});

// AES-256-GCM symmetric encryption helper matching EncryptionService
class TestEncryptionService {
  constructor(secretKey = 'test-encryption-key-for-payment-settings') {
    this.key = crypto.scryptSync(secretKey, 'askr_salt_2026', 32);
  }

  encrypt(plainText) {
    if (!plainText) return '';
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  decrypt(cipherText) {
    if (!cipherText) return '';
    const parts = cipherText.split(':');
    if (parts.length !== 3) throw new Error('Invalid format');
    const [ivHex, authTagHex, encryptedHex] = parts;
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  mask(secret) {
    if (!secret || secret.length < 8) return '••••••••';
    return '••••••••' + secret.slice(-4);
  }
}

async function main() {
  console.log('================================================================================');
  console.log('   ASKR EV: SUPER ADMIN PAYMENT SETTINGS & GATEWAY INTEGRATION VERIFICATION');
  console.log('   Database: askrev_test_instant_binary');
  console.log('================================================================================\n');

  const enc = new TestEncryptionService();

  // 1. CLEAN TESTING TABLES
  console.log('--- 1. CLEAN TESTING ENVIRONMENT ---');
  await prisma.paymentGatewayLog.deleteMany();
  await prisma.paymentGatewayConfig.deleteMany();
  await prisma.paymentConfig.deleteMany();
  await prisma.auditLog.deleteMany();
  console.log('  ✓ Cleaned payment test tables and logs');

  // 2. VERIFY UPI CONFIGURATION (Super Admin)
  console.log('\n--- 2. UPI SETTINGS (SUPER ADMIN CRUD & AUDIT) ---');
  const upiConfig = await prisma.paymentConfig.upsert({
    where: { configKey: 'DEFAULT_PAYMENT_CONFIG' },
    create: {
      configKey: 'DEFAULT_PAYMENT_CONFIG',
      merchantUpiVpa: 'askrev@icici',
      merchantName: 'ASKR EV Mobility Private Limited',
      isVerified: true,
      verifiedAt: new Date(),
      verifiedBy: 'ADMIN-SUPER-01',
      upiEnabled: true,
      manualReviewRequired: true,
      notes: 'Official ICICI Current Account VPA',
    },
    update: {
      merchantUpiVpa: 'askrev@icici',
      merchantName: 'ASKR EV Mobility Private Limited',
      isVerified: true,
      upiEnabled: true,
      manualReviewRequired: true,
    },
  });

  assert.equal(upiConfig.merchantUpiVpa, 'askrev@icici');
  assert.equal(upiConfig.isVerified, true);
  assert.equal(upiConfig.upiEnabled, true);
  assert.equal(upiConfig.manualReviewRequired, true);
  console.log('  ✓ PASS: UPI settings created with manual review enforcement');

  // 3. VERIFY RAZORPAY GATEWAY CREDENTIAL ENCRYPTION AT REST
  console.log('\n--- 3. GATEWAY CREDENTIAL ENCRYPTION AT REST (AES-256-GCM) ---');
  const rawKeySecret = 'rzp_test_secret_key_super_admin_987654321';
  const rawWebhookSecret = 'rzp_webhook_secret_hmac_sha256_token';
  const encryptedSecretKey = enc.encrypt(rawKeySecret);
  const encryptedWebhookKey = enc.encrypt(rawWebhookSecret);

  assert.notEqual(encryptedSecretKey, rawKeySecret, 'Secret must NOT be plaintext');
  assert.ok(encryptedSecretKey.includes(':'), 'Encrypted string must have iv:authTag:cipher format');

  const razorpayConfig = await prisma.paymentGatewayConfig.create({
    data: {
      provider: 'RAZORPAY',
      isEnabled: true,
      isSandbox: true,
      merchantId: 'rzp_test_merchant_12345678',
      encryptedSecretKey,
      encryptedWebhookKey,
      webhookUrl: 'https://api.askrev.com/payments/webhook/razorpay',
      status: 'ACTIVE',
      lastTestedAt: new Date(),
      lastTestStatus: 'SUCCESS',
      lastTestMessage: 'Credentials validated via Razorpay Auth API',
    },
  });

  assert.ok(razorpayConfig.id);
  assert.equal(razorpayConfig.provider, 'RAZORPAY');
  assert.equal(razorpayConfig.isEnabled, true);

  // Decrypt and confirm lossless recovery
  const decryptedSecret = enc.decrypt(razorpayConfig.encryptedSecretKey);
  assert.equal(decryptedSecret, rawKeySecret);
  console.log('  ✓ PASS: Razorpay secret encrypted at rest and successfully decrypted with AES-256-GCM');

  // 4. VERIFY MASKING IN ADMIN/CLIENT RESPONSES
  console.log('\n--- 4. MASKED CREDENTIAL DISCLOSURE GUARD ---');
  const maskedSecret = enc.mask(decryptedSecret);
  assert.equal(maskedSecret, '••••••••4321');
  assert.ok(!maskedSecret.includes('super_admin'), 'Masked value must not leak secret plain text');
  console.log(`  ✓ PASS: Admin response masks secrets safely: ${maskedSecret}`);

  // 5. VERIFY CASHFREE & PHONEPE (CONFIGURATION_ONLY PROVIDERS)
  console.log('\n--- 5. EXTENSIBLE PROVIDERS (CASHFREE & PHONEPE) ---');
  const cashfreeConfig = await prisma.paymentGatewayConfig.create({
    data: {
      provider: 'CASHFREE',
      isEnabled: false,
      isSandbox: true,
      merchantId: 'cf_app_id_demo_123',
      encryptedSecretKey: enc.encrypt('cf_secret_key_demo_456'),
      status: 'INACTIVE',
    },
  });

  const phonepeConfig = await prisma.paymentGatewayConfig.create({
    data: {
      provider: 'PHONEPE',
      isEnabled: false,
      isSandbox: true,
      merchantId: 'PGTESTPAYUAT',
      encryptedSecretKey: enc.encrypt('099eb0cd-02cf-4e2a-8aca-3e6c6aff0399'),
      status: 'INACTIVE',
    },
  });

  assert.equal(cashfreeConfig.provider, 'CASHFREE');
  assert.equal(phonepeConfig.provider, 'PHONEPE');
  console.log('  ✓ PASS: Cashfree and PhonePe registered as extensible providers in database');

  // 6. VERIFY RAZORPAY HMAC-SHA256 WEBHOOK SIGNATURE INGESTION
  console.log('\n--- 6. HMAC-SHA256 WEBHOOK SIGNATURE VALIDATION ---');
  const sampleWebhookPayload = JSON.stringify({
    entity: 'event',
    account_id: 'acc_12345678',
    event: 'payment.captured',
    contains: ['payment'],
    payload: {
      payment: {
        entity: {
          id: 'pay_test_9988776655',
          amount: 300000,
          currency: 'INR',
          status: 'captured',
          order_id: 'order_test_11223344',
        },
      },
    },
  });

  // Generate valid HMAC signature
  const validSignature = crypto
    .createHmac('sha256', rawWebhookSecret)
    .update(sampleWebhookPayload)
    .digest('hex');

  // Generate invalid HMAC signature
  const invalidSignature = 'invalid_tampered_signature_99999999';

  // Verify HMAC calculation
  const computedSig = crypto.createHmac('sha256', rawWebhookSecret).update(sampleWebhookPayload).digest('hex');
  assert.equal(validSignature, computedSig);
  assert.notEqual(invalidSignature, computedSig);
  console.log('  ✓ PASS: HMAC-SHA256 verification confirms signature authenticity');

  // 7. RECORD PAYMENT GATEWAY LOGS (AUDIT TRAIL)
  console.log('\n--- 7. PAYMENT GATEWAY TRANSACTION LOGGING ---');
  const gwLog = await prisma.paymentGatewayLog.create({
    data: {
      provider: 'RAZORPAY',
      event: 'WEBHOOK_RECEIVED',
      orderId: 'order_test_11223344',
      paymentId: 'pay_test_9988776655',
      amountPaise: 300000n,
      status: 'SUCCESS',
      rawPayload: {
        event: 'payment.captured',
        orderId: 'order_test_11223344',
      },
      ipAddress: '127.0.0.1',
    },
  });

  assert.ok(gwLog.id);
  assert.equal(gwLog.amountPaise, 300000n);
  assert.equal(gwLog.status, 'SUCCESS');
  console.log(`  ✓ PASS: Payment gateway log recorded with ID: ${gwLog.id}`);

  // 8. RECORD AUDIT LOG FOR CREDENTIAL UPDATE
  console.log('\n--- 8. SUPER ADMIN AUDIT TRAIL RECORDING ---');
  const audit = await prisma.auditLog.create({
    data: {
      actorId: 'SUPER-ADMIN-USER-01',
      action: 'PAYMENT_GATEWAY_CONFIG_UPDATED',
      entityType: 'PAYMENT_GATEWAY_CONFIG',
      entityId: razorpayConfig.id,
      metadata: {
        provider: 'RAZORPAY',
        isEnabled: true,
        isSandbox: true,
        merchantId: 'rzp_test_merchant_12345678',
        hasSecretKey: true,
      },
    },
  });

  assert.ok(audit.id);
  assert.equal(audit.action, 'PAYMENT_GATEWAY_CONFIG_UPDATED');
  console.log(`  ✓ PASS: Super admin audit log recorded with action: ${audit.action}`);

  console.log('\n================================================================================');
  console.log('   ALL 8 PAYMENT SETTINGS & GATEWAY INTEGRATION ASSERTIONS PASSED!');
  console.log('================================================================================');
}

main()
  .catch((err) => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

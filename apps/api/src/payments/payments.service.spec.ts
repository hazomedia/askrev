import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EncryptionService } from '../common/encryption.service';
import { PineLabsGatewayProvider } from './providers/pinelabs.provider';
import { RazorpayGatewayProvider } from './providers/razorpay.provider';
import { CashfreeGatewayProvider } from './providers/cashfree.provider';
import { PhonePeGatewayProvider } from './providers/phonepe.provider';
import { PaymentGatewayRegistry } from './providers/payment-gateway.registry';
import { PaymentsService } from './payments.service';
import * as crypto from 'crypto';

describe('Payment Settings & Gateway Integration Suite', () => {
  let encryptionService: EncryptionService;
  let pineLabsProvider: PineLabsGatewayProvider;
  let razorpayProvider: RazorpayGatewayProvider;
  let cashfreeProvider: CashfreeGatewayProvider;
  let phonepeProvider: PhonePeGatewayProvider;
  let registry: PaymentGatewayRegistry;
  let paymentsService: PaymentsService;
  let mockPrisma: any;

  beforeEach(() => {
    encryptionService = new EncryptionService();
    pineLabsProvider = new PineLabsGatewayProvider();
    razorpayProvider = new RazorpayGatewayProvider();
    cashfreeProvider = new CashfreeGatewayProvider();
    phonepeProvider = new PhonePeGatewayProvider();
    registry = new PaymentGatewayRegistry(
      pineLabsProvider,
      razorpayProvider,
      cashfreeProvider,
      phonepeProvider
    );

    mockPrisma = {
      paymentConfig: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
        create: vi.fn(),
      },
      paymentGatewayConfig: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        upsert: vi.fn(),
        update: vi.fn(),
      },
      paymentGatewayLog: {
        create: vi.fn().mockResolvedValue({ id: 'log-1' }),
        findMany: vi.fn().mockResolvedValue([]),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
      },
      user: {
        findUnique: vi.fn(),
      },
    };

    paymentsService = new PaymentsService(mockPrisma, encryptionService, registry);
  });

  describe('EncryptionService (AES-256-GCM)', () => {
    it('should encrypt and decrypt plaintext accurately', () => {
      const secret = 'rzp_test_secret_key_1234567890abcdef';
      const cipher = encryptionService.encrypt(secret);
      expect(cipher).not.toBe(secret);
      expect(cipher.split(':').length).toBe(3); // iv:authTag:encrypted

      const decrypted = encryptionService.decrypt(cipher);
      expect(decrypted).toBe(secret);
    });

    it('should securely mask API secrets for browser display', () => {
      const secret = 'rzp_test_1234567890abcdef';
      const masked = encryptionService.mask(secret);
      expect(masked).toBe('rzp_test_••••••••••••cdef');
      expect(encryptionService.isMasked(masked)).toBe(true);
      expect(encryptionService.isMasked('raw_unmasked_secret')).toBe(false);
    });
  });

  describe('RazorpayGatewayProvider (Functional Implementation)', () => {
    it('should create an order result with correct payload', async () => {
      const order = await razorpayProvider.createOrder(
        {
          amountPaise: 300000n, // ₹3,000
          receipt: 'RCPT-TEST-001',
          customerName: 'Test Member',
          customerEmail: 'test@askrev.com',
        },
        {
          merchantId: 'rzp_test_key_12345678',
          secretKey: 'rzp_test_secret_12345678',
          isSandbox: true,
        }
      );

      expect(order.orderId).toContain('order_rzp_');
      expect(order.amountPaise).toBe(300000n);
      expect(order.clientPayload?.key).toBe('rzp_test_key_12345678');
      expect(order.clientPayload?.amount).toBe(300000);
    });

    it('should verify valid HMAC-SHA256 webhook signatures', async () => {
      const webhookSecret = 'test_webhook_secret_key';
      const payloadObj = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_123456',
              order_id: 'order_123456',
              amount: 300000,
              method: 'upi',
            },
          },
        },
      };
      const rawBody = JSON.stringify(payloadObj);
      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      const verification = await razorpayProvider.verifyWebhook(rawBody, signature, webhookSecret);
      expect(verification.isValid).toBe(true);
      expect(verification.event).toBe('payment.captured');
      expect(verification.paymentId).toBe('pay_123456');
      expect(verification.orderId).toBe('order_123456');
      expect(verification.status).toBe('SUCCESS');
    });

    it('should reject tampered or invalid webhook signatures', async () => {
      const webhookSecret = 'test_webhook_secret_key';
      const rawBody = JSON.stringify({ event: 'payment.captured' });
      const badSignature = 'invalid_tampered_signature_hex';

      const verification = await razorpayProvider.verifyWebhook(rawBody, badSignature, webhookSecret);
      expect(verification.isValid).toBe(false);
      expect(verification.error).toContain('Invalid HMAC');
    });

    it('should validate connection test credentials format', async () => {
      // Valid sandbox key
      const resValid = await razorpayProvider.testConnection({
        merchantId: 'rzp_test_validkey123',
        secretKey: 'secret_key_minimum_16_chars!',
        isSandbox: true,
      });
      expect(resValid.success).toBe(true);

      // Invalid prefix (live key in sandbox mode)
      const resInvalid = await razorpayProvider.testConnection({
        merchantId: 'rzp_live_key123',
        secretKey: 'secret_key_minimum_16_chars!',
        isSandbox: true,
      });
      expect(resInvalid.success).toBe(false);
      expect(resInvalid.message).toContain('not a Razorpay Test Key');
    });
  });

  describe('PaymentsService Integration', () => {
    it('should return masked secrets in getAdminPaymentSettings', async () => {
      const encryptedSecret = encryptionService.encrypt('rzp_test_secret_real_password_99');
      mockPrisma.paymentConfig.findUnique.mockResolvedValue({
        id: 'upi-1',
        upiEnabled: true,
        merchantUpiVpa: 'askrev@icici',
        merchantName: 'ASKR EV Mobility',
        isVerified: true,
        manualReviewRequired: true,
      });
      mockPrisma.paymentGatewayConfig.findMany.mockResolvedValue([
        {
          id: 'cfg-1',
          provider: 'RAZORPAY',
          isEnabled: true,
          isSandbox: true,
          merchantId: 'rzp_test_key123',
          encryptedSecretKey: encryptedSecret,
          encryptedWebhookKey: null,
          status: 'ACTIVE',
        },
      ]);

      const settings = await paymentsService.getAdminPaymentSettings();
      expect(settings.upi.merchantUpiVpa).toBe('askrev@icici');
      const rzp = settings.gateways.find((g) => g.provider === 'RAZORPAY');
      expect(rzp).toBeDefined();
      expect(rzp?.secretKeyMasked).toContain('••••');
      expect(rzp?.secretKeyMasked).not.toContain('real_password'); // No leak of secret
      expect(rzp?.hasSecretKey).toBe(true);
    });

    it('should encrypt secret at rest and record audit log on updateGatewayConfig', async () => {
      mockPrisma.paymentGatewayConfig.findUnique.mockResolvedValue(null);
      mockPrisma.paymentGatewayConfig.upsert.mockImplementation(({ create }) =>
        Promise.resolve({ id: 'gw-new-1', ...create })
      );

      const res = await paymentsService.updateGatewayConfig('ADMIN-01', {
        provider: 'RAZORPAY',
        isEnabled: true,
        isSandbox: true,
        merchantId: 'rzp_test_newkey',
        secretKey: 'new_secret_key_12345678',
      });

      expect(res.config.isEnabled).toBe(true);
      expect(mockPrisma.paymentGatewayConfig.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            merchantId: 'rzp_test_newkey',
            encryptedSecretKey: expect.stringMatching(/^[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/),
          }),
        })
      );
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should reject invalid webhook signatures with UnauthorizedException', async () => {
      const encryptedWebhookSecret = encryptionService.encrypt('valid_webhook_secret_123');
      mockPrisma.paymentGatewayConfig.findUnique.mockResolvedValue({
        provider: 'RAZORPAY',
        encryptedWebhookKey: encryptedWebhookSecret,
      });

      await expect(
        paymentsService.handleGatewayWebhook('RAZORPAY', '{"event":"test"}', 'bad_signature', {}, '127.0.0.1')
      ).rejects.toThrow('Invalid webhook signature');
    });

    it('should prioritize Pine Labs as Primary gateway in registry and public methods', async () => {
      const providers = registry.getAllProviders();
      expect(providers[0].providerId).toBe('PINELABS');

      mockPrisma.paymentConfig.findUnique.mockResolvedValue({
        upiEnabled: true,
        merchantUpiVpa: 'askrev@icici',
        isVerified: true,
      });

      mockPrisma.paymentGatewayConfig.findMany.mockResolvedValue([
        { provider: 'RAZORPAY', isEnabled: true, isSandbox: true, merchantId: 'rzp_123' },
        { provider: 'PINELABS', isEnabled: true, isSandbox: true, merchantId: 'pine_123' },
      ]);

      const methods = await paymentsService.getPublicPaymentMethods();
      expect(methods.gateways[0].provider).toBe('PINELABS');
      expect(methods.gateways[1].provider).toBe('RAZORPAY');
    });

    it('should enforce PAYMENT_ENCRYPTION_KEY in production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      const originalKey = process.env.PAYMENT_ENCRYPTION_KEY;
      try {
        process.env.NODE_ENV = 'production';
        delete process.env.PAYMENT_ENCRYPTION_KEY;

        expect(() => new EncryptionService()).toThrow(
          'PAYMENT_ENCRYPTION_KEY environment variable is required in production'
        );
      } finally {
        process.env.NODE_ENV = originalEnv;
        if (originalKey) process.env.PAYMENT_ENCRYPTION_KEY = originalKey;
      }
    });
  });
});

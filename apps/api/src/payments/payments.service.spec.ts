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
      paymentOrder: {
        create: vi.fn().mockResolvedValue({ id: 'po-1', amountPaise: 300000n, currency: 'INR', status: 'CREATED' }),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn().mockResolvedValue({ id: 'po-1' }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findMany: vi.fn().mockResolvedValue([]),
      },
      processedWebhookEvent: {
        create: vi.fn().mockResolvedValue({ id: 'pwe-1' }),
        findUnique: vi.fn().mockResolvedValue(null),
      },
      membershipRequest: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'mr-1', status: 'PENDING' }),
        update: vi.fn().mockResolvedValue({ id: 'mr-1', status: 'PENDING' }),
      },
      $transaction: vi.fn().mockImplementation((cb) => (typeof cb === 'function' ? cb(mockPrisma) : Promise.all(cb))),
      $queryRaw: vi.fn().mockResolvedValue([{ acquired: true }]),
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

  describe('RazorpayGatewayProvider (Disabled for Live Checkout)', () => {
    it('should be marked isFunctional = false and throw on createOrder', async () => {
      expect(razorpayProvider.isFunctional).toBe(false);

      await expect(
        razorpayProvider.createOrder(
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
        )
      ).rejects.toThrow('Razorpay live checkout is disabled pending replacement');
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
      ).rejects.toThrow('Invalid HMAC SHA256 webhook signature');
    });

    it('should prioritize Pine Labs as Primary gateway in registry and filter out non-functional gateways from public methods', async () => {
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
      // Only functional gateways are exposed for checkout (Pine Labs is functional, Razorpay is config-only)
      expect(methods.gateways.length).toBe(1);
      expect(methods.gateways[0].provider).toBe('PINELABS');
    });

    it('should handle idempotent duplicate webhooks gracefully', async () => {
      mockPrisma.processedWebhookEvent.findUnique.mockResolvedValue({
        id: 'event-uuid-1',
        eventId: 'msg-id-12345',
        provider: 'PINELABS',
        eventType: 'order.processed',
        status: 'SUCCESS',
      });

      mockPrisma.paymentGatewayConfig.findUnique.mockResolvedValue({
        provider: 'PINELABS',
        encryptedWebhookKey: encryptionService.encrypt('wh_secret'),
      });

      const res = await paymentsService.handleGatewayWebhook(
        'PINELABS',
        '{}',
        'any_sig',
        { 'webhook-id': 'msg-id-12345' },
        '127.0.0.1'
      );

      expect(res.idempotent).toBe(true);
      expect(res.received).toBe(true);
      expect(res.status).toBe('SUCCESS');
    });

    it('should maintain Booking Approval Separation (MembershipRequest stays PENDING after gateway payment verified)', async () => {
      const webhookSecret = 'test_webhook_sec_123456';
      const encryptedSecret = encryptionService.encrypt(webhookSecret);

      mockPrisma.paymentGatewayConfig.findUnique.mockResolvedValue({
        id: 'cfg-pine',
        provider: 'PINELABS',
        encryptedWebhookKey: encryptedSecret,
        webhookVerifiedAt: new Date(),
      });
      mockPrisma.processedWebhookEvent.findUnique.mockResolvedValue(null);

      const orderPayload = JSON.stringify({
        event: 'order.processed',
        order_id: 'plural_ord_verify_test_01',
        payment_id: 'plural_pay_verify_test_01',
        merchant_order_reference: 'RCPT-PRO-001',
        order_amount: { value: 300000, currency: 'INR' },
        status: 'PROCESSED',
      });

      const webhookId = 'msg_test_sep_01';
      const webhookTimestamp = new Date().toISOString();
      const signedContent = `${webhookId}.${webhookTimestamp}.${orderPayload}`;
      const validSig = crypto.createHmac('sha256', webhookSecret).update(signedContent).digest('base64');

      const mockOrder = {
        id: 'po-sep-01',
        providerOrderId: 'plural_ord_verify_test_01',
        merchantReference: 'RCPT-PRO-001',
        amountPaise: 300000n,
        currency: 'INR',
        status: 'PROCESSING',
        membershipRequestId: 'mr-sep-01',
      };
      mockPrisma.paymentOrder.findFirst.mockResolvedValue(mockOrder);
      mockPrisma.paymentOrder.findUnique.mockResolvedValue(mockOrder);

      const res = await paymentsService.handleGatewayWebhook(
        'PINELABS',
        orderPayload,
        validSig,
        {
          'webhook-id': webhookId,
          'webhook-timestamp': webhookTimestamp,
        },
        '127.0.0.1'
      );

      expect(res.received).toBe(true);
      expect(res.status).toBe('SUCCESS');

      // 1. PaymentOrder marked VERIFIED
      expect(mockPrisma.paymentOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'po-sep-01' },
          data: expect.objectContaining({
            status: 'VERIFIED',
          }),
        })
      );

      // 2. MembershipRequest metadata updated with paymentVerified, but status remains PENDING!
      expect(mockPrisma.membershipRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'mr-sep-01' },
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              paymentVerified: true,
              approvalRequirement: 'PENDING_AUTHORIZED_ADMIN_APPROVAL',
              compliance: 'SIMULATION_ONLY',
            }),
          }),
        })
      );
    });

    it('should fail reconciliation and reject on amount mismatch', async () => {
      const webhookSecret = 'test_webhook_sec_mismatch';
      const encryptedSecret = encryptionService.encrypt(webhookSecret);

      mockPrisma.paymentGatewayConfig.findUnique.mockResolvedValue({
        id: 'cfg-pine',
        provider: 'PINELABS',
        encryptedWebhookKey: encryptedSecret,
        webhookVerifiedAt: new Date(),
      });
      mockPrisma.processedWebhookEvent.findUnique.mockResolvedValue(null);

      // Webhook claims 150000 paise (₹1,500), but order expected 300000 paise (₹3,000)
      const orderPayload = JSON.stringify({
        event: 'order.processed',
        order_id: 'plural_ord_mismatch_01',
        payment_id: 'plural_pay_mismatch_01',
        merchant_order_reference: 'RCPT-PRO-002',
        order_amount: { value: 150000, currency: 'INR' },
        status: 'PROCESSED',
      });

      const webhookId = 'msg_test_mismatch_01';
      const webhookTimestamp = new Date().toISOString();
      const signedContent = `${webhookId}.${webhookTimestamp}.${orderPayload}`;
      const validSig = crypto.createHmac('sha256', webhookSecret).update(signedContent).digest('base64');

      const mockMismatchOrder = {
        id: 'po-mismatch-01',
        providerOrderId: 'plural_ord_mismatch_01',
        merchantReference: 'RCPT-PRO-002',
        amountPaise: 300000n, // Expected ₹3,000
        currency: 'INR',
        status: 'PROCESSING',
      };
      mockPrisma.paymentOrder.findFirst.mockResolvedValue(mockMismatchOrder);
      mockPrisma.paymentOrder.findUnique.mockResolvedValue(mockMismatchOrder);

      const res = await paymentsService.handleGatewayWebhook(
        'PINELABS',
        orderPayload,
        validSig,
        {
          'webhook-id': webhookId,
          'webhook-timestamp': webhookTimestamp,
        },
        '127.0.0.1'
      );

      expect(res.status).toBe('FAILED');
      expect(res.error).toContain('Amount mismatch');

      // Verify order was marked FAILED
      expect(mockPrisma.paymentOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'po-mismatch-01' },
          data: expect.objectContaining({
            status: 'FAILED',
            failureReason: expect.stringContaining('Amount mismatch'),
          }),
        })
      );
    });

    it('should reject payment verification when mandatory verification fields are missing without assuming defaults', async () => {
      const webhookSecret = 'test_webhook_sec_missing';
      const encryptedSecret = encryptionService.encrypt(webhookSecret);

      mockPrisma.paymentGatewayConfig.findUnique.mockResolvedValue({
        id: 'cfg-pine',
        provider: 'PINELABS',
        encryptedWebhookKey: encryptedSecret,
        webhookVerifiedAt: new Date(),
      });
      mockPrisma.processedWebhookEvent.findUnique.mockResolvedValue(null);

      // Webhook missing currency and payment_id
      const badPayload = JSON.stringify({
        event: 'order.processed',
        order_id: 'plural_ord_missing_01',
        merchant_order_reference: 'RCPT-PRO-003',
        status: 'PROCESSED',
      });

      const webhookId = 'msg_test_missing_01';
      const webhookTimestamp = new Date().toISOString();
      const signedContent = `${webhookId}.${webhookTimestamp}.${badPayload}`;
      const validSig = crypto.createHmac('sha256', webhookSecret).update(signedContent).digest('base64');

      const mockMissingOrder = {
        id: 'po-missing-01',
        providerOrderId: 'plural_ord_missing_01',
        merchantReference: 'RCPT-PRO-003',
        amountPaise: 300000n,
        currency: 'INR',
        status: 'PROCESSING',
      };
      mockPrisma.paymentOrder.findFirst.mockResolvedValue(mockMissingOrder);
      mockPrisma.paymentOrder.findUnique.mockResolvedValue(mockMissingOrder);

      const res = await paymentsService.handleGatewayWebhook(
        'PINELABS',
        badPayload,
        validSig,
        {
          'webhook-id': webhookId,
          'webhook-timestamp': webhookTimestamp,
        },
        '127.0.0.1'
      );

      expect(res.status).toBe('FAILED');
      expect(res.error).toContain('missing mandatory provider verification fields');
    });

    it('should preserve terminal VERIFIED state and ignore delayed FAILED events', async () => {
      const webhookSecret = 'test_webhook_sec_terminal';
      const encryptedSecret = encryptionService.encrypt(webhookSecret);

      mockPrisma.paymentGatewayConfig.findUnique.mockResolvedValue({
        id: 'cfg-pine',
        provider: 'PINELABS',
        encryptedWebhookKey: encryptedSecret,
        webhookVerifiedAt: new Date(),
      });
      mockPrisma.processedWebhookEvent.findUnique.mockResolvedValue(null);

      // Out-of-order delayed failure webhook for an already VERIFIED order
      const failedPayload = JSON.stringify({
        event: 'order.failed',
        order_id: 'plural_ord_term_01',
        payment_id: 'plural_pay_failed_01',
        merchant_order_reference: 'RCPT-PRO-TERM-01',
        status: 'FAILED',
      });

      const webhookId = 'msg_test_term_01';
      const webhookTimestamp = new Date().toISOString();
      const signedContent = `${webhookId}.${webhookTimestamp}.${failedPayload}`;
      const validSig = crypto.createHmac('sha256', webhookSecret).update(signedContent).digest('base64');

      const alreadyVerifiedOrder = {
        id: 'po-term-01',
        providerOrderId: 'plural_ord_term_01',
        merchantReference: 'RCPT-PRO-TERM-01',
        amountPaise: 300000n,
        currency: 'INR',
        status: 'VERIFIED',
      };
      mockPrisma.paymentOrder.findFirst.mockResolvedValue(alreadyVerifiedOrder);
      mockPrisma.paymentOrder.findUnique.mockResolvedValue(alreadyVerifiedOrder);

      const res = await paymentsService.handleGatewayWebhook(
        'PINELABS',
        failedPayload,
        validSig,
        {
          'webhook-id': webhookId,
          'webhook-timestamp': webhookTimestamp,
        },
        '127.0.0.1'
      );

      expect(res.status).toBe('VERIFIED');
      expect((res as any).ignored).toBe(true);
      expect((res as any).reason).toContain('Terminal state VERIFIED preserved');
    });

    it('should preserve terminal REFUNDED state and ignore conflicting events', async () => {
      const webhookSecret = 'test_webhook_sec_refund';
      const encryptedSecret = encryptionService.encrypt(webhookSecret);

      mockPrisma.paymentGatewayConfig.findUnique.mockResolvedValue({
        id: 'cfg-pine',
        provider: 'PINELABS',
        encryptedWebhookKey: encryptedSecret,
        webhookVerifiedAt: new Date(),
      });
      mockPrisma.processedWebhookEvent.findUnique.mockResolvedValue(null);

      const delayedPayload = JSON.stringify({
        event: 'order.processed',
        order_id: 'plural_ord_refund_01',
        payment_id: 'plural_pay_refund_01',
        merchant_order_reference: 'RCPT-PRO-REFUND-01',
        order_amount: { value: 300000, currency: 'INR' },
        status: 'PROCESSED',
      });

      const webhookId = 'msg_test_refund_01';
      const webhookTimestamp = new Date().toISOString();
      const signedContent = `${webhookId}.${webhookTimestamp}.${delayedPayload}`;
      const validSig = crypto.createHmac('sha256', webhookSecret).update(signedContent).digest('base64');

      const alreadyRefundedOrder = {
        id: 'po-refund-01',
        providerOrderId: 'plural_ord_refund_01',
        merchantReference: 'RCPT-PRO-REFUND-01',
        amountPaise: 300000n,
        currency: 'INR',
        status: 'REFUNDED',
      };
      mockPrisma.paymentOrder.findFirst.mockResolvedValue(alreadyRefundedOrder);
      mockPrisma.paymentOrder.findUnique.mockResolvedValue(alreadyRefundedOrder);

      const res = await paymentsService.handleGatewayWebhook(
        'PINELABS',
        delayedPayload,
        validSig,
        {
          'webhook-id': webhookId,
          'webhook-timestamp': webhookTimestamp,
        },
        '127.0.0.1'
      );

      expect(res.status).toBe('REFUNDED');
      expect((res as any).ignored).toBe(true);
      expect((res as any).reason).toContain('Terminal state REFUNDED is immutable');
    });

    it('should execute bounded reconciliation poller and route max attempts to INVESTIGATION_REQUIRED', async () => {
      // Order with 5 previous attempts
      const exhaustedOrder = {
        id: 'po-exhausted-01',
        provider: 'PINELABS',
        providerOrderId: 'plural_ord_ex_01',
        amountPaise: 300000n,
        currency: 'INR',
        status: 'PROCESSING',
        attempts: 5,
        createdAt: new Date(Date.now() - 60000),
      };

      mockPrisma.$queryRaw.mockResolvedValue([exhaustedOrder]);

      const res = await paymentsService.reconcilePendingPaymentOrders('TEST_POLLER');

      expect(res.acquired).toBe(true);
      expect(res.investigationCount).toBe(1);
      expect(mockPrisma.paymentOrder.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'po-exhausted-01',
            status: 'PROCESSING',
            lockedBy: paymentsService.getWorkerId(),
          },
          data: expect.objectContaining({
            status: 'INVESTIGATION_REQUIRED',
            failureReason: expect.stringContaining('EXHAUSTED_RETRIES_INVESTIGATION_REQUIRED'),
            lockedBy: null,
            leaseExpiresAt: null,
          }),
        })
      );
    });

    it('should fail closed when database claim locking query fails', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('PostgreSQL connection terminated'));

      const res = await paymentsService.reconcilePendingPaymentOrders('TEST_POLLER');

      expect(res.acquired).toBe(false);
      expect(res.error).toContain('PostgreSQL connection terminated');
      expect(res.claimedCount).toBe(0);
      expect(res.reconciledCount).toBe(0);
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

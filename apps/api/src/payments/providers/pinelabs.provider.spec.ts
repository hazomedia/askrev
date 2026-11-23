import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as crypto from 'crypto';
import { PineLabsGatewayProvider } from './pinelabs.provider';

describe('PineLabsGatewayProvider (Plural Online Payments)', () => {
  let provider: PineLabsGatewayProvider;

  beforeEach(() => {
    provider = new PineLabsGatewayProvider();
    vi.restoreAllMocks();
  });

  describe('Provider Metadata', () => {
    it('should have providerId PINELABS and be marked functional', () => {
      expect(provider.providerId).toBe('PINELABS');
      expect(provider.displayName).toContain('Pine Labs');
      expect(provider.isFunctional).toBe(true);
    });
  });

  describe('OAuth 2.0 Authentication (getAccessToken)', () => {
    it('should reject if Client ID or Client Secret is missing', async () => {
      await expect(
        provider.getAccessToken({
          merchantId: '',
          secretKey: 'some_secret',
          isSandbox: true,
        })
      ).rejects.toThrow('Pine Labs Client ID and Client Secret must be configured.');

      await expect(
        provider.getAccessToken({
          merchantId: 'client_123',
          secretKey: '',
          isSandbox: true,
        })
      ).rejects.toThrow('Pine Labs Client ID and Client Secret must be configured.');
    });

    it('should successfully generate Bearer access token using client_credentials', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          access_token: 'mock_plural_jwt_token_abcdef123456',
          expires_at: '2026-11-23T11:00:00Z',
        }),
      });
      global.fetch = mockFetch;

      const result = await provider.getAccessToken({
        merchantId: 'test_client_id_99',
        secretKey: 'test_client_secret_88',
        isSandbox: true,
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://pluraluat.v2.pinepg.in/api/auth/v1/token');
      expect(options.method).toBe('POST');
      expect(options.headers['Content-Type']).toBe('application/json');
      expect(options.headers['Request-ID']).toBeDefined();
      expect(options.headers['Request-Timestamp']).toBeDefined();

      const body = JSON.parse(options.body);
      expect(body.client_id).toBe('test_client_id_99');
      expect(body.client_secret).toBe('test_client_secret_88');
      expect(body.grant_type).toBe('client_credentials');

      expect(result.accessToken).toBe('mock_plural_jwt_token_abcdef123456');
    });

    it('should throw descriptive error on HTTP 401 Unauthorized from Pine Labs', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => '{"error": "invalid_client", "error_description": "Invalid client credentials"}',
      });

      await expect(
        provider.getAccessToken({
          merchantId: 'bad_client',
          secretKey: 'bad_secret',
          isSandbox: true,
        })
      ).rejects.toThrow('Pine Labs OAuth authentication failed [HTTP 401]');
    });
  });

  describe('Order Creation & Hosted Checkout', () => {
    it('should create a genuine order and return orderId and redirectUrl', async () => {
      const mockFetch = vi
        .fn()
        // 1st call: getAccessToken
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ access_token: 'valid_bearer_token' }),
        })
        // 2nd call: createOrder
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            response_code: 200,
            order_id: 'plural_ord_9988776655',
            redirect_url: 'https://pluraluat.v2.pinepg.in/checkout?token=tok_test_123',
          }),
        });
      global.fetch = mockFetch;

      const orderResult = await provider.createOrder(
        {
          amountPaise: 300000n, // ₹3,000
          receipt: 'RCPT-TEST-001',
          currency: 'INR',
          customerName: 'Test Buyer',
          customerEmail: 'buyer@test.com',
          customerPhone: '9876543210',
          notes: { requestType: 'BASIC_ACTIVATION' },
        },
        {
          merchantId: 'client_id_123',
          secretKey: 'client_sec_456',
          isSandbox: true,
        }
      );

      expect(orderResult.orderId).toBe('plural_ord_9988776655');
      expect(orderResult.provider).toBe('PINELABS');
      expect(orderResult.amountPaise).toBe(300000n);
      expect(orderResult.status).toBe('CREATED');
      expect(orderResult.clientPayload?.redirectUrl).toBe(
        'https://pluraluat.v2.pinepg.in/checkout?token=tok_test_123'
      );
      expect(orderResult.clientPayload?.merchantOrderReference).toBe('RCPT-TEST-001');

      // Verify second request body
      const [orderUrl, orderOptions] = mockFetch.mock.calls[1];
      expect(orderUrl).toContain('/api/checkout/v1/orders');
      expect(orderOptions.headers.Authorization).toBe('Bearer valid_bearer_token');

      const parsedPayload = JSON.parse(orderOptions.body);
      expect(parsedPayload.merchant_order_reference).toBe('RCPT-TEST-001');
      expect(parsedPayload.order_amount.value).toBe(300000);
      expect(parsedPayload.order_amount.currency).toBe('INR');
      expect(parsedPayload.customer.email_id).toBe('buyer@test.com');
    });

    it('should throw genuine error if Pine Labs order creation fails without fabricating IDs', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ access_token: 'valid_bearer_token' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: async () => '{"error": "INVALID_AMOUNT", "message": "Amount exceeds allowed tier limit"}',
        });

      await expect(
        provider.createOrder(
          {
            amountPaise: 300000n,
            receipt: 'RCPT-FAIL-001',
          },
          {
            merchantId: 'client_id_123',
            secretKey: 'client_sec_456',
            isSandbox: true,
          }
        )
      ).rejects.toThrow('Pine Labs order creation failed [HTTP 400]');
    });
  });

  describe('Webhook Signature Verification (HMAC-SHA256)', () => {
    const webhookSecret = 'test_webhook_secret_plural_2026';
    const samplePayload = JSON.stringify({
      event: 'order.processed',
      order_id: 'plural_ord_5544332211',
      payment_id: 'plural_pay_998877',
      merchant_order_reference: 'RCPT-TEST-001',
      order_amount: { value: 300000, currency: 'INR' },
      status: 'PROCESSED',
    });

    it('should accept valid HMAC-SHA256 signature constructed from webhook-id, webhook-timestamp, and rawBody', async () => {
      const webhookId = 'msg_uuid_11223344';
      const webhookTimestamp = new Date().toISOString(); // Current timestamp

      const signedContent = `${webhookId}.${webhookTimestamp}.${samplePayload}`;
      const validSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(signedContent, 'utf8')
        .digest('base64');

      const result = await provider.verifyWebhook(
        samplePayload,
        `v1,${validSignature}`,
        webhookSecret,
        {
          'webhook-id': webhookId,
          'webhook-timestamp': webhookTimestamp,
        }
      );

      expect(result.isValid).toBe(true);
      expect(result.event).toBe('order.processed');
      expect(result.orderId).toBe('plural_ord_5544332211');
      expect(result.paymentId).toBe('plural_pay_998877');
      expect(result.amountPaise).toBe(300000n);
      expect(result.status).toBe('SUCCESS');
    });

    it('should reject invalid or tampered signature', async () => {
      const webhookId = 'msg_uuid_11223344';
      const webhookTimestamp = new Date().toISOString();
      const forgedSignature = 'v1,forged_tampered_base64_sig_xyz123';

      const result = await provider.verifyWebhook(
        samplePayload,
        forgedSignature,
        webhookSecret,
        {
          'webhook-id': webhookId,
          'webhook-timestamp': webhookTimestamp,
        }
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('signature mismatch');
    });

    it('should reject stale webhooks older than 10 minutes (replay attack protection)', async () => {
      const webhookId = 'msg_uuid_stale';
      // 15 minutes ago
      const staleTimestamp = new Date(Date.now() - 15 * 60 * 1000).toISOString();

      const signedContent = `${webhookId}.${staleTimestamp}.${samplePayload}`;
      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(signedContent, 'utf8')
        .digest('base64');

      const result = await provider.verifyWebhook(
        samplePayload,
        `v1,${signature}`,
        webhookSecret,
        {
          'webhook-id': webhookId,
          'webhook-timestamp': staleTimestamp,
        }
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('replay protection guard');
    });

    it('should handle refund events and mark status as REFUND', async () => {
      const refundPayload = JSON.stringify({
        event: 'refund.processed',
        order_id: 'plural_ord_5544332211',
        refund_id: 'plural_ref_001',
        amount: 300000,
        status: 'REFUNDED',
      });

      const webhookId = 'msg_refund_123';
      const webhookTimestamp = new Date().toISOString();
      const signedContent = `${webhookId}.${webhookTimestamp}.${refundPayload}`;
      const validSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(signedContent, 'utf8')
        .digest('base64');

      const result = await provider.verifyWebhook(
        refundPayload,
        `v1,${validSignature}`,
        webhookSecret,
        {
          'webhook-id': webhookId,
          'webhook-timestamp': webhookTimestamp,
        }
      );

      expect(result.isValid).toBe(true);
      expect(result.event).toBe('refund.processed');
      expect(result.status).toBe('REFUND');
      expect(result.metadata?.refundId).toBe('plural_ref_001');
    });
  });

  describe('Server-Side Order Status Verification (getOrderStatus)', () => {
    it('should query order status and reconcile amount and status', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ access_token: 'inquiry_token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            order_id: 'plural_ord_776655',
            merchant_order_reference: 'RCPT-INQ-001',
            order_amount: { value: 3300000, currency: 'INR' },
            status: 'CHARGED',
            payment_id: 'pay_776655',
          }),
        });

      const statusResult = await provider.getOrderStatus('plural_ord_776655', {
        merchantId: 'test_client_id',
        secretKey: 'test_client_secret',
        isSandbox: true,
      });

      expect(statusResult.orderId).toBe('plural_ord_776655');
      expect(statusResult.status).toBe('SUCCESS');
      expect(statusResult.amountPaise).toBe(3300000n); // ₹33,000
      expect(statusResult.currency).toBe('INR');
      expect(statusResult.paymentId).toBe('pay_776655');
    });
  });

  describe('Refund Tracking (trackRefund)', () => {
    it('should query refund status and return structured details', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ access_token: 'refund_token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            refund_id: 'ref_plural_9988',
            order_id: 'plural_ord_1122',
            refund_amount: { value: 300000, currency: 'INR' },
            status: 'PROCESSED',
          }),
        });

      const refundResult = await provider.trackRefund('ref_plural_9988', {
        merchantId: 'test_client_id',
        secretKey: 'test_client_secret',
        isSandbox: true,
      });

      expect(refundResult.refundId).toBe('ref_plural_9988');
      expect(refundResult.status).toBe('SUCCESS');
      expect(refundResult.amountPaise).toBe(300000n);
    });
  });

  describe('Test Connection Runner', () => {
    it('should report failure if credentials are empty', async () => {
      const result = await provider.testConnection({
        merchantId: '',
        secretKey: '',
        isSandbox: true,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Pine Labs Client ID and Client Secret are both required');
    });

    it('should report success when credentials authenticate successfully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          access_token: 'test_access_token_1234567890',
          expires_at: '2026-11-23T12:00:00Z',
        }),
      });

      const result = await provider.testConnection({
        merchantId: 'valid_client_id',
        secretKey: 'valid_client_secret',
        isSandbox: true,
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Pine Labs OAuth authentication successful');
      expect(result.details?.environment).toBe('UAT / Sandbox');
    });
  });
});

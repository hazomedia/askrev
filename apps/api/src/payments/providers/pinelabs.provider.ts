import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  PaymentGatewayProvider,
  CreateOrderParams,
  GatewayOrderResult,
  WebhookVerificationResult,
  ConnectionTestResult,
  ProviderCredentials,
  OrderStatusResult,
  RefundStatusResult,
} from './payment-gateway.interface';

@Injectable()
export class PineLabsGatewayProvider implements PaymentGatewayProvider {
  private readonly logger = new Logger(PineLabsGatewayProvider.name);
  readonly providerId = 'PINELABS';
  readonly displayName = 'Pine Labs (Plural) Payment Gateway';
  readonly isFunctional = true; // Fully functional adapter conforming to official Plural API specifications

  private getBaseUrl(isSandbox: boolean): string {
    return isSandbox
      ? 'https://pluraluat.v2.pinepg.in'
      : 'https://api.pluralpay.in';
  }

  /**
   * Generates OAuth 2.0 Bearer access token using Pine Labs Client ID and Client Secret.
   * Endpoint: POST /api/auth/v1/token
   */
  async getAccessToken(credentials: ProviderCredentials): Promise<{ accessToken: string; expiresAt?: string }> {
    const clientId = credentials.merchantId?.trim();
    const clientSecret = credentials.secretKey?.trim();

    if (!clientId || !clientSecret) {
      throw new Error('Pine Labs Client ID and Client Secret must be configured.');
    }

    const baseUrl = this.getBaseUrl(credentials.isSandbox);
    const requestId = crypto.randomUUID();
    const requestTimestamp = new Date().toISOString();

    const response = await fetch(`${baseUrl}/api/auth/v1/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Request-ID': requestId,
        'Request-Timestamp': requestTimestamp,
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Pine Labs OAuth authentication failed [HTTP ${response.status}]: ${errText}`);
    }

    const data: any = await response.json();
    if (!data.access_token) {
      throw new Error('Pine Labs auth response did not contain an access_token.');
    }

    return {
      accessToken: data.access_token,
      expiresAt: data.expires_at,
    };
  }

  /**
   * Creates a genuine Pine Labs Plural payment order / hosted checkout session.
   * Endpoint: POST /api/checkout/v1/orders (or POST /api/pay/v1/orders)
   * Never fabricates order IDs or simulated responses.
   */
  async createOrder(params: CreateOrderParams, credentials: ProviderCredentials): Promise<GatewayOrderResult> {
    const { accessToken } = await this.getAccessToken(credentials);
    const baseUrl = this.getBaseUrl(credentials.isSandbox);
    const requestId = crypto.randomUUID();
    const requestTimestamp = new Date().toISOString();

    const orderPayload = {
      merchant_order_reference: params.receipt,
      order_amount: {
        value: Number(params.amountPaise),
        currency: params.currency || 'INR',
      },
      purchase_details: {
        items: [
          {
            name: params.notes?.requestType ? `ASKR EV Booking - ${params.notes.requestType}` : 'ASKR EV Vehicle Booking',
            item_code: params.notes?.requestType || 'BOOKING',
            unit_amount: Number(params.amountPaise),
            quantity: 1,
          },
        ],
      },
      customer: {
        email_id: params.customerEmail || undefined,
        mobile_number: params.customerPhone || undefined,
        first_name: params.customerName || undefined,
      },
      notes: params.notes ? JSON.stringify(params.notes) : undefined,
    };

    // Attempt hosted checkout creation first
    let response = await fetch(`${baseUrl}/api/checkout/v1/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Request-ID': requestId,
        'Request-Timestamp': requestTimestamp,
      },
      body: JSON.stringify(orderPayload),
    });

    // If checkout endpoint not found, fallback to standard orders endpoint
    if (response.status === 404) {
      response = await fetch(`${baseUrl}/api/pay/v1/orders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Request-ID': requestId,
          'Request-Timestamp': requestTimestamp,
        },
        body: JSON.stringify(orderPayload),
      });
    }

    if (!response.ok) {
      const errText = await response.text();
      this.logger.error(`Pine Labs order creation failed: [HTTP ${response.status}] ${errText}`);
      throw new Error(`Pine Labs order creation failed [HTTP ${response.status}]: ${errText}`);
    }

    const data: any = await response.json();
    const orderId = data.order_id || data.data?.order_id || data.id;

    if (!orderId) {
      throw new Error('Pine Labs order response did not include a valid order_id.');
    }

    const redirectUrl = data.redirect_url || data.data?.redirect_url || null;

    this.logger.log(`Created Pine Labs Order ${orderId} for ref ${params.receipt} (₹${Number(params.amountPaise) / 100})`);

    return {
      orderId,
      provider: this.providerId,
      amountPaise: params.amountPaise,
      currency: params.currency || 'INR',
      status: 'CREATED',
      clientPayload: {
        provider: this.providerId,
        orderId,
        merchantOrderReference: params.receipt,
        redirectUrl,
        amount: Number(params.amountPaise),
        currency: params.currency || 'INR',
        customerName: params.customerName || '',
        customerEmail: params.customerEmail || '',
        customerPhone: params.customerPhone || '',
      },
    };
  }

  /**
   * Authenticated Webhook Signature Verification.
   * Constructs signed content: ${webhook-id}.${webhook-timestamp}.${rawBody}
   * Verifies HMAC-SHA256 signature using constant-time comparison.
   * Includes 10-minute replay-attack mitigation.
   */
  async verifyWebhook(
    rawBody: string | Buffer,
    signature: string,
    webhookSecret: string,
    headers?: Record<string, string>
  ): Promise<WebhookVerificationResult> {
    if (!webhookSecret || !signature) {
      return { isValid: false, event: 'UNKNOWN', error: 'Missing webhook secret or signature' };
    }

    try {
      const bodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');

      // Extract Plural webhook headers
      const webhookId = headers?.['webhook-id'] || headers?.['x-webhook-id'] || '';
      const webhookTimestamp = headers?.['webhook-timestamp'] || headers?.['x-webhook-timestamp'] || '';

      // Replay attack prevention guard (reject timestamps older than 10 minutes or in distant future)
      if (webhookTimestamp) {
        const timestampMs = new Date(webhookTimestamp).getTime();
        const now = Date.now();
        if (isNaN(timestampMs) || Math.abs(now - timestampMs) > 10 * 60 * 1000) {
          return {
            isValid: false,
            event: 'UNKNOWN',
            error: 'Webhook timestamp outside allowed 10-minute validity window (replay protection guard)',
          };
        }
      }

      // Signed content construction per official Pine Labs documentation:
      // signed_content = webhook-id + "." + webhook-timestamp + "." + raw_request_body
      const signedContent =
        webhookId && webhookTimestamp
          ? `${webhookId}.${webhookTimestamp}.${bodyStr}`
          : bodyStr;

      const hmac = crypto.createHmac('sha256', webhookSecret);
      hmac.update(signedContent, 'utf8');
      const computedBase64 = hmac.digest('base64');

      const hmacHex = crypto.createHmac('sha256', webhookSecret);
      hmacHex.update(signedContent, 'utf8');
      const computedHex = hmacHex.digest('hex');

      // Signature header may contain format "v1,<hash>" or space-separated hashes
      const sigCandidates = signature.split(/\s+/);
      let isMatch = false;

      for (const candidate of sigCandidates) {
        const cleanHash = candidate.replace(/^v\d+[,=]/, '').trim();

        // 1. Try base64 digest comparison
        try {
          const compBufBase64 = Buffer.from(computedBase64);
          const sigBuf = Buffer.from(cleanHash);
          if (compBufBase64.length === sigBuf.length && crypto.timingSafeEqual(compBufBase64, sigBuf)) {
            isMatch = true;
            break;
          }
        } catch {}

        // 2. Try hex digest comparison
        try {
          const compBufHex = Buffer.from(computedHex);
          const sigBuf = Buffer.from(cleanHash);
          if (compBufHex.length === sigBuf.length && crypto.timingSafeEqual(compBufHex, sigBuf)) {
            isMatch = true;
            break;
          }
        } catch {}
      }

      if (!isMatch) {
        return {
          isValid: false,
          event: 'UNKNOWN',
          error: 'Pine Labs HMAC-SHA256 webhook signature mismatch',
        };
      }

      // Parse validated payload
      const payload = JSON.parse(bodyStr);
      const eventName = payload.event || payload.event_type || 'order.processed';
      const orderId = payload.order_id || payload.data?.order_id || payload.order?.order_id;
      const paymentId = payload.payment_id || payload.data?.payment_id || payload.payment?.payment_id;
      const referenceId = payload.merchant_order_reference || payload.data?.merchant_order_reference;

      const rawAmount =
        payload.order_amount?.value ||
        payload.data?.order_amount?.value ||
        payload.amount ||
        payload.data?.amount;

      const amountPaise = rawAmount !== undefined ? BigInt(Math.round(Number(rawAmount))) : undefined;

      const rawStatus = String(
        payload.status || payload.order_status || payload.data?.status || payload.payment_status || ''
      ).toUpperCase();

      let status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'REFUND' = 'PENDING';
      if (['PROCESSED', 'CHARGED', 'CAPTURED', 'SUCCESS', 'AUTHORIZED'].includes(rawStatus)) {
        status = 'SUCCESS';
      } else if (['FAILED', 'ATTEMPTED', 'CANCELLED', 'DECLINED'].includes(rawStatus)) {
        status = 'FAILED';
      } else if (['REFUNDED', 'REFUND_PROCESSED'].includes(rawStatus) || eventName.toLowerCase().includes('refund')) {
        status = 'REFUND';
      }

      return {
        isValid: true,
        event: eventName,
        orderId,
        paymentId,
        referenceId,
        amountPaise,
        status,
        metadata: {
          rawStatus,
          merchantReference: referenceId,
          refundId: payload.refund_id || payload.data?.refund_id,
        },
      };
    } catch (err: any) {
      this.logger.error(`Pine Labs webhook verification error: ${err.message}`);
      return { isValid: false, event: 'ERROR', error: err.message };
    }
  }

  /**
   * Server-side Order Status Verification.
   * Endpoint: GET /api/pay/v1/orders/{order_id} (or /api/pay/v1/orders/reference/{ref})
   */
  async getOrderStatus(orderIdOrReference: string, credentials: ProviderCredentials): Promise<OrderStatusResult> {
    const { accessToken } = await this.getAccessToken(credentials);
    const baseUrl = this.getBaseUrl(credentials.isSandbox);
    const requestId = crypto.randomUUID();
    const requestTimestamp = new Date().toISOString();

    // Query order by ID or reference
    const url = orderIdOrReference.startsWith('RCPT-') || orderIdOrReference.startsWith('ASKREV-')
      ? `${baseUrl}/api/pay/v1/orders/reference/${encodeURIComponent(orderIdOrReference)}`
      : `${baseUrl}/api/pay/v1/orders/${encodeURIComponent(orderIdOrReference)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Request-ID': requestId,
        'Request-Timestamp': requestTimestamp,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Pine Labs order inquiry failed [HTTP ${response.status}]: ${errText}`);
    }

    const data: any = await response.json();
    const orderData = data.data || data;

    const rawStatus = String(orderData.status || orderData.order_status || '').toUpperCase();
    let status: 'SUCCESS' | 'FAILED' | 'PENDING' = 'PENDING';
    if (['PROCESSED', 'CHARGED', 'CAPTURED', 'SUCCESS', 'AUTHORIZED'].includes(rawStatus)) {
      status = 'SUCCESS';
    } else if (['FAILED', 'ATTEMPTED', 'CANCELLED', 'DECLINED'].includes(rawStatus)) {
      status = 'FAILED';
    }

    const rawAmount = orderData.order_amount?.value || orderData.amount;
    const amountPaise = rawAmount ? BigInt(Math.round(Number(rawAmount))) : undefined;

    return {
      orderId: orderData.order_id || orderIdOrReference,
      referenceId: orderData.merchant_order_reference,
      status,
      rawStatus,
      amountPaise,
      currency: orderData.order_amount?.currency || 'INR',
      paymentId: orderData.payment_id || orderData.payments?.[0]?.payment_id,
      details: orderData,
    };
  }

  /**
   * Tracks refund status for an order or refund identifier.
   * Endpoint: GET /api/pay/v1/refunds/{refundId}
   */
  async trackRefund(refundId: string, credentials: ProviderCredentials): Promise<RefundStatusResult> {
    const { accessToken } = await this.getAccessToken(credentials);
    const baseUrl = this.getBaseUrl(credentials.isSandbox);
    const requestId = crypto.randomUUID();
    const requestTimestamp = new Date().toISOString();

    const response = await fetch(`${baseUrl}/api/pay/v1/refunds/${encodeURIComponent(refundId)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Request-ID': requestId,
        'Request-Timestamp': requestTimestamp,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Pine Labs refund inquiry failed [HTTP ${response.status}]: ${errText}`);
    }

    const data: any = await response.json();
    const refundData = data.data || data;
    const rawStatus = String(refundData.status || '').toUpperCase();

    let status: 'SUCCESS' | 'FAILED' | 'PENDING' = 'PENDING';
    if (['PROCESSED', 'SUCCESS', 'COMPLETED'].includes(rawStatus)) {
      status = 'SUCCESS';
    } else if (['FAILED', 'DECLINED'].includes(rawStatus)) {
      status = 'FAILED';
    }

    const rawAmount = refundData.refund_amount?.value || refundData.amount;
    const amountPaise = rawAmount ? BigInt(Math.round(Number(rawAmount))) : undefined;

    return {
      refundId,
      orderId: refundData.order_id,
      status,
      rawStatus,
      amountPaise,
      currency: refundData.refund_amount?.currency || 'INR',
      details: refundData,
    };
  }

  /**
   * Super Admin Test Connection runner:
   * Validates client credentials against Pine Labs OAuth API.
   */
  async testConnection(credentials: ProviderCredentials): Promise<ConnectionTestResult> {
    const clientId = credentials.merchantId?.trim() || '';
    const clientSecret = credentials.secretKey?.trim() || '';

    if (!clientId || !clientSecret) {
      return {
        success: false,
        message: 'Pine Labs Client ID and Client Secret are both required to test connection.',
        timestamp: new Date(),
      };
    }

    try {
      const { accessToken, expiresAt } = await this.getAccessToken(credentials);
      return {
        success: true,
        message: `Pine Labs OAuth authentication successful. Access token generated. Environment: ${
          credentials.isSandbox ? 'UAT / Sandbox' : 'Production'
        }.`,
        timestamp: new Date(),
        details: {
          expiresAt,
          tokenPrefix: accessToken.slice(0, 12) + '...',
          environment: credentials.isSandbox ? 'UAT / Sandbox' : 'Production',
        },
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Pine Labs connection test failed: ${err.message}`,
        timestamp: new Date(),
      };
    }
  }
}

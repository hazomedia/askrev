import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  PaymentGatewayProvider,
  CreateOrderParams,
  GatewayOrderResult,
  WebhookVerificationResult,
  ConnectionTestResult,
  ProviderCredentials,
} from './payment-gateway.interface';

@Injectable()
export class PhonePeGatewayProvider implements PaymentGatewayProvider {
  private readonly logger = new Logger(PhonePeGatewayProvider.name);
  readonly providerId = 'PHONEPE';
  readonly displayName = 'PhonePe Payment Gateway';
  readonly isFunctional = false; // Marked CONFIGURATION_ONLY pending merchant account onboarding & live cert

  async createOrder(params: CreateOrderParams, credentials: ProviderCredentials): Promise<GatewayOrderResult> {
    throw new Error(
      'PhonePe integration is currently in CONFIGURATION_ONLY mode. Live checkout will be enabled upon completion of merchant verification.'
    );
  }

  async verifyWebhook(rawBody: string | Buffer, signature: string, webhookSecret: string): Promise<WebhookVerificationResult> {
    if (!webhookSecret || !signature) {
      return { isValid: false, event: 'UNKNOWN', error: 'Missing webhook secret or X-VERIFY signature' };
    }

    try {
      const bodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
      // PhonePe format: SHA256(base64Payload + "/pg/v1/status" + saltKey) + "###" + saltIndex
      const computedHash = crypto
        .createHash('sha256')
        .update(bodyStr + webhookSecret)
        .digest('hex');

      const isValid = signature.startsWith(computedHash);
      return {
        isValid,
        event: 'phonepe.callback',
        status: isValid ? 'SUCCESS' : 'FAILED',
        error: isValid ? undefined : 'PhonePe X-VERIFY signature mismatch',
      };
    } catch (err: any) {
      return { isValid: false, event: 'ERROR', error: err.message };
    }
  }

  async testConnection(credentials: ProviderCredentials): Promise<ConnectionTestResult> {
    const merchantId = credentials.merchantId?.trim() || '';
    const saltKey = credentials.secretKey?.trim() || '';

    if (!merchantId || !saltKey) {
      return {
        success: false,
        message: 'PhonePe Merchant ID and Salt Key are both required.',
        timestamp: new Date(),
      };
    }

    if (saltKey.length < 16) {
      return {
        success: false,
        message: 'PhonePe Salt Key must be at least 16 characters.',
        timestamp: new Date(),
      };
    }

    return {
      success: true,
      message:
        'PhonePe credentials format verified. Status: CONFIGURATION_ONLY (provider requires merchant onboarding before live checkout).',
      timestamp: new Date(),
      details: {
        provider: 'PHONEPE',
        mode: credentials.isSandbox ? 'UAT_SANDBOX' : 'PRODUCTION',
        merchantIdPrefix: merchantId.slice(0, 8),
        status: 'CONFIGURATION_ONLY',
      },
    };
  }
}

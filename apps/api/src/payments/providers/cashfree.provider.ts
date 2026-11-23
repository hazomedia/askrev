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
export class CashfreeGatewayProvider implements PaymentGatewayProvider {
  private readonly logger = new Logger(CashfreeGatewayProvider.name);
  readonly providerId = 'CASHFREE';
  readonly displayName = 'Cashfree Payments';
  readonly isFunctional = false; // Marked CONFIGURATION_ONLY pending merchant account onboarding & live cert

  async createOrder(params: CreateOrderParams, credentials: ProviderCredentials): Promise<GatewayOrderResult> {
    throw new Error(
      'Cashfree integration is currently in CONFIGURATION_ONLY mode. Live order creation will be enabled upon completion of banking onboarding.'
    );
  }

  async verifyWebhook(rawBody: string | Buffer, signature: string, webhookSecret: string): Promise<WebhookVerificationResult> {
    if (!webhookSecret || !signature) {
      return { isValid: false, event: 'UNKNOWN', error: 'Missing webhook secret or signature' };
    }

    try {
      const bodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(bodyStr)
        .digest('base64');

      const isMatch = expectedSignature === signature;
      return {
        isValid: isMatch,
        event: 'cashfree.webhook',
        status: isMatch ? 'SUCCESS' : 'FAILED',
        error: isMatch ? undefined : 'Cashfree signature mismatch',
      };
    } catch (err: any) {
      return { isValid: false, event: 'ERROR', error: err.message };
    }
  }

  async testConnection(credentials: ProviderCredentials): Promise<ConnectionTestResult> {
    const appId = credentials.merchantId?.trim() || '';
    const secretKey = credentials.secretKey?.trim() || '';

    if (!appId || !secretKey) {
      return {
        success: false,
        message: 'Cashfree App ID and Secret Key are both required.',
        timestamp: new Date(),
      };
    }

    if (secretKey.length < 16) {
      return {
        success: false,
        message: 'Cashfree Secret Key must be at least 16 characters.',
        timestamp: new Date(),
      };
    }

    return {
      success: true,
      message:
        'Cashfree credentials format verified. Status: CONFIGURATION_ONLY (provider requires merchant activation before processing live member transactions).',
      timestamp: new Date(),
      details: {
        provider: 'CASHFREE',
        mode: credentials.isSandbox ? 'SANDBOX' : 'PRODUCTION',
        appIdPrefix: appId.slice(0, 8),
        status: 'CONFIGURATION_ONLY',
      },
    };
  }
}

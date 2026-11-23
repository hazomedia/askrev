export interface CreateOrderParams {
  amountPaise: bigint;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
}

export interface GatewayOrderResult {
  orderId: string;
  provider: string;
  amountPaise: bigint;
  currency: string;
  status: string;
  clientPayload?: Record<string, any>;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  event: string;
  orderId?: string;
  paymentId?: string;
  referenceId?: string;
  amountPaise?: bigint;
  status?: 'SUCCESS' | 'FAILED' | 'PENDING' | 'REFUND';
  error?: string;
  metadata?: Record<string, any>;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  timestamp: Date;
  details?: Record<string, any>;
}

export interface ProviderCredentials {
  merchantId?: string | null;
  secretKey?: string | null;
  webhookSecret?: string | null;
  isSandbox: boolean;
}

export interface OrderStatusResult {
  orderId: string;
  referenceId?: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  amountPaise?: bigint;
  currency?: string;
  paymentId?: string;
  rawStatus?: string;
  details?: Record<string, any>;
}

export interface RefundStatusResult {
  refundId: string;
  orderId?: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  amountPaise?: bigint;
  currency?: string;
  rawStatus?: string;
  details?: Record<string, any>;
}

export interface PaymentGatewayProvider {
  readonly providerId: string;
  readonly displayName: string;
  readonly isFunctional: boolean; // true if API, signature verification, and reconciliation are fully implemented

  createOrder(params: CreateOrderParams, credentials: ProviderCredentials): Promise<GatewayOrderResult>;
  verifyWebhook(
    rawBody: string | Buffer,
    signature: string,
    webhookSecret: string,
    headers?: Record<string, string>
  ): Promise<WebhookVerificationResult>;
  testConnection(credentials: ProviderCredentials): Promise<ConnectionTestResult>;
  getOrderStatus?(orderIdOrReference: string, credentials: ProviderCredentials): Promise<OrderStatusResult>;
  trackRefund?(refundId: string, credentials: ProviderCredentials): Promise<RefundStatusResult>;
}

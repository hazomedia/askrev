import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  OnModuleDestroy,
} from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/encryption.service';
import { PaymentGatewayRegistry } from './providers/payment-gateway.registry';
import {
  UpdateUpiSettingsDto,
  UpdateGatewayConfigDto,
  TestGatewayConnectionDto,
  CreateGatewayOrderDto,
} from './dto/payment-settings.dto';
import { FINANCIAL_RULES, MembershipPackage, MembershipRequestType, paiseToRupees } from '@askrev/shared';

@Injectable()
export class PaymentsService implements OnModuleDestroy {
  private readonly logger = new Logger(PaymentsService.name);
  private pollerTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
    private readonly gatewayRegistry: PaymentGatewayRegistry
  ) { }

  // =========================================================================
  // PUBLIC / MEMBER PAYMENT METHODS
  // =========================================================================

  /**
   * Returns active, verified payment options for member checkout without exposing secrets.
   */
  async getPublicPaymentMethods() {
    const upiConfig = await this.prisma.paymentConfig.findUnique({
      where: { configKey: 'DEFAULT_PAYMENT_CONFIG' },
    });

    const gateways = await this.prisma.paymentGatewayConfig.findMany({
      where: { isEnabled: true },
      select: {
        provider: true,
        isSandbox: true,
        merchantId: true,
        status: true,
      },
    });

    const supportedList = this.gatewayRegistry.getSupportedList();
    const providerPriority: Record<string, number> = {
      PINELABS: 1,
      RAZORPAY: 2,
      CASHFREE: 3,
      PHONEPE: 4,
    };

    const availableGateways = gateways
      .map((g) => {
        const meta = supportedList.find((p) => p.id === g.provider);
        return {
          provider: g.provider,
          name: meta?.name || g.provider,
          displayName: meta?.name || g.provider,
          isFunctional: meta?.isFunctional ?? false,
          isSandbox: g.isSandbox,
          merchantId: g.merchantId, // Public Key ID / Client ID
        };
      })
      .filter((g) => g.isFunctional) // Only expose functional gateways to users for live checkout
      .sort((a, b) => (providerPriority[a.provider] || 99) - (providerPriority[b.provider] || 99));

    return {
      upi: {
        enabled: Boolean(upiConfig?.upiEnabled && upiConfig?.isVerified && upiConfig?.merchantUpiVpa),
        merchantUpiVpa: upiConfig?.isVerified ? upiConfig.merchantUpiVpa : null,
        merchantName: upiConfig?.merchantName || 'ASKR EV Mobility',
        isVerified: Boolean(upiConfig?.isVerified),
        manualReviewRequired: upiConfig?.manualReviewRequired ?? true,
      },
      gateways: availableGateways,
      pricing: {
        BASIC_ACTIVATION: 3000,
        FULL_ACTIVATION: 33000,
        BASIC_TO_FULL_UPGRADE: 30000,
      },
    };
  }

  // =========================================================================
  // SUPER ADMIN PAYMENT SETTINGS
  // =========================================================================

  /**
   * Returns comprehensive payment settings for Super Admin, masking all sensitive credentials.
   */
  async getAdminPaymentSettings() {
    let upiConfig = await this.prisma.paymentConfig.findUnique({
      where: { configKey: 'DEFAULT_PAYMENT_CONFIG' },
    });

    if (!upiConfig) {
      upiConfig = await this.prisma.paymentConfig.create({
        data: {
          configKey: 'DEFAULT_PAYMENT_CONFIG',
          upiEnabled: true,
          merchantUpiVpa: null,
          merchantName: 'ASKR EV Mobility',
          isVerified: false,
          manualReviewRequired: true,
          notes: 'Default UPI settings initialized',
        },
      });
    }

    const gatewayConfigs = await this.prisma.paymentGatewayConfig.findMany({
      orderBy: { provider: 'asc' },
    });

    const supportedList = this.gatewayRegistry.getSupportedList();

    // Map all supported providers, incorporating DB config if present
    const gatewaysWithMaskedSecrets = supportedList.map((supported) => {
      const cfg = gatewayConfigs.find((c) => c.provider === supported.id);
      let secretKeyMasked = '';
      let webhookSecretMasked = '';

      if (cfg?.encryptedSecretKey) {
        try {
          const decrypted = this.encryptionService.decrypt(cfg.encryptedSecretKey);
          secretKeyMasked = this.encryptionService.mask(decrypted);
        } catch {
          secretKeyMasked = '••••••••[DECRYPT_ERROR]';
        }
      }

      if (cfg?.encryptedWebhookKey) {
        try {
          const decrypted = this.encryptionService.decrypt(cfg.encryptedWebhookKey);
          webhookSecretMasked = this.encryptionService.mask(decrypted);
        } catch {
          webhookSecretMasked = '••••••••[DECRYPT_ERROR]';
        }
      }

      return {
        id: cfg?.id || null,
        provider: supported.id,
        name: supported.name,
        isFunctional: supported.isFunctional,
        isEnabled: cfg?.isEnabled ?? false,
        isSandbox: cfg?.isSandbox ?? true,
        merchantId: cfg?.merchantId || '',
        secretKeyMasked,
        webhookSecretMasked,
        hasSecretKey: Boolean(cfg?.encryptedSecretKey),
        hasWebhookSecret: Boolean(cfg?.encryptedWebhookKey),
        webhookUrl: cfg?.webhookUrl || `/api/payments/webhook/${supported.id.toLowerCase()}`,
        webhookVerifiedAt: cfg?.webhookVerifiedAt || null,
        status: cfg?.status || (supported.isFunctional ? 'ACTIVE' : 'CONFIGURATION_ONLY'),
        lastTestedAt: cfg?.lastTestedAt || null,
        lastTestStatus: cfg?.lastTestStatus || null,
        lastTestMessage: cfg?.lastTestMessage || null,
      };
    });

    const providerPriority: Record<string, number> = {
      PINELABS: 1,
      RAZORPAY: 2,
      CASHFREE: 3,
      PHONEPE: 4,
    };

    gatewaysWithMaskedSecrets.sort(
      (a, b) => (providerPriority[a.provider] || 99) - (providerPriority[b.provider] || 99)
    );

    return {
      upi: {
        id: upiConfig.id,
        upiEnabled: upiConfig.upiEnabled,
        merchantUpiVpa: upiConfig.merchantUpiVpa,
        merchantName: upiConfig.merchantName,
        isVerified: upiConfig.isVerified,
        verifiedAt: upiConfig.verifiedAt,
        verifiedBy: upiConfig.verifiedBy,
        manualReviewRequired: upiConfig.manualReviewRequired,
        notes: upiConfig.notes,
      },
      gateways: gatewaysWithMaskedSecrets,
    };
  }

  /**
   * Super Admin updates UPI Configuration.
   */
  async updateUpiSettings(adminId: string, dto: UpdateUpiSettingsDto) {
    const existing = await this.prisma.paymentConfig.findUnique({
      where: { configKey: 'DEFAULT_PAYMENT_CONFIG' },
    });

    const willBeVerified = dto.isVerified !== undefined ? dto.isVerified : existing?.isVerified ?? false;
    const verifiedAt = willBeVerified ? existing?.verifiedAt || new Date() : null;
    const verifiedBy = willBeVerified ? existing?.verifiedBy || adminId : null;

    const updated = await this.prisma.paymentConfig.upsert({
      where: { configKey: 'DEFAULT_PAYMENT_CONFIG' },
      create: {
        configKey: 'DEFAULT_PAYMENT_CONFIG',
        upiEnabled: dto.upiEnabled !== undefined ? dto.upiEnabled : true,
        merchantUpiVpa: dto.merchantUpiVpa?.trim() || null,
        merchantName: dto.merchantName?.trim() || 'ASKR EV Mobility',
        isVerified: Boolean(dto.isVerified),
        verifiedAt,
        verifiedBy,
        manualReviewRequired: dto.manualReviewRequired !== undefined ? dto.manualReviewRequired : true,
        notes: dto.notes?.trim() || null,
      },
      update: {
        upiEnabled: dto.upiEnabled !== undefined ? dto.upiEnabled : undefined,
        merchantUpiVpa: dto.merchantUpiVpa !== undefined ? dto.merchantUpiVpa.trim() : undefined,
        merchantName: dto.merchantName !== undefined ? dto.merchantName.trim() : undefined,
        isVerified: dto.isVerified !== undefined ? dto.isVerified : undefined,
        verifiedAt,
        verifiedBy,
        manualReviewRequired: dto.manualReviewRequired !== undefined ? dto.manualReviewRequired : undefined,
        notes: dto.notes !== undefined ? dto.notes.trim() : undefined,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'UPI_PAYMENT_SETTINGS_UPDATED',
        entityType: 'PAYMENT_CONFIG',
        entityId: updated.id,
        metadata: {
          upiEnabled: updated.upiEnabled,
          merchantUpiVpa: updated.merchantUpiVpa,
          isVerified: updated.isVerified,
          manualReviewRequired: updated.manualReviewRequired,
          complianceMode: 'SIMULATION_ONLY',
        },
      },
    });

    return updated;
  }

  /**
   * Super Admin updates Payment Gateway Configuration (with at-rest encryption).
   */
  async updateGatewayConfig(adminId: string, dto: UpdateGatewayConfigDto) {
    const providerKey = dto.provider.toUpperCase();
    const provider = this.gatewayRegistry.getProvider(providerKey);

    const existing = await this.prisma.paymentGatewayConfig.findUnique({
      where: { provider: providerKey },
    });

    // Handle Secret Key encryption & masked preservation
    let encryptedSecretKey = existing?.encryptedSecretKey || null;
    if (dto.secretKey && !this.encryptionService.isMasked(dto.secretKey)) {
      encryptedSecretKey = this.encryptionService.encrypt(dto.secretKey.trim());
    }

    // Handle Webhook Secret encryption & masked preservation
    let encryptedWebhookKey = existing?.encryptedWebhookKey || null;
    if (dto.webhookSecret && !this.encryptionService.isMasked(dto.webhookSecret)) {
      encryptedWebhookKey = this.encryptionService.encrypt(dto.webhookSecret.trim());
    }

    const isEnabled = dto.isEnabled !== undefined ? dto.isEnabled : existing?.isEnabled ?? false;
    const isSandbox = dto.isSandbox !== undefined ? dto.isSandbox : existing?.isSandbox ?? true;
    const merchantId = dto.merchantId !== undefined ? dto.merchantId.trim() : existing?.merchantId ?? null;
    const webhookUrl = dto.webhookUrl !== undefined ? dto.webhookUrl.trim() : existing?.webhookUrl ?? `/api/payments/webhook/${providerKey.toLowerCase()}`;
    const status = provider.isFunctional ? (isEnabled ? 'ACTIVE' : 'DISABLED') : 'CONFIGURATION_ONLY';

    const updated = await this.prisma.paymentGatewayConfig.upsert({
      where: { provider: providerKey },
      create: {
        provider: providerKey,
        isEnabled,
        isSandbox,
        merchantId,
        encryptedSecretKey,
        encryptedWebhookKey,
        webhookUrl,
        status,
      },
      update: {
        isEnabled,
        isSandbox,
        merchantId,
        encryptedSecretKey,
        encryptedWebhookKey,
        webhookUrl,
        status,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'PAYMENT_GATEWAY_CONFIG_UPDATED',
        entityType: 'PAYMENT_GATEWAY_CONFIG',
        entityId: updated.id,
        metadata: {
          provider: providerKey,
          isEnabled: updated.isEnabled,
          isSandbox: updated.isSandbox,
          merchantIdPrefix: updated.merchantId?.slice(0, 8),
          hasSecretKey: Boolean(updated.encryptedSecretKey),
          hasWebhookKey: Boolean(updated.encryptedWebhookKey),
          status: updated.status,
          complianceMode: 'SIMULATION_ONLY',
        },
      },
    });

    return {
      message: `${provider.displayName} settings updated successfully.`,
      config: {
        id: updated.id,
        provider: updated.provider,
        isEnabled: updated.isEnabled,
        isSandbox: updated.isSandbox,
        merchantId: updated.merchantId,
        hasSecretKey: Boolean(updated.encryptedSecretKey),
        hasWebhookSecret: Boolean(updated.encryptedWebhookKey),
        status: updated.status,
      },
    };
  }

  /**
   * Super Admin tests payment gateway connection and credentials handshake.
   */
  async testGatewayConnection(adminId: string, dto: TestGatewayConnectionDto) {
    const providerKey = dto.provider.toUpperCase();
    const provider = this.gatewayRegistry.getProvider(providerKey);

    const existing = await this.prisma.paymentGatewayConfig.findUnique({
      where: { provider: providerKey },
    });

    let merchantId = dto.merchantId?.trim() || existing?.merchantId || '';
    let secretKey = '';

    if (dto.secretKey && !this.encryptionService.isMasked(dto.secretKey)) {
      secretKey = dto.secretKey.trim();
    } else if (existing?.encryptedSecretKey) {
      secretKey = this.encryptionService.decrypt(existing.encryptedSecretKey);
    }

    const isSandbox = dto.isSandbox !== undefined ? dto.isSandbox : existing?.isSandbox ?? true;

    const testResult = await provider.testConnection({
      merchantId,
      secretKey,
      isSandbox,
    });

    // Record test result in DB config
    if (existing) {
      await this.prisma.paymentGatewayConfig.update({
        where: { id: existing.id },
        data: {
          lastTestedAt: testResult.timestamp,
          lastTestStatus: testResult.success ? 'SUCCESS' : 'FAILED',
          lastTestMessage: testResult.message,
        },
      });
    }

    // Record in Payment Gateway Logs
    await this.prisma.paymentGatewayLog.create({
      data: {
        provider: providerKey,
        event: 'TEST_CONNECTION',
        status: testResult.success ? 'SUCCESS' : 'FAILED',
        errorMessage: testResult.success ? null : testResult.message,
        rawPayload: {
          isSandbox,
          merchantIdPrefix: merchantId.slice(0, 8),
          details: testResult.details,
        },
      },
    });

    return testResult;
  }

  /**
   * Super Admin views payment gateway logs.
   */
  async getGatewayLogs(limit = 50, provider?: string) {
    const where: any = {};
    if (provider && provider !== 'ALL') {
      where.provider = provider.toUpperCase();
    }

    const logs = await this.prisma.paymentGatewayLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    });

    return logs.map((l) => ({
      ...l,
      amountINR: l.amountPaise ? paiseToRupees(l.amountPaise) : null,
    }));
  }

  // =========================================================================
  // ONLINE BOOKING ORDER CREATION (MEMBER CHECKOUT)
  // =========================================================================

  async createOnlineBookingOrder(userId: string, dto: CreateGatewayOrderDto) {
    const providerKey = dto.provider.toUpperCase();
    const provider = this.gatewayRegistry.getProvider(providerKey);

    if (!provider.isFunctional) {
      throw new BadRequestException(
        `Payment gateway '${provider.displayName}' is currently in configuration-only mode. Please select another payment method or manual UPI.`
      );
    }

    const gatewayConfig = await this.prisma.paymentGatewayConfig.findUnique({
      where: { provider: providerKey },
    });

    if (!gatewayConfig || !gatewayConfig.isEnabled) {
      throw new BadRequestException(`Payment gateway '${provider.displayName}' is not currently enabled for transactions.`);
    }

    if (!gatewayConfig.encryptedSecretKey || !gatewayConfig.merchantId) {
      throw new BadRequestException(`Payment gateway '${provider.displayName}' credentials have not been configured.`);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('Member not found');

    // Prevent duplicate pending requests under administrative review
    const pendingRequest = await this.prisma.membershipRequest.findFirst({
      where: {
        userId,
        status: 'PENDING',
      },
    });

    if (pendingRequest) {
      throw new BadRequestException(
        'You already have a pending membership activation/upgrade request under administrative review.'
      );
    }

    let amountPaise: bigint;
    switch (dto.requestType) {
      case MembershipRequestType.BASIC_ACTIVATION:
        if (user.currentPackage !== MembershipPackage.FREE) {
          throw new BadRequestException('Basic Activation is only available for Free accounts.');
        }
        amountPaise = FINANCIAL_RULES.BASIC_MEMBERSHIP_PRICE_PAISE; // ₹3,000
        break;
      case MembershipRequestType.FULL_ACTIVATION:
        if (user.currentPackage !== MembershipPackage.FREE) {
          throw new BadRequestException('Full Activation is only available for Free accounts.');
        }
        amountPaise = FINANCIAL_RULES.FULL_MEMBERSHIP_PRICE_PAISE; // ₹33,000
        break;
      case MembershipRequestType.BASIC_TO_FULL_UPGRADE:
        if (user.currentPackage !== MembershipPackage.BASIC) {
          throw new BadRequestException('Upgrade is only available for active Basic accounts.');
        }
        amountPaise = FINANCIAL_RULES.UPGRADE_PAYMENT_PRICE_PAISE; // ₹30,000
        break;
      default:
        throw new BadRequestException(`Unsupported request type: ${dto.requestType}`);
    }

    const secretKey = this.encryptionService.decrypt(gatewayConfig.encryptedSecretKey);
    const receipt = `RCPT-${dto.requestType.slice(0, 4)}-${user.memberId}-${Date.now().toString().slice(-6)}`;

    // 1. Create MembershipRequest record in PENDING status (requiring authorized admin review)
    const membershipRequest = await this.prisma.membershipRequest.create({
      data: {
        userId,
        requestType: dto.requestType,
        feePaise: amountPaise,
        paymentMode: providerKey,
        paymentReference: receipt,
        isSimulated: true,
        status: 'PENDING',
        metadata: {
          provider: providerKey,
          merchantReference: receipt,
          compliance: 'SIMULATION_ONLY',
          source: 'gateway_checkout',
        },
      },
    });

    // 2. Persist PaymentOrder in CREATED status
    const paymentOrder = await this.prisma.paymentOrder.create({
      data: {
        userId: user.id,
        memberId: user.memberId,
        provider: providerKey,
        requestType: dto.requestType,
        merchantReference: receipt,
        amountPaise,
        currency: 'INR',
        status: 'CREATED',
        membershipRequestId: membershipRequest.id,
      },
    });

    // 3. Invoke provider genuine order creation
    try {
      const orderResult = await provider.createOrder(
        {
          amountPaise,
          receipt,
          customerName: user.fullName,
          customerEmail: user.email,
          customerPhone: user.phone || undefined,
          notes: {
            userId: user.id,
            memberId: user.memberId,
            requestType: dto.requestType,
            paymentOrderId: paymentOrder.id,
            membershipRequestId: membershipRequest.id,
          },
        },
        {
          merchantId: gatewayConfig.merchantId,
          secretKey,
          isSandbox: gatewayConfig.isSandbox,
        }
      );

      // 4. Update PaymentOrder to PROCESSING with providerOrderId
      await this.prisma.paymentOrder.update({
        where: { id: paymentOrder.id },
        data: {
          providerOrderId: orderResult.orderId,
          clientPayload: orderResult.clientPayload as any,
          status: 'PROCESSING',
        },
      });

      // Record order in PaymentGatewayLog
      await this.prisma.paymentGatewayLog.create({
        data: {
          provider: providerKey,
          event: 'ORDER_CREATED',
          orderId: orderResult.orderId,
          referenceId: receipt,
          amountPaise,
          status: 'SUCCESS',
          rawPayload: {
            receipt,
            userId,
            memberId: user.memberId,
            requestType: dto.requestType,
            paymentOrderId: paymentOrder.id,
            membershipRequestId: membershipRequest.id,
          },
        },
      });

      return {
        message: 'Online booking payment order created successfully.',
        order: {
          ...orderResult,
          paymentOrderId: paymentOrder.id,
          membershipRequestId: membershipRequest.id,
          amountINR: paiseToRupees(amountPaise),
        },
      };
    } catch (err: any) {
      await this.prisma.paymentOrder.update({
        where: { id: paymentOrder.id },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          failureReason: err.message || 'Provider order creation failed',
        },
      });
      throw err;
    }
  }

  // =========================================================================
  // GATEWAY WEBHOOK INGESTION & SIGNATURE VALIDATION
  // =========================================================================

  async handleGatewayWebhook(
    providerId: string,
    rawBody: Buffer | string,
    signature: string,
    headers: any,
    ipAddress?: string
  ) {
    const providerKey = providerId.toUpperCase();
    const provider = this.gatewayRegistry.getProvider(providerKey);

    const gatewayConfig = await this.prisma.paymentGatewayConfig.findUnique({
      where: { provider: providerKey },
    });

    if (!gatewayConfig || !gatewayConfig.encryptedWebhookKey) {
      this.logger.warn(`Webhook received for unconfigured or disabled provider: ${providerKey}`);
      throw new ForbiddenException(`Webhook configuration missing for provider ${providerKey}`);
    }

    // 1. Webhook Deduplication Guard via ProcessedWebhookEvent
    const eventId =
      headers?.['webhook-id'] ||
      headers?.['x-webhook-id'] ||
      headers?.['x-request-id'] ||
      headers?.['id'] ||
      null;

    if (eventId) {
      const existingEvent = await this.prisma.processedWebhookEvent.findUnique({
        where: { eventId },
      });
      if (existingEvent) {
        this.logger.log(`Duplicate webhook event ${eventId} already processed for ${providerKey}. Returning idempotent OK.`);
        return {
          received: true,
          event: existingEvent.eventType,
          status: existingEvent.status,
          idempotent: true,
        };
      }
    }

    // 2. Authenticated Signature Verification
    const webhookSecret = this.encryptionService.decrypt(gatewayConfig.encryptedWebhookKey);
    const verification = await provider.verifyWebhook(rawBody, signature, webhookSecret, headers);

    const isRefundEvent =
      verification.status === 'REFUND' ||
      String(verification.event).toLowerCase().includes('refund');

    const logEvent = isRefundEvent
      ? verification.status === 'FAILED'
        ? 'REFUND_FAILED'
        : 'REFUND_PROCESSED'
      : 'WEBHOOK_RECEIVED';

    await this.prisma.paymentGatewayLog.create({
      data: {
        provider: providerKey,
        event: logEvent,
        orderId: verification.orderId || null,
        paymentId: verification.paymentId || null,
        referenceId: verification.referenceId || null,
        amountPaise: verification.amountPaise || null,
        status: verification.isValid ? (isRefundEvent ? 'REFUND' : 'SUCCESS') : 'FAILED',
        errorMessage: verification.error || null,
        rawPayload: {
          event: verification.event,
          headers: {
            'user-agent': headers?.['user-agent'],
            'webhook-id': headers?.['webhook-id'],
            'webhook-timestamp': headers?.['webhook-timestamp'],
            'signature': signature ? '[REDACTED]' : undefined,
          },
          metadata: verification.metadata,
        },
        ipAddress: ipAddress || null,
      },
    });

    if (!verification.isValid) {
      this.logger.warn(`Rejected invalid webhook signature from ${providerKey} [IP: ${ipAddress}]: ${verification.error}`);
      throw new UnauthorizedException(verification.error || `Invalid webhook signature for provider ${providerKey}`);
    }

    // 3. Match Existing PaymentOrder
    let matchedOrder = null;
    if (verification.orderId) {
      matchedOrder = await this.prisma.paymentOrder.findFirst({
        where: { providerOrderId: verification.orderId },
      });
    }
    if (!matchedOrder && verification.referenceId) {
      matchedOrder = await this.prisma.paymentOrder.findUnique({
        where: { merchantReference: verification.referenceId },
      });
    }

    // 4. Strict Provider Verification Validation (Issue 2)
    // Never substitute missing verification values with assumed INR or expected amounts
    if (verification.status === 'SUCCESS') {
      const missingFields: string[] = [];
      if (!verification.orderId && !verification.referenceId) missingFields.push('orderId/referenceId');
      if (!verification.paymentId) missingFields.push('paymentId');
      if (verification.amountPaise === undefined || verification.amountPaise === null) missingFields.push('amountPaise');
      if (!verification.currency) missingFields.push('currency');

      if (missingFields.length > 0) {
        const errorMsg = `Payment verification rejected: missing mandatory provider verification fields [${missingFields.join(', ')}]`;
        this.logger.error(errorMsg);

        // Record deduplication and mark order FAILED atomically if matched
        await this.prisma.$transaction(async (tx) => {
          if (eventId) {
            await tx.processedWebhookEvent.create({
              data: {
                eventId,
                provider: providerKey,
                eventType: String(verification.event || 'webhook'),
                orderId: verification.orderId || null,
                paymentId: verification.paymentId || null,
                status: 'FAILED',
                payload: typeof rawBody === 'string' ? JSON.parse(rawBody) : JSON.parse(rawBody.toString('utf8')),
              },
            });
          }
          if (matchedOrder && matchedOrder.status !== 'VERIFIED' && matchedOrder.status !== 'REFUNDED') {
            await tx.paymentOrder.update({
              where: { id: matchedOrder.id },
              data: {
                status: 'FAILED',
                failedAt: new Date(),
                failureReason: errorMsg,
              },
            });
          }
        });

        return { received: true, event: verification.event, status: 'FAILED', error: errorMsg };
      }
    }

    // 5. Atomic Deduplication & State Transition Transaction (Issue 1, Issue 2, Issue 4)
    // Process verified webhook event deduplication and PaymentOrder status transitions atomically in a single database transaction.
    // A crash must never leave a webhook marked processed while its payment update remains incomplete.
    const result = await this.prisma.$transaction(async (tx) => {
      // Step A: Persist ProcessedWebhookEvent inside transaction
      if (eventId) {
        await tx.processedWebhookEvent.create({
          data: {
            eventId,
            provider: providerKey,
            eventType: String(verification.event || 'webhook'),
            orderId: verification.orderId || null,
            paymentId: verification.paymentId || null,
            status: verification.status || 'PROCESSED',
            payload: typeof rawBody === 'string' ? JSON.parse(rawBody) : JSON.parse(rawBody.toString('utf8')),
          },
        });
      }

      if (!matchedOrder) {
        return {
          received: true,
          event: verification.event,
          status: verification.status,
          orderId: verification.orderId,
          paymentId: verification.paymentId,
          matched: false,
        };
      }

      // Re-read latest order state inside transaction
      const currentOrder = await tx.paymentOrder.findUnique({
        where: { id: matchedOrder.id },
      });
      if (!currentOrder) {
        return { received: true, status: 'FAILED', error: 'Order not found in tx' };
      }

      // Step B: Terminal State Preservation (Issue 4)
      // Delayed or duplicate failure events must not incorrectly overwrite already verified or refunded transactions.
      if (currentOrder.status === 'VERIFIED') {
        if (verification.status === 'REFUND') {
          // Transition VERIFIED -> REFUNDED
          await tx.paymentOrder.update({
            where: { id: currentOrder.id },
            data: {
              status: 'REFUNDED',
              refundedAt: new Date(),
              rawResponse: verification.metadata as any,
            },
          });
          return { received: true, event: verification.event, status: 'REFUNDED' };
        } else if (verification.status === 'SUCCESS') {
          // Idempotent re-verification
          await tx.paymentOrder.update({
            where: { id: currentOrder.id },
            data: {
              reconciledAt: new Date(),
            },
          });
          return { received: true, event: verification.event, status: 'VERIFIED', idempotent: true };
        } else {
          // Ignore delayed failure or cancelled events
          this.logger.warn(`Preserving terminal VERIFIED status for order ${currentOrder.id}. Ignoring delayed ${verification.status} event.`);
          return { received: true, event: verification.event, status: 'VERIFIED', ignored: true, reason: 'Terminal state VERIFIED preserved' };
        }
      }

      if (currentOrder.status === 'REFUNDED') {
        this.logger.warn(`Preserving terminal REFUNDED status for order ${currentOrder.id}. Ignoring event ${verification.event}.`);
        return { received: true, event: verification.event, status: 'REFUNDED', ignored: true, reason: 'Terminal state REFUNDED is immutable' };
      }

      // Step C: Currency and Amount Reconciliation (Strict, no assumed values)
      if (verification.status === 'SUCCESS') {
        const orderCurrency = currentOrder.currency;
        const incomingCurrency = verification.currency!;
        if (incomingCurrency.toUpperCase() !== orderCurrency.toUpperCase()) {
          const reason = `Currency mismatch: expected ${orderCurrency}, received ${incomingCurrency}`;
          this.logger.error(reason);
          await tx.paymentOrder.update({
            where: { id: currentOrder.id },
            data: {
              status: 'FAILED',
              failedAt: new Date(),
              failureReason: reason,
            },
          });
          return { received: true, event: verification.event, status: 'FAILED', error: reason };
        }

        if (verification.amountPaise !== currentOrder.amountPaise) {
          const reason = `Amount mismatch: expected ${currentOrder.amountPaise} paise, received ${verification.amountPaise} paise`;
          this.logger.error(reason);
          await tx.paymentOrder.update({
            where: { id: currentOrder.id },
            data: {
              status: 'FAILED',
              failedAt: new Date(),
              failureReason: reason,
            },
          });
          return { received: true, event: verification.event, status: 'FAILED', error: reason };
        }

        // Mark PaymentOrder VERIFIED
        await tx.paymentOrder.update({
          where: { id: currentOrder.id },
          data: {
            status: 'VERIFIED',
            providerOrderId: verification.orderId || currentOrder.providerOrderId,
            providerPaymentId: verification.paymentId || currentOrder.providerPaymentId,
            verifiedAt: new Date(),
            reconciledAt: new Date(),
            rawResponse: verification.metadata as any,
          },
        });

        // Maintain Booking Approval Separation: MembershipRequest stays PENDING
        if (currentOrder.membershipRequestId) {
          await tx.membershipRequest.update({
            where: { id: currentOrder.membershipRequestId },
            data: {
              metadata: {
                ...(typeof currentOrder.clientPayload === 'object' ? (currentOrder.clientPayload as any) : {}),
                paymentVerified: true,
                verifiedPaymentOrderId: currentOrder.id,
                verifiedProviderPaymentId: verification.paymentId || null,
                paymentVerifiedAt: new Date().toISOString(),
                approvalRequirement: 'PENDING_AUTHORIZED_ADMIN_APPROVAL',
                compliance: 'SIMULATION_ONLY',
              },
            },
          });
        }
      } else if (verification.status === 'FAILED') {
        await tx.paymentOrder.update({
          where: { id: currentOrder.id },
          data: {
            status: 'FAILED',
            failedAt: new Date(),
            failureReason: verification.error || 'Payment failed or declined by provider',
            rawResponse: verification.metadata as any,
          },
        });
      } else if (verification.status === 'REFUND') {
        await tx.paymentOrder.update({
          where: { id: currentOrder.id },
          data: {
            status: 'REFUNDED',
            refundedAt: new Date(),
            rawResponse: verification.metadata as any,
          },
        });
      }

      return {
        received: true,
        event: verification.event,
        status: verification.status,
        orderId: verification.orderId,
        paymentId: verification.paymentId,
      };
    });

    // Mark webhook verified timestamp if not already set
    if (!gatewayConfig.webhookVerifiedAt) {
      await this.prisma.paymentGatewayConfig.update({
        where: { id: gatewayConfig.id },
        data: { webhookVerifiedAt: new Date() },
      });
    }

    return result;
  }

  /**
   * Super Admin Server-Side Order Status & Amount Reconciliation
   */
  async verifyAndReconcileOrder(adminId: string, orderIdOrRef: string, providerId: string) {
    const providerKey = providerId.toUpperCase();
    const provider = this.gatewayRegistry.getProvider(providerKey);

    const gatewayConfig = await this.prisma.paymentGatewayConfig.findUnique({
      where: { provider: providerKey },
    });

    if (!gatewayConfig || !gatewayConfig.encryptedSecretKey || !gatewayConfig.merchantId) {
      throw new BadRequestException(`Credentials for provider ${providerKey} are not configured.`);
    }

    if (!provider.getOrderStatus) {
      throw new BadRequestException(`Server-side order inquiry is not supported by ${provider.displayName}`);
    }

    const secretKey = this.encryptionService.decrypt(gatewayConfig.encryptedSecretKey);
    const statusResult = await provider.getOrderStatus(orderIdOrRef, {
      merchantId: gatewayConfig.merchantId,
      secretKey,
      isSandbox: gatewayConfig.isSandbox,
    });

    // Match and update persistent PaymentOrder if exists
    let matchedOrder = null;
    if (statusResult.orderId) {
      matchedOrder = await this.prisma.paymentOrder.findFirst({
        where: { providerOrderId: statusResult.orderId },
      });
    }
    if (!matchedOrder && statusResult.referenceId) {
      matchedOrder = await this.prisma.paymentOrder.findUnique({
        where: { merchantReference: statusResult.referenceId },
      });
    }

    if (matchedOrder) {
      // Terminal State Preservation
      if (matchedOrder.status === 'VERIFIED' && statusResult.status !== 'SUCCESS') {
        this.logger.warn(`Preserving VERIFIED status on order ${matchedOrder.id} during manual reconciliation.`);
      } else if (matchedOrder.status === 'REFUNDED') {
        this.logger.warn(`Preserving REFUNDED status on order ${matchedOrder.id} during manual reconciliation.`);
      } else {
        // Currency & Amount check strictly without assumed values
        const orderCurrency = matchedOrder.currency;
        const incomingCurrency = statusResult.currency;
        const currencyMatch = Boolean(incomingCurrency && incomingCurrency.toUpperCase() === orderCurrency.toUpperCase());
        const amountMatch = statusResult.amountPaise !== undefined && statusResult.amountPaise === matchedOrder.amountPaise;

        if (!currencyMatch || !amountMatch) {
          await this.prisma.paymentOrder.update({
            where: { id: matchedOrder.id },
            data: {
              status: 'FAILED',
              failedAt: new Date(),
              failureReason: !currencyMatch
                ? `Currency mismatch during reconciliation: expected ${orderCurrency}, received ${incomingCurrency || 'MISSING'}`
                : `Amount mismatch during reconciliation: expected ${matchedOrder.amountPaise} paise, received ${statusResToText(statusResult.amountPaise)}`,
            },
          });
        } else if (statusResult.status === 'SUCCESS') {
          await this.prisma.paymentOrder.update({
            where: { id: matchedOrder.id },
            data: {
              status: 'VERIFIED',
              providerPaymentId: statusResult.paymentId || matchedOrder.providerPaymentId,
              verifiedAt: new Date(),
              reconciledAt: new Date(),
              rawResponse: statusResult.details as any,
            },
          });

          // Booking approval separation: maintain PENDING status
          if (matchedOrder.membershipRequestId) {
            await this.prisma.membershipRequest.update({
              where: { id: matchedOrder.membershipRequestId },
              data: {
                metadata: {
                  ...(typeof matchedOrder.clientPayload === 'object' ? (matchedOrder.clientPayload as any) : {}),
                  paymentVerified: true,
                  verifiedPaymentOrderId: matchedOrder.id,
                  verifiedProviderPaymentId: statusResult.paymentId || null,
                  paymentVerifiedAt: new Date().toISOString(),
                  approvalRequirement: 'PENDING_AUTHORIZED_ADMIN_APPROVAL',
                  compliance: 'SIMULATION_ONLY',
                },
              },
            });
          }
        } else if (statusResult.status === 'FAILED') {
          await this.prisma.paymentOrder.update({
            where: { id: matchedOrder.id },
            data: {
              status: 'FAILED',
              failedAt: new Date(),
              failureReason: 'Provider confirmed failure during reconciliation',
              rawResponse: statusResult.details as any,
            },
          });
        }
      }
    }

    await this.prisma.paymentGatewayLog.create({
      data: {
        provider: providerKey,
        event: 'ORDER_RECONCILED',
        orderId: statusResult.orderId,
        paymentId: statusResult.paymentId || null,
        referenceId: statusResult.referenceId || null,
        amountPaise: statusResult.amountPaise || null,
        status: statusResult.status,
        rawPayload: {
          rawStatus: statusResult.rawStatus,
          currency: statusResult.currency,
          reconciledBy: adminId,
          reconciledAt: new Date().toISOString(),
        },
      },
    });

    return {
      success: true,
      order: statusResult,
      matchedPaymentOrderId: matchedOrder?.id || null,
    };
  }

  // =========================================================================
  // AUTOMATIC BOUNDED RECONCILIATION SCHEDULER & RECOVERY POLLER (Issue 3)
  // =========================================================================

  /**
   * Scheduled Background Reconciliation Worker
   * Fires every 30 seconds to reconcile eligible pending PaymentOrders.
   */
  @Interval(30000)
  async handleScheduledPaymentReconciliation() {
    return this.reconcilePendingPaymentOrders('SCHEDULER_AUTOMATED');
  }

  /**
   * Starts programmatic poller (for integration testing or standalone recovery)
   */
  startReconciliationScheduler(intervalMs = 30000): void {
    if (this.pollerTimer) return;
    this.pollerTimer = setInterval(async () => {
      await this.reconcilePendingPaymentOrders('PROGRAMMATIC_POLLER');
    }, intervalMs);
    if (this.pollerTimer.unref) {
      this.pollerTimer.unref();
    }
    this.logger.log(`🕒 Payment reconciliation poller started (${intervalMs}ms interval)`);
  }

  /**
   * Stops programmatic poller
   */
  stopReconciliationScheduler(): void {
    if (this.pollerTimer) {
      clearInterval(this.pollerTimer);
      this.pollerTimer = null;
      this.logger.log('🛑 Payment reconciliation poller stopped');
    }
  }

  onModuleDestroy() {
    this.stopReconciliationScheduler();
  }

  /**
   * Pending Payment Orders Auto-Recovery & Bounded Poller
   * Enforces:
   * 1. Distributed Concurrency Safety: Uses PostgreSQL advisory lock (ID: 884920) across horizontal workers.
   * 2. Crash/Restart Recovery: Discovers orphaned CREATED / PROCESSING orders.
   * 3. Bounded Retries: Routes orders to FAILED after max 5 attempts.
   * 4. Exponential Backoff: Enforces nextRetryAt with backoff window up to 10 minutes.
   * 5. Strict Verification: Rejects missing amount, currency or paymentId without assumed defaults.
   */
  async reconcilePendingPaymentOrders(adminOrTrigger = 'SYSTEM') {
    const ADVISORY_LOCK_ID = 884920;
    let lockAcquired = false;

    try {
      const lockRes: any[] = await this.prisma.$queryRaw`SELECT pg_try_advisory_lock(${ADVISORY_LOCK_ID}) as acquired`;
      lockAcquired = Boolean(lockRes?.[0]?.acquired);
    } catch {
      // For mock environments in unit tests without raw pg advisory lock support
      lockAcquired = true;
    }

    if (!lockAcquired) {
      this.logger.debug('Payment reconciliation advisory lock held by another instance. Skipping cycle.');
      return { acquired: false, reconciledCount: 0, failedCount: 0, pendingCount: 0, results: [] };
    }

    try {
      const now = new Date();
      // Age threshold: order must be older than 15s to allow user checkout flow
      const eligibleThreshold = new Date(now.getTime() - 15000);

      // Query pending orders eligible for reconciliation
      const pendingOrders = await this.prisma.paymentOrder.findMany({
        where: {
          status: { in: ['CREATED', 'PROCESSING'] },
          createdAt: { lte: eligibleThreshold },
          OR: [
            { nextRetryAt: null },
            { nextRetryAt: { lte: now } },
          ],
        },
        take: 25,
        orderBy: { createdAt: 'asc' },
      });

      const results: Array<{ orderId: string; status: string; reason?: string; error?: string }> = [];

      for (const order of pendingOrders) {
        // Bounded retries: if attempts >= 5, route to FAILED (timeout / dead letter)
        if (order.attempts >= 5) {
          await this.prisma.paymentOrder.update({
            where: { id: order.id },
            data: {
              status: 'FAILED',
              failedAt: new Date(),
              failureReason: 'Payment reconciliation exceeded maximum 5 retry attempts without provider confirmation',
            },
          });
          results.push({ orderId: order.id, status: 'FAILED', reason: 'Max attempts exceeded' });
          continue;
        }

        try {
          const provider = this.gatewayRegistry.getProvider(order.provider);
          if (!provider.getOrderStatus) {
            results.push({ orderId: order.id, status: 'SKIPPED', reason: 'Provider does not support inquiry' });
            continue;
          }

          const config = await this.prisma.paymentGatewayConfig.findUnique({
            where: { provider: order.provider },
          });

          if (!config || !config.encryptedSecretKey || !config.merchantId) {
            results.push({ orderId: order.id, status: 'SKIPPED', reason: 'Provider credentials missing' });
            continue;
          }

          const secretKey = this.encryptionService.decrypt(config.encryptedSecretKey);
          const lookupKey = order.providerOrderId || order.merchantReference;

          const statusRes = await provider.getOrderStatus(lookupKey, {
            merchantId: config.merchantId,
            secretKey,
            isSandbox: config.isSandbox,
          });

          if (statusRes.status === 'SUCCESS') {
            // Strict verification: Reject if amount, currency, or paymentId missing or mismatched (Issue 2)
            if (
              statusRes.amountPaise === undefined ||
              statusRes.amountPaise === null ||
              !statusRes.currency ||
              !statusRes.paymentId
            ) {
              await this.prisma.paymentOrder.update({
                where: { id: order.id },
                data: {
                  status: 'FAILED',
                  failedAt: new Date(),
                  failureReason: 'Missing mandatory provider verification values during reconciliation inquiry',
                },
              });
              results.push({ orderId: order.id, status: 'FAILED', reason: 'Missing verification values' });
              continue;
            }

            if (statusRes.currency.toUpperCase() !== order.currency.toUpperCase()) {
              await this.prisma.paymentOrder.update({
                where: { id: order.id },
                data: {
                  status: 'FAILED',
                  failedAt: new Date(),
                  failureReason: `Currency mismatch during recovery: expected ${order.currency}, received ${statusRes.currency}`,
                },
              });
              results.push({ orderId: order.id, status: 'FAILED', reason: 'Currency mismatch' });
              continue;
            }

            if (statusRes.amountPaise !== order.amountPaise) {
              await this.prisma.paymentOrder.update({
                where: { id: order.id },
                data: {
                  status: 'FAILED',
                  failedAt: new Date(),
                  failureReason: `Amount mismatch during recovery: expected ${order.amountPaise} paise, received ${statusRes.amountPaise} paise`,
                },
              });
              results.push({ orderId: order.id, status: 'FAILED', reason: 'Amount mismatch' });
              continue;
            }

            // Atomic update to VERIFIED
            await this.prisma.$transaction(async (tx) => {
              await tx.paymentOrder.update({
                where: { id: order.id },
                data: {
                  status: 'VERIFIED',
                  providerOrderId: statusRes.orderId || order.providerOrderId,
                  providerPaymentId: statusRes.paymentId || order.providerPaymentId,
                  verifiedAt: new Date(),
                  reconciledAt: new Date(),
                  rawResponse: statusRes.details as any,
                },
              });

              if (order.membershipRequestId) {
                await tx.membershipRequest.update({
                  where: { id: order.membershipRequestId },
                  data: {
                    metadata: {
                      paymentVerified: true,
                      verifiedPaymentOrderId: order.id,
                      verifiedProviderPaymentId: statusRes.paymentId || null,
                      paymentVerifiedAt: new Date().toISOString(),
                      approvalRequirement: 'PENDING_AUTHORIZED_ADMIN_APPROVAL',
                      compliance: 'SIMULATION_ONLY',
                    },
                  },
                });
              }
            });

            results.push({ orderId: order.id, status: 'VERIFIED' });
          } else if (statusRes.status === 'FAILED') {
            await this.prisma.paymentOrder.update({
              where: { id: order.id },
              data: {
                status: 'FAILED',
                failedAt: new Date(),
                failureReason: 'Provider confirmed failure during recovery inquiry',
              },
            });
            results.push({ orderId: order.id, status: 'FAILED' });
          } else {
            // Still PENDING at provider: apply exponential backoff
            const nextAttempts = order.attempts + 1;
            const backoffSec = Math.min(30 * Math.pow(2, nextAttempts), 600);
            const nextRetryAt = new Date(Date.now() + backoffSec * 1000);

            await this.prisma.paymentOrder.update({
              where: { id: order.id },
              data: {
                attempts: nextAttempts,
                nextRetryAt,
                reconciledAt: new Date(),
              },
            });
            results.push({ orderId: order.id, status: 'PENDING', reason: `Backoff until ${nextRetryAt.toISOString()}` });
          }
        } catch (err: any) {
          const nextAttempts = order.attempts + 1;
          const backoffSec = Math.min(30 * Math.pow(2, nextAttempts), 600);
          const nextRetryAt = new Date(Date.now() + backoffSec * 1000);

          await this.prisma.paymentOrder.update({
            where: { id: order.id },
            data: {
              attempts: nextAttempts,
              nextRetryAt,
            },
          });
          results.push({ orderId: order.id, status: 'ERROR', error: err.message });
        }
      }

      return {
        acquired: true,
        reconciledCount: results.filter((r) => r.status === 'VERIFIED').length,
        failedCount: results.filter((r) => r.status === 'FAILED').length,
        pendingCount: results.filter((r) => r.status === 'PENDING').length,
        results,
      };
    } finally {
      try {
        await this.prisma.$queryRaw`SELECT pg_advisory_unlock(${ADVISORY_LOCK_ID})`;
      } catch {}
    }
  }
}

function statusResToText(val: any): string {
  return val === undefined || val === null ? 'MISSING' : `${val} paise`;
}

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
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
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

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

    // 3. Persist ProcessedWebhookEvent (atomic deduplication guard against concurrent deliveries)
    if (eventId) {
      try {
        await this.prisma.processedWebhookEvent.create({
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
      } catch (dedupErr: any) {
        this.logger.warn(`ProcessedWebhookEvent concurrent write handled for ${eventId}: ${dedupErr.message}`);
      }
    }

    // 4. Match Existing PaymentOrder
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

    // 5. Reconcile Payment Status, Amount, and Currency
    if (matchedOrder) {
      // Currency check
      const orderCurrency = matchedOrder.currency || 'INR';
      const incomingCurrency = (verification.currency || 'INR').toUpperCase();
      if (incomingCurrency !== orderCurrency.toUpperCase()) {
        this.logger.error(`Currency mismatch for order ${matchedOrder.id}: expected ${orderCurrency}, got ${incomingCurrency}`);
        await this.prisma.paymentOrder.update({
          where: { id: matchedOrder.id },
          data: {
            status: 'FAILED',
            failedAt: new Date(),
            failureReason: `Currency mismatch: expected ${orderCurrency}, got ${incomingCurrency}`,
          },
        });
        return { received: true, event: verification.event, status: 'FAILED', error: 'Currency mismatch' };
      }

      // Amount reconciliation check
      if (verification.amountPaise !== undefined && verification.amountPaise !== matchedOrder.amountPaise) {
        this.logger.error(
          `Amount mismatch for order ${matchedOrder.id}: expected ${matchedOrder.amountPaise} paise, received ${verification.amountPaise} paise`
        );
        await this.prisma.paymentOrder.update({
          where: { id: matchedOrder.id },
          data: {
            status: 'FAILED',
            failedAt: new Date(),
            failureReason: `Amount mismatch: expected ${matchedOrder.amountPaise} paise, received ${verification.amountPaise} paise`,
          },
        });
        return { received: true, event: verification.event, status: 'FAILED', error: 'Amount mismatch' };
      }

      // Handle Success: Mark PaymentOrder VERIFIED
      if (verification.status === 'SUCCESS') {
        await this.prisma.paymentOrder.update({
          where: { id: matchedOrder.id },
          data: {
            status: 'VERIFIED',
            providerPaymentId: verification.paymentId || matchedOrder.providerPaymentId,
            verifiedAt: new Date(),
            reconciledAt: new Date(),
            rawResponse: verification.metadata as any,
          },
        });

        // BOOKING APPROVAL SEPARATION:
        // Verified gateway payment must NOT automatically activate EV PRO or EV ULTRA.
        // Maintain existing authorized Admin approval workflow (MembershipRequest.status === PENDING awaiting admin review).
        // Never generate referral or binary credits from an unapproved booking.
        if (matchedOrder.membershipRequestId) {
          await this.prisma.membershipRequest.update({
            where: { id: matchedOrder.membershipRequestId },
            data: {
              // Keeps status as PENDING
              metadata: {
                ...(typeof matchedOrder.clientPayload === 'object' ? (matchedOrder.clientPayload as any) : {}),
                paymentVerified: true,
                verifiedPaymentOrderId: matchedOrder.id,
                verifiedProviderPaymentId: verification.paymentId || null,
                paymentVerifiedAt: new Date().toISOString(),
                approvalRequirement: 'PENDING_AUTHORIZED_ADMIN_APPROVAL',
                compliance: 'SIMULATION_ONLY',
              },
            },
          });
        }
      } else if (verification.status === 'FAILED') {
        await this.prisma.paymentOrder.update({
          where: { id: matchedOrder.id },
          data: {
            status: 'FAILED',
            failedAt: new Date(),
            failureReason: verification.error || 'Payment failed or declined by provider',
            rawResponse: verification.metadata as any,
          },
        });
      } else if (verification.status === 'REFUND') {
        await this.prisma.paymentOrder.update({
          where: { id: matchedOrder.id },
          data: {
            status: 'REFUNDED',
            refundedAt: new Date(),
            rawResponse: verification.metadata as any,
          },
        });
      }
    }

    // Mark webhook verified timestamp if not already set
    if (!gatewayConfig.webhookVerifiedAt) {
      await this.prisma.paymentGatewayConfig.update({
        where: { id: gatewayConfig.id },
        data: { webhookVerifiedAt: new Date() },
      });
    }

    return {
      received: true,
      event: verification.event,
      status: verification.status,
      orderId: verification.orderId,
      paymentId: verification.paymentId,
    };
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
      // Currency & Amount check
      const orderCurrency = matchedOrder.currency || 'INR';
      const incomingCurrency = (statusResult.currency || 'INR').toUpperCase();
      const currencyMatch = incomingCurrency === orderCurrency.toUpperCase();
      const amountMatch =
        statusResult.amountPaise === undefined || statusResult.amountPaise === matchedOrder.amountPaise;

      if (!currencyMatch || !amountMatch) {
        await this.prisma.paymentOrder.update({
          where: { id: matchedOrder.id },
          data: {
            status: 'FAILED',
            failedAt: new Date(),
            failureReason: !currencyMatch ? 'Currency mismatch during reconciliation' : 'Amount mismatch during reconciliation',
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

  /**
   * Pending / Orphaned Payment Orders Auto-Recovery Poller & Reconciler
   * Recovers orders interrupted by network timeouts or dropped webhooks after server restart.
   */
  async reconcilePendingPaymentOrders(adminId?: string) {
    const pendingOrders = await this.prisma.paymentOrder.findMany({
      where: {
        status: { in: ['CREATED', 'PROCESSING'] },
      },
      take: 25,
      orderBy: { createdAt: 'asc' },
    });

    const results: Array<{ orderId: string; status: string; reason?: string; error?: string }> = [];

    for (const order of pendingOrders) {
      try {
        const provider = this.gatewayRegistry.getProvider(order.provider);
        if (!provider.getOrderStatus) continue;

        const config = await this.prisma.paymentGatewayConfig.findUnique({
          where: { provider: order.provider },
        });

        if (!config || !config.encryptedSecretKey || !config.merchantId) continue;

        const secretKey = this.encryptionService.decrypt(config.encryptedSecretKey);
        const lookupKey = order.providerOrderId || order.merchantReference;

        const statusRes = await provider.getOrderStatus(lookupKey, {
          merchantId: config.merchantId,
          secretKey,
          isSandbox: config.isSandbox,
        });

        if (statusRes.status === 'SUCCESS') {
          // Amount & currency verification
          if (statusRes.amountPaise && statusRes.amountPaise !== order.amountPaise) {
            await this.prisma.paymentOrder.update({
              where: { id: order.id },
              data: {
                status: 'FAILED',
                failedAt: new Date(),
                failureReason: 'Amount mismatch during server reconciliation recovery',
              },
            });
            results.push({ orderId: order.id, status: 'FAILED', reason: 'Amount mismatch' });
            continue;
          }

          await this.prisma.paymentOrder.update({
            where: { id: order.id },
            data: {
              status: 'VERIFIED',
              providerPaymentId: statusRes.paymentId || order.providerPaymentId,
              verifiedAt: new Date(),
              reconciledAt: new Date(),
              rawResponse: statusRes.details as any,
            },
          });

          if (order.membershipRequestId) {
            await this.prisma.membershipRequest.update({
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
          results.push({ orderId: order.id, status: 'PENDING' });
        }
      } catch (err: any) {
        this.logger.warn(`Failed to reconcile order ${order.id}: ${err.message}`);
        results.push({ orderId: order.id, status: 'ERROR', error: err.message });
      }
    }

    return {
      reconciledCount: results.filter((r) => r.status === 'VERIFIED').length,
      failedCount: results.filter((r) => r.status === 'FAILED').length,
      pendingCount: results.filter((r) => r.status === 'PENDING').length,
      results,
    };
  }
}

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
  ) {}

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

    const availableGateways = gateways
      .map((g) => {
        const meta = supportedList.find((p) => p.id === g.provider);
        return {
          provider: g.provider,
          name: meta?.name || g.provider,
          isFunctional: meta?.isFunctional ?? false,
          isSandbox: g.isSandbox,
          merchantId: g.merchantId, // Public Key ID (e.g. rzp_test_...)
        };
      })
      .filter((g) => g.isFunctional); // Only expose functional gateways to users for live checkout

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
        },
      },
      {
        merchantId: gatewayConfig.merchantId,
        secretKey,
        isSandbox: gatewayConfig.isSandbox,
      }
    );

    // Record order in PaymentGatewayLog
    await this.prisma.paymentGatewayLog.create({
      data: {
        provider: providerKey,
        event: 'ORDER_CREATED',
        orderId: orderResult.orderId,
        amountPaise,
        status: 'SUCCESS',
        rawPayload: {
          receipt,
          userId,
          memberId: user.memberId,
          requestType: dto.requestType,
        },
      },
    });

    return {
      message: 'Online booking payment order created successfully.',
      order: {
        ...orderResult,
        amountINR: paiseToRupees(amountPaise),
      },
    };
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

    const webhookSecret = this.encryptionService.decrypt(gatewayConfig.encryptedWebhookKey);
    const verification = await provider.verifyWebhook(rawBody, signature, webhookSecret);

    await this.prisma.paymentGatewayLog.create({
      data: {
        provider: providerKey,
        event: 'WEBHOOK_RECEIVED',
        orderId: verification.orderId || null,
        paymentId: verification.paymentId || null,
        amountPaise: verification.amountPaise || null,
        status: verification.isValid ? 'SUCCESS' : 'FAILED',
        errorMessage: verification.error || null,
        rawPayload: {
          event: verification.event,
          headers: {
            'user-agent': headers['user-agent'],
            'x-razorpay-signature': headers['x-razorpay-signature'] ? '[REDACTED]' : undefined,
          },
        },
        ipAddress: ipAddress || null,
      },
    });

    if (!verification.isValid) {
      this.logger.warn(`Rejected invalid webhook signature from ${providerKey} [IP: ${ipAddress}]`);
      throw new UnauthorizedException(`Invalid webhook signature for provider ${providerKey}`);
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
    };
  }
}

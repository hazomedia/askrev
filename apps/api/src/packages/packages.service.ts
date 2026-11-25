import { Injectable, BadRequestException, NotFoundException, Logger, Inject, forwardRef, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InstantBinaryMatchingService } from '../members/instant-binary-matching.service';
import { LegacyMatrixService } from '../legacy-matrix/legacy-matrix.service';
import { EmailService } from '../auth/email.service';
import {
  Prisma,
  User,
  WalletAccount,
  MembershipRequestType,
  MembershipRequestStatus,
  BinaryLeg,
} from '@prisma/client';
import {
  FINANCIAL_RULES,
  MembershipPackage,
  QualificationMethod,
  UserRole,
  JournalAccount,
  paiseToRupees,
} from '@askrev/shared';
import {
  CreateMembershipRequestDto,
  QueryMembershipRequestsDto,
  ReviewMembershipRequestDto,
  UpdatePaymentConfigDto,
} from './dto/membership-request.dto';

@Injectable()
export class PackagesService {
  private readonly logger = new Logger(PackagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => InstantBinaryMatchingService))
    @Optional()
    private readonly instantBinaryMatchingService?: InstantBinaryMatchingService,
    @Optional()
    private readonly legacyMatrixService?: LegacyMatrixService,
    @Optional()
    private readonly emailService?: EmailService
  ) {}

  getAllPackages() {
    return [
      {
        id: MembershipPackage.FREE,
        name: 'Free Registration',
        priceINR: 0,
        platformFeeINR: 0,
        voucherBenefitINR: 0,
        benefits: [
          'Unique Member ID & referral link generation',
          'Access to personal member portal & profile',
          'Browse EV bikes catalog & specs',
          'No income eligibility until qualifying activation',
        ],
        directSponsorEligibility: false,
        binaryMatchingEligibility: false,
      },
      {
        id: MembershipPackage.BASIC,
        name: 'Basic Membership',
        priceINR: 3000,
        platformFeeINR: 3000,
        voucherBenefitINR: 0,
        benefits: [
          'Full activation in the sponsor network',
          'Eligible for Basic Direct Sponsor Income (₹1,000 per basic referral)',
          'Subject to 1x ₹1,000 hold reserve prior to 2nd full direct',
          'No binary matching eligibility until Full Qualified',
          'Upgrade path available to Full Membership',
        ],
        directSponsorEligibility: true,
        binaryMatchingEligibility: false,
      },
      {
        id: MembershipPackage.FULL,
        name: 'Full Membership',
        priceINR: 33000,
        platformFeeINR: 3000,
        voucherBenefitINR: 30000,
        benefits: [
          '₹30,000 Shopping Voucher included (promotional shopping liability)',
          'Immediate Full Qualification status',
          'Eligible for ₹10,000 Full Direct Sponsor Income',
          'Eligible for Binary Matching Income (1:1 ratio, ₹3,000/match)',
          'Access to high-tier EV booking voucher redemptions',
        ],
        directSponsorEligibility: true,
        binaryMatchingEligibility: true,
      },
    ];
  }

  getUpgradeOptions() {
    return [
      {
        method: QualificationMethod.UPGRADE_PAYMENT,
        name: 'Direct Fee Upgrade',
        priceINR: 30000,
        description: 'Pay ₹30,000 difference to upgrade from Basic to Full Qualified status.',
        voucherBenefitINR: 30000,
        status: 'AVAILABLE_IN_PHASE_1',
      },
      {
        method: QualificationMethod.UPGRADE_SHOPPING,
        name: 'Shopping Qualification',
        priceINR: 60000,
        description: 'Achieve ₹60,000 verified qualifying retail shopping on platform EV bikes & accessories.',
        voucherBenefitINR: 0,
        status: 'PENDING_BUSINESS_APPROVAL',
        note: 'The ₹60,000 shopping qualification rules, voucher entitlement, refund treatment, and tax implications remain configurable and pending business approval.',
      },
    ];
  }

  // =========================================================================
  // MERCHANT PAYMENT CONFIGURATION
  // =========================================================================

  async getPaymentConfig() {
    const config = await this.prisma.paymentConfig.findUnique({
      where: { configKey: 'DEFAULT_PAYMENT_CONFIG' },
    });

    const isConfigured = Boolean(config && config.isVerified && config.merchantUpiVpa && config.upiEnabled !== false);

    return {
      isConfigured,
      enabled: isConfigured,
      merchantUpiVpa: isConfigured ? config!.merchantUpiVpa : null,
      merchantName: config?.merchantName || 'ASKR EV Mobility',
      isVerified: Boolean(config?.isVerified),
      manualReviewRequired: config?.manualReviewRequired ?? true,
      pricing: {
        BASIC_ACTIVATION: 3000,
        FULL_ACTIVATION: 33000,
        BASIC_TO_FULL_UPGRADE: 30000,
      },
    };
  }

  async getAdminPaymentConfig() {
    let config = await this.prisma.paymentConfig.findUnique({
      where: { configKey: 'DEFAULT_PAYMENT_CONFIG' },
    });

    if (!config) {
      config = await this.prisma.paymentConfig.create({
        data: {
          configKey: 'DEFAULT_PAYMENT_CONFIG',
          merchantUpiVpa: null,
          merchantName: 'ASKR EV Mobility',
          isVerified: false,
          notes: 'Default merchant UPI configuration initialized.',
        },
      });
    }

    return config;
  }

  async updateAdminPaymentConfig(adminId: string, dto: UpdatePaymentConfigDto) {
    const existing = await this.prisma.paymentConfig.findUnique({
      where: { configKey: 'DEFAULT_PAYMENT_CONFIG' },
    });

    const willBeVerified = dto.isVerified !== undefined ? dto.isVerified : (existing?.isVerified ?? false);
    const verifiedAt = willBeVerified ? (existing?.verifiedAt || new Date()) : null;
    const verifiedBy = willBeVerified ? (existing?.verifiedBy || adminId) : null;

    const updated = await this.prisma.paymentConfig.upsert({
      where: { configKey: 'DEFAULT_PAYMENT_CONFIG' },
      create: {
        configKey: 'DEFAULT_PAYMENT_CONFIG',
        merchantUpiVpa: dto.merchantUpiVpa?.trim() || null,
        merchantName: dto.merchantName?.trim() || 'ASKR EV Mobility',
        isVerified: Boolean(dto.isVerified),
        verifiedAt,
        verifiedBy,
        notes: dto.notes?.trim() || null,
      },
      update: {
        merchantUpiVpa: dto.merchantUpiVpa !== undefined ? dto.merchantUpiVpa.trim() : undefined,
        merchantName: dto.merchantName !== undefined ? dto.merchantName.trim() : undefined,
        isVerified: dto.isVerified !== undefined ? dto.isVerified : undefined,
        verifiedAt,
        verifiedBy,
        notes: dto.notes !== undefined ? dto.notes.trim() : undefined,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: 'PAYMENT_CONFIG_UPDATED',
        entityType: 'PAYMENT_CONFIG',
        entityId: updated.id,
        metadata: {
          merchantUpiVpa: updated.merchantUpiVpa,
          merchantName: updated.merchantName,
          isVerified: updated.isVerified,
          complianceMode: 'SIMULATION_ONLY',
        },
      },
    });

    return updated;
  }

  // =========================================================================
  // PHASE 3A: MEMBERSHIP ACTIVATION & UPGRADE REQUESTS
  // =========================================================================

  /**
   * Fail-closed environment identity and compliance guard for synthetic payments & references.
   * Strictly forbids synthetic references in Production regardless of compliance mode.
   * Requires BOTH explicit isolated UAT/staging identity AND COMPLIANCE_MODE === 'SIMULATION_ONLY'.
   */
  private assertUatSimulationEnvironmentForPayment(paymentRef?: string, paymentMode?: string): void {
    const appEnv = (process.env.APP_ENV || '').toLowerCase();
    const nodeEnv = (process.env.NODE_ENV || '').toLowerCase();
    const railwayEnv = (process.env.RAILWAY_ENVIRONMENT_NAME || '').toLowerCase();
    const vercelEnv = (process.env.VERCEL_ENV || '').toLowerCase();
    const dbUrl = process.env.DATABASE_URL || '';
    const complianceMode = process.env.COMPLIANCE_MODE;

    // 1. Strict Production Detection: If ANY indicator points to Production, reject synthetic/simulation unconditionally
    const isProduction =
      appEnv === 'production' ||
      railwayEnv === 'production' ||
      vercelEnv === 'production' ||
      dbUrl.includes('trolley.proxy.rlwy.net:41036') ||
      (nodeEnv === 'production' && appEnv !== 'staging' && appEnv !== 'uat' && process.env.IS_UAT !== 'true');

    if (isProduction) {
      throw new BadRequestException(
        'Synthetic payment simulation and synthetic references are strictly prohibited in the Production environment.'
      );
    }

    // 2. Strict Isolated UAT/Test Verification: Must have an explicit non-production/UAT environment indicator
    const isExplicitUat =
      appEnv === 'staging' ||
      appEnv === 'uat' ||
      process.env.IS_UAT === 'true' ||
      railwayEnv === 'staging' ||
      nodeEnv === 'test' ||
      nodeEnv === 'development' ||
      dbUrl.includes('nozomi.proxy.rlwy.net:28651');

    if (!isExplicitUat) {
      throw new BadRequestException(
        'Synthetic payment simulation is strictly prohibited outside the approved isolated UAT simulation environment.'
      );
    }

    // 3. Strict Compliance Mode: Must be explicitly set to SIMULATION_ONLY (no fallback default)
    if (complianceMode !== 'SIMULATION_ONLY') {
      throw new BadRequestException(
        'Synthetic payment simulation requires COMPLIANCE_MODE=SIMULATION_ONLY.'
      );
    }
  }

  async createMembershipRequest(userId: string, dto: CreateMembershipRequestDto) {
    return await this.prisma.$transaction(async (tx) => {
      // Lock the User row inside the transaction to serialize concurrent request submissions
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;

      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { wallet: true },
      });

      if (!user) {
        throw new NotFoundException('Member not found');
      }

      // Determine expected fee in paise
      let expectedFeePaise: bigint;
      switch (dto.requestType) {
        case MembershipRequestType.BASIC_ACTIVATION:
          if (user.currentPackage !== MembershipPackage.FREE) {
            throw new BadRequestException('Basic Activation is only available for Free accounts.');
          }
          expectedFeePaise = FINANCIAL_RULES.BASIC_MEMBERSHIP_PRICE_PAISE; // ₹3,000
          break;

        case MembershipRequestType.FULL_ACTIVATION:
          if (user.currentPackage !== MembershipPackage.FREE) {
            throw new BadRequestException('Direct Full Activation is only available for Free accounts.');
          }
          expectedFeePaise = FINANCIAL_RULES.FULL_MEMBERSHIP_PRICE_PAISE; // ₹33,000
          break;

        case MembershipRequestType.BASIC_TO_FULL_UPGRADE:
          if (user.currentPackage !== MembershipPackage.BASIC) {
            throw new BadRequestException('Upgrade is only available for active Basic members.');
          }
          if (user.isFullQualified) {
            throw new BadRequestException('Member is already Full Qualified.');
          }
          expectedFeePaise = FINANCIAL_RULES.UPGRADE_PAYMENT_PRICE_PAISE; // ₹30,000
          break;

        default:
          throw new BadRequestException(`Unsupported request type: ${dto.requestType}`);
      }

      // Check Idempotency Key if provided
      if (dto.idempotencyKey) {
        const existingKey = await tx.membershipRequest.findUnique({
          where: { idempotencyKey: dto.idempotencyKey },
        });
        if (existingKey) {
          return {
            message: 'Idempotent replay: Request already exists.',
            request: {
              ...existingKey,
              feeINR: paiseToRupees(existingKey.feePaise),
            },
          };
        }
      }

      // Check if user already has a pending request
      const pendingRequest = await tx.membershipRequest.findFirst({
        where: {
          userId,
          status: MembershipRequestStatus.PENDING,
        },
      });

      if (pendingRequest) {
        throw new BadRequestException(
          'You already have a pending membership activation/upgrade request under administrative review.'
        );
      }

      // Payment mode validation & UTR checks
      const paymentMode = dto.paymentMode || 'SIMULATED_TEST';
      let cleanPaymentRef: string;
      let verifiedMerchantVpa: string | null = null;

      if (paymentMode === 'UPI') {
        // 1. Verify merchant UPI VPA is configured and verified by administration
        const paymentConfig = await tx.paymentConfig.findUnique({
          where: { configKey: 'DEFAULT_PAYMENT_CONFIG' },
        });

        if (!paymentConfig || !paymentConfig.isVerified || !paymentConfig.merchantUpiVpa || paymentConfig.upiEnabled === false) {
          throw new BadRequestException(
            'Merchant UPI payment is currently disabled or pending administrator verification. Please select another payment method or contact support.'
          );
        }
        verifiedMerchantVpa = paymentConfig.merchantUpiVpa;

        // 2. Validate UTR format (12-digit numeric or 12-22 alphanumeric standard banking reference)
        const rawRef = dto.paymentReference?.trim().toUpperCase();
        const utrRegex = /^([0-9]{12}|[A-Z0-9]{12,22})$/;
        const isSynthetic = /^([A-Z0-9_-]*(SIM|TEST)[A-Z0-9_-]*)$/i.test(rawRef || '');
        if (isSynthetic) {
          this.assertUatSimulationEnvironmentForPayment(rawRef, paymentMode);
        } else if (!rawRef || !utrRegex.test(rawRef)) {
          throw new BadRequestException(
            'Invalid payment reference / UTR format. Standard UPI reference must be a 12-digit numeric or 12-22 alphanumeric transaction reference.'
          );
        }
        cleanPaymentRef = rawRef;

        // 3. Prevent duplicate payment references across pending or approved Membership Requests
        const duplicateRequest = await tx.membershipRequest.findFirst({
          where: {
            paymentReference: cleanPaymentRef,
            status: { in: [MembershipRequestStatus.PENDING, MembershipRequestStatus.APPROVED] },
          },
        });
        if (duplicateRequest) {
          throw new BadRequestException(
            'This payment reference / UTR has already been submitted for another membership request.'
          );
        }

        // 4. Prevent duplicate payment references across EV Bookings
        const duplicateBooking = await tx.evBooking.findFirst({
          where: {
            paymentReference: cleanPaymentRef,
            bookingStatus: { not: 'CANCELLED' },
          },
        });
        if (duplicateBooking) {
          throw new BadRequestException(
            'This payment reference / UTR has already been used for an EV vehicle booking.'
          );
        }
      } else {
        this.assertUatSimulationEnvironmentForPayment(dto.paymentReference, paymentMode);
        cleanPaymentRef =
          dto.paymentReference?.trim().toUpperCase() ||
          `SIM-REF-${Date.now().toString().slice(-8)}-${Math.floor(100 + Math.random() * 900)}`;
      }

      // Build clean metadata without any hardcoded UPI IDs
      const cleanMetadata: Record<string, any> = {
        compliance: 'SIMULATION_ONLY',
        source: 'member_portal',
        ...(dto.metadata ? { ...dto.metadata } : {}),
      };
      delete cleanMetadata.upiId;
      if (verifiedMerchantVpa) {
        cleanMetadata.verifiedMerchantVpa = verifiedMerchantVpa;
      }

      const request = await tx.membershipRequest.create({
        data: {
          userId,
          requestType: dto.requestType,
          feePaise: expectedFeePaise,
          paymentMode,
          paymentReference: cleanPaymentRef,
          idempotencyKey: dto.idempotencyKey || null,
          isSimulated: true,
          status: MembershipRequestStatus.PENDING,
          metadata: cleanMetadata,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'MEMBERSHIP_REQUEST_SUBMITTED',
          entityType: 'MEMBERSHIP_REQUEST',
          entityId: request.id,
          metadata: {
            requestType: request.requestType,
            feeINR: paiseToRupees(request.feePaise),
            paymentMode: request.paymentMode,
            complianceMode: 'SIMULATION_ONLY',
          },
        },
      });

      return {
        message: 'Membership request submitted successfully for administrative simulation review.',
        request: {
          ...request,
          feeINR: paiseToRupees(request.feePaise),
        },
      };
    }, { timeout: 30000, maxWait: 10000 });
  }

  async getMyMembershipRequests(userId: string) {
    const requests = await this.prisma.membershipRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return requests.map((req) => ({
      ...req,
      feeINR: paiseToRupees(req.feePaise),
    }));
  }

  async getAdminMembershipRequests(query: QueryMembershipRequestsDto) {
    const where: Prisma.MembershipRequestWhereInput = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.requestType) {
      where.requestType = query.requestType;
    }

    const requests = await this.prisma.membershipRequest.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            memberId: true,
            fullName: true,
            email: true,
            currentPackage: true,
            isFullQualified: true,
            sponsor: {
              select: {
                id: true,
                memberId: true,
                fullName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests.map((req) => ({
      ...req,
      feeINR: paiseToRupees(req.feePaise),
    }));
  }

  // =========================================================================
  // ADMIN REVIEW: SIMULATED APPROVAL / REJECTION & ATOMIC SPONSOR SETTLEMENT
  // =========================================================================

  async approveMembershipRequest(
    requestId: string,
    adminId: string | { id?: string; email?: string },
    dto?: ReviewMembershipRequestDto
  ) {
    const reviewerId =
      typeof adminId === 'object' && adminId !== null
        ? adminId.id || adminId.email || 'SUPER_ADMIN'
        : String(adminId || 'SUPER_ADMIN');
    const pendingImmediateAncestors: string[] = [];

    const result = await this.prisma.$transaction(async (tx) => {
      const req = await tx.membershipRequest.findUnique({
        where: { id: requestId },
        include: {
          user: {
            include: {
              sponsor: {
                include: { wallet: true },
              },
              wallet: true,
            },
          },
        },
      });

      if (!req) {
        throw new NotFoundException('Membership request not found');
      }

      // Lock the membership request row to serialize concurrent approvals/rejections
      const lockedReq = await tx.$queryRaw<any[]>`
        SELECT id, status FROM "MembershipRequest" WHERE id = ${requestId} FOR UPDATE
      `;
      if (!lockedReq || lockedReq.length === 0) {
        throw new NotFoundException('Membership request not found');
      }

      if (lockedReq[0].status !== MembershipRequestStatus.PENDING) {
        throw new BadRequestException(
          `Request cannot be approved because current status is: ${lockedReq[0].status}`
        );
      }

      const user = req.user;
      if (!user) {
        throw new BadRequestException('Associated member record was not found');
      }

      // Lock member and sponsor User rows in deterministic order to serialize concurrent
      // membership qualifications with binary placements and avoid deadlocks.
      const lockUserIds = Array.from(
        new Set([user.id, ...(user.sponsor ? [user.sponsor.id] : [])])
      ).sort();
      let previouslyFullQualified = user.isFullQualified;
      for (const uid of lockUserIds) {
        const rows = await tx.$queryRaw<Array<{ id: string; isFullQualified: boolean }>>`
          SELECT id, "isFullQualified" FROM "User" WHERE id = ${uid} FOR UPDATE
        `;
        if (uid === user.id && rows.length > 0) {
          previouslyFullQualified = Boolean(rows[0].isFullQualified);
        }
      }

      // 1. Mark request as APPROVED
      const updatedRequest = await tx.membershipRequest.update({
        where: { id: requestId },
        data: {
          status: MembershipRequestStatus.APPROVED,
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
          adminNotes: dto?.adminNotes || 'Approved in compliance simulation mode',
        },
      });

      // Ensure user has a wallet
      if (!user.wallet) {
        await tx.walletAccount.create({
          data: { userId: user.id },
        });
      }

      let qualificationMethod: QualificationMethod | null = null;
      let voucherIssuedPaise = 0n;

      // 2. Process Member Package & Fee Journal
      if (req.requestType === MembershipRequestType.BASIC_ACTIVATION) {
        if (
          user.currentPackage === MembershipPackage.BASIC ||
          user.currentPackage === MembershipPackage.FULL
        ) {
          throw new BadRequestException(
            `Member ${user.memberId} has already been activated to ${user.currentPackage}. Duplicate activation is not permitted.`
          );
        }

        await tx.user.update({
          where: { id: user.id },
          data: {
            currentPackage: MembershipPackage.BASIC,
            role: UserRole.MEMBER,
          },
        });

        // Double-entry: Basic Joining Fee (₹3,000)
        await tx.journalEntry.create({
          data: {
            referenceId: `JNL-REQ-${req.id}`,
            eventType: 'MEMBERSHIP_BASIC_ACTIVATION',
            narration: `Simulated basic membership activation fee for ${user.fullName} (${user.memberId})`,
            lines: {
              create: [
                {
                  account: JournalAccount.CASH_AND_BANK,
                  userId: user.id,
                  debitPaise: FINANCIAL_RULES.BASIC_MEMBERSHIP_PRICE_PAISE,
                  creditPaise: 0n,
                  description: `Simulated joining fee received from ${user.fullName}`,
                },
                {
                  account: JournalAccount.PLATFORM_JOINING_REVENUE,
                  userId: null,
                  debitPaise: 0n,
                  creditPaise: FINANCIAL_RULES.BASIC_MEMBERSHIP_PRICE_PAISE,
                  description: `Platform joining revenue recognized for ${user.fullName}`,
                },
              ],
            },
          },
        });

        // Feature 5: Grant Member's ₹3,000 Shopping Voucher (Additional Shopping Voucher)
        const basicVoucherGrantPaise = FINANCIAL_RULES.BASIC_MEMBERSHIP_PRICE_PAISE; // ₹3,000 (300,000 paise)
        const existingBasicVoucher = await tx.shoppingVoucher.findFirst({
          where: {
            userId: user.id,
            issuedReason: 'BASIC_MEMBERSHIP_ACTIVATION_GRANT',
          },
        });

        if (!existingBasicVoucher) {
          const basicVoucherCode = `VCHR-BSC-${Date.now().toString().slice(-8)}-${Math.floor(1000 + Math.random() * 9000)}`;

          const basicVoucher = await tx.shoppingVoucher.create({
            data: {
              voucherCode: basicVoucherCode,
              userId: user.id,
              initialValuePaise: basicVoucherGrantPaise,
              remainingBalancePaise: basicVoucherGrantPaise,
              issuedReason: 'BASIC_MEMBERSHIP_ACTIVATION_GRANT',
              category: 'ADDITIONAL_SHOPPING_VOUCHER',
              emailSent: false, // Sandbox logged only, not live delivered
              emailSentAt: null,
              status: 'ACTIVE',
              expiresAt: new Date('2099-12-31T23:59:59.999Z'),
            },
          });

          if (this.emailService && user.email) {
            await this.emailService.sendVoucherNotification(
              user.email,
              user.fullName,
              {
                voucherCode: basicVoucherCode,
                category: 'ADDITIONAL_SHOPPING_VOUCHER',
                valueINR: paiseToRupees(basicVoucherGrantPaise),
                expiresAt: '2099-12-31',
              }
            );

            await tx.auditLog.create({
              data: {
                actorId: user.id,
                action: 'VOUCHER_EMAIL_NOTIFICATION',
                entityType: 'ShoppingVoucher',
                entityId: basicVoucher.id,
                metadata: {
                  deliveryStatus: 'SANDBOX_LOGGED',
                  recipientEmail: user.email,
                  voucherCode: basicVoucherCode,
                  category: 'ADDITIONAL_SHOPPING_VOUCHER',
                  loggedAt: new Date().toISOString(),
                },
              },
            });
          }

          await tx.walletAccount.update({
            where: { userId: user.id },
            data: {
              shoppingVoucherBalancePaise: { increment: basicVoucherGrantPaise },
            },
          });

          // Double-entry: Basic Voucher Liability
          await tx.journalEntry.create({
            data: {
              referenceId: `JNL-VCHR-BSC-${req.id}`,
              eventType: 'BASIC_VOUCHER_LIABILITY',
              narration: `Simulated ₹3,000 shopping voucher issued to basic member ${user.fullName} (${user.memberId})`,
              lines: {
                create: [
                  {
                    account: JournalAccount.SHOPPING_VOUCHER_PROMO_EXPENSE,
                    userId: null,
                    debitPaise: basicVoucherGrantPaise,
                    creditPaise: 0n,
                    description: `Promotional voucher incentive expense for basic member ${user.memberId}`,
                  },
                  {
                    account: JournalAccount.SHOPPING_VOUCHER_LIABILITY,
                    userId: user.id,
                    debitPaise: 0n,
                    creditPaise: basicVoucherGrantPaise,
                    description: `Voucher liability recorded for basic member ${user.memberId}`,
                  },
                ],
              },
            },
          });
        }
      } else if (req.requestType === MembershipRequestType.FULL_ACTIVATION) {
        qualificationMethod = QualificationMethod.DIRECT_FULL;
        voucherIssuedPaise = FINANCIAL_RULES.FULL_VOUCHER_GRANT_PAISE; // ₹30,000

        await tx.user.update({
          where: { id: user.id },
          data: {
            currentPackage: MembershipPackage.FULL,
            role: UserRole.MEMBER,
            isFullQualified: true,
            qualificationMethod,
            qualificationDate: new Date(),
          },
        });

        // Grant Member's ₹30,000 Shopping Voucher (EV Vehicle Voucher)
        const voucherCode = `VCHR-MBR-${Date.now().toString().slice(-8)}-${Math.floor(1000 + Math.random() * 9000)}`;
        const fullVoucher = await tx.shoppingVoucher.create({
          data: {
            voucherCode,
            userId: user.id,
            initialValuePaise: voucherIssuedPaise,
            remainingBalancePaise: voucherIssuedPaise,
            issuedReason: 'FULL_MEMBERSHIP_ACTIVATION_GRANT',
            category: 'EV_VEHICLE_VOUCHER',
            emailSent: false, // Sandbox logged only, not live delivered
            emailSentAt: null,
            status: 'ACTIVE',
            expiresAt: new Date('2099-12-31T23:59:59.999Z'), // Pending approved business policy, vouchers do not automatically expire
          },
        });

        if (this.emailService && user.email) {
          await this.emailService.sendVoucherNotification(user.email, user.fullName, {
            voucherCode,
            category: 'EV_VEHICLE_VOUCHER',
            valueINR: paiseToRupees(voucherIssuedPaise),
            expiresAt: '2099-12-31',
          });

          await tx.auditLog.create({
            data: {
              actorId: user.id,
              action: 'VOUCHER_EMAIL_NOTIFICATION',
              entityType: 'ShoppingVoucher',
              entityId: fullVoucher.id,
              metadata: {
                deliveryStatus: 'SANDBOX_LOGGED',
                recipientEmail: user.email,
                voucherCode,
                category: 'EV_VEHICLE_VOUCHER',
                loggedAt: new Date().toISOString(),
              },
            },
          });
        }

        await tx.walletAccount.update({
          where: { userId: user.id },
          data: {
            shoppingVoucherBalancePaise: { increment: voucherIssuedPaise },
          },
        });

        // Double-entry: Full Activation (₹33,000 = ₹3k platform fee + ₹30k voucher liability)
        await tx.journalEntry.create({
          data: {
            referenceId: `JNL-REQ-${req.id}`,
            eventType: 'MEMBERSHIP_FULL_ACTIVATION',
            narration: `Simulated full membership activation fee for ${user.fullName} (${user.memberId})`,
            lines: {
              create: [
                {
                  account: JournalAccount.CASH_AND_BANK,
                  userId: user.id,
                  debitPaise: FINANCIAL_RULES.FULL_MEMBERSHIP_PRICE_PAISE,
                  creditPaise: 0n,
                  description: `Joining payment received from ${user.fullName}`,
                },
                {
                  account: JournalAccount.PLATFORM_JOINING_REVENUE,
                  userId: null,
                  debitPaise: 0n,
                  creditPaise: FINANCIAL_RULES.FULL_PLATFORM_FEE_PAISE,
                  description: `Platform fee recognized for ${user.fullName}`,
                },
                {
                  account: JournalAccount.SHOPPING_VOUCHER_LIABILITY,
                  userId: user.id,
                  debitPaise: 0n,
                  creditPaise: FINANCIAL_RULES.FULL_VOUCHER_GRANT_PAISE,
                  description: `Shopping voucher liability issued to ${user.fullName}`,
                },
              ],
            },
          },
        });
      } else if (req.requestType === MembershipRequestType.BASIC_TO_FULL_UPGRADE) {
        qualificationMethod = QualificationMethod.UPGRADE_PAYMENT;
        voucherIssuedPaise = FINANCIAL_RULES.FULL_VOUCHER_GRANT_PAISE; // ₹30,000

        await tx.user.update({
          where: { id: user.id },
          data: {
            currentPackage: MembershipPackage.FULL,
            isFullQualified: true,
            qualificationMethod,
            qualificationDate: new Date(),
          },
        });

        // Grant Member's ₹30,000 Shopping Voucher (EV Vehicle Voucher)
        const voucherCode = `VCHR-MBR-${Date.now().toString().slice(-8)}-${Math.floor(1000 + Math.random() * 9000)}`;
        const upgradeVoucher = await tx.shoppingVoucher.create({
          data: {
            voucherCode,
            userId: user.id,
            initialValuePaise: voucherIssuedPaise,
            remainingBalancePaise: voucherIssuedPaise,
            issuedReason: 'UPGRADE_PAYMENT_GRANT',
            category: 'EV_VEHICLE_VOUCHER',
            emailSent: false, // Sandbox logged only, not live delivered
            emailSentAt: null,
            status: 'ACTIVE',
            expiresAt: new Date('2099-12-31T23:59:59.999Z'), // Pending approved business policy, vouchers do not automatically expire
          },
        });

        if (this.emailService && user.email) {
          await this.emailService.sendVoucherNotification(user.email, user.fullName, {
            voucherCode,
            category: 'EV_VEHICLE_VOUCHER',
            valueINR: paiseToRupees(voucherIssuedPaise),
            expiresAt: '2099-12-31',
          });

          await tx.auditLog.create({
            data: {
              actorId: user.id,
              action: 'VOUCHER_EMAIL_NOTIFICATION',
              entityType: 'ShoppingVoucher',
              entityId: upgradeVoucher.id,
              metadata: {
                deliveryStatus: 'SANDBOX_LOGGED',
                recipientEmail: user.email,
                voucherCode,
                category: 'EV_VEHICLE_VOUCHER',
                loggedAt: new Date().toISOString(),
              },
            },
          });
        }

        await tx.walletAccount.update({
          where: { userId: user.id },
          data: {
            shoppingVoucherBalancePaise: { increment: voucherIssuedPaise },
          },
        });

        // Double-entry: Basic-to-Full Upgrade (₹30,000 = ₹30k voucher liability)
        await tx.journalEntry.create({
          data: {
            referenceId: `JNL-REQ-${req.id}`,
            eventType: 'MEMBERSHIP_UPGRADE_PAYMENT',
            narration: `Simulated basic-to-full upgrade fee for ${user.fullName} (${user.memberId})`,
            lines: {
              create: [
                {
                  account: JournalAccount.CASH_AND_BANK,
                  userId: user.id,
                  debitPaise: FINANCIAL_RULES.UPGRADE_PAYMENT_PRICE_PAISE,
                  creditPaise: 0n,
                  description: `Upgrade payment received from ${user.fullName}`,
                },
                {
                  account: JournalAccount.SHOPPING_VOUCHER_LIABILITY,
                  userId: user.id,
                  debitPaise: 0n,
                  creditPaise: FINANCIAL_RULES.FULL_VOUCHER_GRANT_PAISE,
                  description: `Shopping voucher liability issued to ${user.fullName}`,
                },
              ],
            },
          },
        });

        // Feature 4 Case D: Release all qualifying held sponsor bonuses for this upgrading sponsor
        const qualifyingHolds = await tx.commissionHold.findMany({
          where: {
            sponsorId: user.id,
            status: 'HELD',
            reason: { in: ['BASIC_SPONSOR_DIRECT_UPGRADE', 'BASIC_SPONSOR_DIRECT_FULL'] },
          },
        });

        const totalHoldToRelease = qualifyingHolds.reduce((acc, h) => acc + h.heldAmountPaise, 0n);

        if (totalHoldToRelease > 0n) {
          await tx.walletAccount.update({
            where: { userId: user.id },
            data: {
              heldCommissionsPaise: { decrement: totalHoldToRelease },
              availableEarningsPaise: { increment: totalHoldToRelease },
              totalEarnedPaise: { increment: totalHoldToRelease },
            },
          });

          for (const hold of qualifyingHolds) {
            await tx.commissionHold.update({
              where: { id: hold.id },
              data: {
                status: 'RELEASED',
                releasedAt: new Date(),
                releaseTransactionId: `JNL-HOLD-REL-UPG-${req.id}-${hold.id.slice(0, 8)}`,
              },
            });
          }

          await tx.journalEntry.create({
            data: {
              referenceId: `JNL-HOLD-REL-UPG-${req.id}`,
              eventType: 'SPONSOR_UPGRADE_HOLD_RELEASE',
              narration: `Simulated release of ₹${paiseToRupees(totalHoldToRelease)} held sponsor bonus upon upgrading to FULL for ${user.fullName} (${user.memberId})`,
              lines: {
                create: [
                  {
                    account: JournalAccount.COMMISSION_HOLD_RESERVE,
                    userId: user.id,
                    debitPaise: totalHoldToRelease,
                    creditPaise: 0n,
                    description: `Release of held sponsor bonuses upon upgrading to FULL`,
                  },
                  {
                    account: JournalAccount.MEMBER_EARNINGS_PAYABLE,
                    userId: user.id,
                    debitPaise: 0n,
                    creditPaise: totalHoldToRelease,
                    description: `Earnings payable credited to ${user.fullName} from released held sponsor bonuses`,
                  },
                ],
              },
            },
          });
        }
      }

      // 3. PHASE 3B: ATOMIC SPONSOR COMMISSION ENGINE
      let sponsorSettlementResult = null;
      if (user.sponsor) {
        sponsorSettlementResult = await this.settleSponsorCommissionInTx(tx, {
          sponsor: user.sponsor,
          referredUser: user,
          requestType: req.requestType,
          requestId: req.id,
          feePaise: req.feePaise,
        });
      }

      // 3b. PHASE 3C & FEATURES 1 & 2: BINARY & LEGACY MATRIX PLACEMENT
      let binaryPlacementResult: any = null;
      if (req.requestType === MembershipRequestType.BASIC_ACTIVATION) {
        // Feature 2: Place BASIC member in binary tree (count only, 0 volume)
        const existingPlacement = await tx.binaryPlacement.findUnique({
          where: { userId: user.id },
        });

        if (!existingPlacement || !existingPlacement.parentId) {
          const autoRes = await this.autoPlaceMemberInBinaryTree(tx, user, false);
          binaryPlacementResult = autoRes;
        }

        // Feature 1: Place in Global 3x8 Legacy Matrix
        if (this.legacyMatrixService) {
          await this.legacyMatrixService.placeMemberInMatrix(user.id, tx);
        }
      } else if (
        (req.requestType === MembershipRequestType.FULL_ACTIVATION ||
          req.requestType === MembershipRequestType.BASIC_TO_FULL_UPGRADE) &&
        !previouslyFullQualified
      ) {
        const existingPlacement = await tx.binaryPlacement.findUnique({
          where: { userId: user.id },
        });

        if (existingPlacement && existingPlacement.parentId && existingPlacement.leg) {
          const ancestors = await this.propagateBinaryVolumeOnFullQualification(tx, user.id);
          pendingImmediateAncestors.push(...ancestors);
          binaryPlacementResult = {
            action: 'VOLUME_PROPAGATED',
            parentId: existingPlacement.parentId,
            leg: existingPlacement.leg,
            affectedAncestors: ancestors,
          };
        } else {
          const autoRes = await this.autoPlaceMemberInBinaryTree(tx, user, true);
          if (autoRes?.affectedAncestors) {
            pendingImmediateAncestors.push(...autoRes.affectedAncestors);
          }
          binaryPlacementResult = autoRes;
        }

        // Feature 1: Place in Global 3x8 Legacy Matrix
        if (this.legacyMatrixService) {
          await this.legacyMatrixService.placeMemberInMatrix(user.id, tx);
        }
      }

      // 4. Record Administrative Audit Log
      await tx.auditLog.create({
        data: {
          actorId: reviewerId,
          action: 'APPROVE_MEMBERSHIP_REQUEST',
          entityType: 'MEMBERSHIP_REQUEST',
          entityId: req.id,
          metadata: {
            requestType: req.requestType,
            memberId: user.memberId,
            isSimulated: true,
            complianceMode: 'SIMULATION_ONLY',
            sponsorSettlement: sponsorSettlementResult,
            binaryPlacement: binaryPlacementResult,
          },
        },
      });

      return {
        message: `Simulated approval completed for ${req.requestType}`,
        requestId: req.id,
        status: MembershipRequestStatus.APPROVED,
        member: {
          id: user.id,
          memberId: user.memberId,
          fullName: user.fullName,
          currentPackage:
            req.requestType === MembershipRequestType.BASIC_ACTIVATION
              ? MembershipPackage.BASIC
              : MembershipPackage.FULL,
          isFullQualified: req.requestType !== MembershipRequestType.BASIC_ACTIVATION,
          qualificationMethod,
        },
        sponsorSettlement: sponsorSettlementResult,
        binaryPlacement: binaryPlacementResult,
      };
    }, { timeout: 30000, maxWait: 10000 });

    // Trigger instant matching evaluation post-commit
    if (pendingImmediateAncestors.length > 0 && this.instantBinaryMatchingService) {
      try {
        await this.instantBinaryMatchingService.processOutboxImmediate(pendingImmediateAncestors);
      } catch (err: any) {
        this.logger.error(`Error in instant binary matching outbox processing: ${err.message}`, err.stack);
      }
    }

    return result;
  }

  async rejectMembershipRequest(
    requestId: string,
    adminId: string | { id?: string; email?: string },
    dto?: ReviewMembershipRequestDto
  ) {
    const reviewerId =
      typeof adminId === 'object' && adminId !== null
        ? adminId.id || adminId.email || 'SUPER_ADMIN'
        : String(adminId || 'SUPER_ADMIN');

    return await this.prisma.$transaction(async (tx) => {
      const req = await tx.membershipRequest.findUnique({
        where: { id: requestId },
        include: { user: true },
      });

      if (!req) {
        throw new NotFoundException('Membership request not found');
      }

      // Lock the membership request row to serialize concurrent actions
      const lockedReq = await tx.$queryRaw<any[]>`
        SELECT id, status FROM "MembershipRequest" WHERE id = ${requestId} FOR UPDATE
      `;
      if (!lockedReq || lockedReq.length === 0) {
        throw new NotFoundException('Membership request not found');
      }

      if (lockedReq[0].status !== MembershipRequestStatus.PENDING) {
        throw new BadRequestException(
          `Request cannot be rejected because current status is: ${lockedReq[0].status}`
        );
      }

      const updated = await tx.membershipRequest.update({
        where: { id: requestId },
        data: {
          status: MembershipRequestStatus.REJECTED,
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
          adminNotes: dto?.adminNotes || 'Request rejected by administrative simulation review',
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: reviewerId,
          action: 'REJECT_MEMBERSHIP_REQUEST',
          entityType: 'MEMBERSHIP_REQUEST',
          entityId: req.id,
          metadata: {
            requestType: req.requestType,
            memberId: req.user?.memberId,
            notes: dto?.adminNotes,
            complianceMode: 'SIMULATION_ONLY',
          },
        },
      });

      return {
        message: 'Membership request has been rejected',
        status: MembershipRequestStatus.REJECTED,
        request: {
          ...updated,
          feeINR: paiseToRupees(updated.feePaise),
        },
      };
    }, { timeout: 30000, maxWait: 10000 });
  }

  // =========================================================================
  // PHASE 3B: SPONSOR COMMISSION SETTLEMENT ENGINE (IN-TRANSACTION)
  // =========================================================================

  async settleSponsorCommissionInTx(
    tx: Prisma.TransactionClient,
    params: {
      sponsor: User & { wallet: WalletAccount | null };
      referredUser: User;
      requestType: MembershipRequestType;
      requestId: string;
      feePaise: bigint;
    }
  ) {
    // Refresh sponsor wallet inside the transaction after acquiring the User FOR UPDATE lock
    let sponsorWallet = await tx.walletAccount.findUnique({
      where: { userId: params.sponsor.id },
    });
    if (!sponsorWallet) {
      sponsorWallet = await tx.walletAccount.create({
        data: { userId: params.sponsor.id },
      });
    }

    // -----------------------------------------------------------------------
    // SCENARIO 1: BASIC ACTIVATION
    // -----------------------------------------------------------------------
    if (params.requestType === MembershipRequestType.BASIC_ACTIVATION) {
      const basicSponsorHoldKey = `SPON-BASIC-HOLD-${params.sponsor.id}-${params.referredUser.id}`;
      const basicSponsorRelKey = `SPON-BASIC-REL-${params.sponsor.id}-${params.referredUser.id}`;
      const legacyHoldKey = `JNL-HOLD-${params.requestId}`;
      const legacyRelKey = `JNL-REL-${params.requestId}`;
      const uniqueBusinessEventKey = `SPONSOR_BONUS_${params.sponsor.id}_${params.referredUser.id}_BASIC`;

      // 1. Transaction-level Idempotency Guard: Check if sponsor bonus was ALREADY settled for this referred member
      const existingBasicJournal = await tx.journalEntry.findFirst({
        where: {
          referenceId: {
            in: [
              basicSponsorHoldKey,
              basicSponsorRelKey,
              uniqueBusinessEventKey,
              legacyHoldKey,
              legacyRelKey,
            ],
          },
        },
        select: { id: true, referenceId: true, eventType: true },
      });

      if (existingBasicJournal) {
        return {
          sponsorMemberId: params.sponsor.memberId,
          action:
            existingBasicJournal.eventType === 'BASIC_SPONSOR_COMMISSION_HELD'
              ? 'COMMISSION_HELD'
              : 'COMMISSION_RELEASED_TO_WALLET',
          amountINR: paiseToRupees(FINANCIAL_RULES.BASIC_SPONSOR_COMMISSION_PAISE),
          idempotentReplay: true,
          reason: 'Basic direct sponsor bonus already settled for this referred member',
        };
      }

      // Check if a hold record already exists for this sponsor and referred member
      const existingHold = await tx.commissionHold.findFirst({
        where: {
          sponsorId: params.sponsor.id,
          referredMemberId: params.referredUser.id,
        },
      });
      if (existingHold) {
        return {
          sponsorMemberId: params.sponsor.memberId,
          action: 'COMMISSION_HELD',
          amountINR: paiseToRupees(FINANCIAL_RULES.BASIC_SPONSOR_COMMISSION_PAISE),
          idempotentReplay: true,
          reason: 'Basic direct sponsor hold already exists for this referred member',
        };
      }

      const fullDirectsCount = await tx.user.count({
        where: {
          sponsorId: params.sponsor.id,
          isFullQualified: true,
          id: { not: params.referredUser.id },
        },
      });

      // Count prior approved ₹3,000 Basic direct activations for this sponsor,
      // preserving historical order even if an earlier Basic direct later upgraded to Full.
      const priorBasicActivations = await tx.membershipRequest.findMany({
        where: {
          requestType: MembershipRequestType.BASIC_ACTIVATION,
          status: MembershipRequestStatus.APPROVED,
          id: { not: params.requestId },
          userId: { not: params.referredUser.id },
          user: {
            sponsorId: params.sponsor.id,
          },
        },
        select: { userId: true },
        distinct: ['userId'],
      });
      const basicActivationOrder = priorBasicActivations.length + 1;

      // Approved Basic Direct Reserve Rule:
      // - 1st Basic Direct (order === 1): ₹1,000 RELEASED immediately
      // - 2nd Basic Direct (order === 2): ₹1,000 HELD prior to 2nd Full Qualified direct
      // - 3rd+ Basic Direct (order >= 3): ₹1,000 RELEASED
      const shouldHold =
        basicActivationOrder === 2 &&
        fullDirectsCount < 2 &&
        sponsorWallet.heldCommissionsPaise < FINANCIAL_RULES.BASIC_HOLD_RESERVE_TARGET_PAISE;

      if (shouldHold) {
        await tx.walletAccount.update({
          where: { userId: params.sponsor.id },
          data: {
            heldCommissionsPaise: { increment: FINANCIAL_RULES.BASIC_SPONSOR_COMMISSION_PAISE },
          },
        });

        await tx.commissionHold.create({
          data: {
            sponsorId: params.sponsor.id,
            referredMemberId: params.referredUser.id,
            heldAmountPaise: FINANCIAL_RULES.BASIC_SPONSOR_COMMISSION_PAISE,
            reason: 'BASIC_2ND_DIRECT_HOLD_RESERVE',
            status: 'HELD',
          },
        });

        // Journal: Commission Hold (Enforcing unique business event referenceId)
        await tx.journalEntry.create({
          data: {
            referenceId: basicSponsorHoldKey,
            eventType: 'BASIC_SPONSOR_COMMISSION_HELD',
            narration: `Simulated ₹1,000 hold reserve for sponsor ${params.sponsor.memberId} from ${params.referredUser.fullName}'s 2nd Basic direct activation`,
            lines: {
              create: [
                {
                  account: JournalAccount.DIRECT_SPONSOR_COMMISSION_EXPENSE,
                  userId: null,
                  debitPaise: FINANCIAL_RULES.BASIC_SPONSOR_COMMISSION_PAISE,
                  creditPaise: 0n,
                  description: `Commission expense for basic activation of ${params.referredUser.fullName}`,
                },
                {
                  account: JournalAccount.COMMISSION_HOLD_RESERVE,
                  userId: params.sponsor.id,
                  debitPaise: 0n,
                  creditPaise: FINANCIAL_RULES.BASIC_SPONSOR_COMMISSION_PAISE,
                  description: `Hold reserve recorded for sponsor ${params.sponsor.memberId}`,
                },
              ],
            },
          },
        });

        return {
          sponsorMemberId: params.sponsor.memberId,
          basicActivationOrder,
          action: 'COMMISSION_HELD',
          amountINR: paiseToRupees(FINANCIAL_RULES.BASIC_SPONSOR_COMMISSION_PAISE),
          reason: 'Hold reserve target of ₹1,000 maintained on 2nd Basic direct prior to 2nd Full Qualified direct',
        };
      } else {
        await tx.walletAccount.update({
          where: { userId: params.sponsor.id },
          data: {
            availableEarningsPaise: { increment: FINANCIAL_RULES.BASIC_SPONSOR_COMMISSION_PAISE },
            totalEarnedPaise: { increment: FINANCIAL_RULES.BASIC_SPONSOR_COMMISSION_PAISE },
          },
        });

        // Journal: Commission Released Directly to Wallet (Enforcing unique business event referenceId)
        await tx.journalEntry.create({
          data: {
            referenceId: basicSponsorRelKey,
            eventType: 'BASIC_SPONSOR_COMMISSION_RELEASED',
            narration: `Simulated ₹1,000 commission credited to sponsor ${params.sponsor.memberId} from ${params.referredUser.fullName}'s Basic activation (#${basicActivationOrder})`,
            lines: {
              create: [
                {
                  account: JournalAccount.DIRECT_SPONSOR_COMMISSION_EXPENSE,
                  userId: null,
                  debitPaise: FINANCIAL_RULES.BASIC_SPONSOR_COMMISSION_PAISE,
                  creditPaise: 0n,
                  description: `Commission expense for basic activation of ${params.referredUser.fullName}`,
                },
                {
                  account: JournalAccount.MEMBER_EARNINGS_PAYABLE,
                  userId: params.sponsor.id,
                  debitPaise: 0n,
                  creditPaise: FINANCIAL_RULES.BASIC_SPONSOR_COMMISSION_PAISE,
                  description: `Earnings payable credited to sponsor ${params.sponsor.memberId}`,
                },
              ],
            },
          },
        });

        return {
          sponsorMemberId: params.sponsor.memberId,
          basicActivationOrder,
          action: 'COMMISSION_RELEASED_TO_WALLET',
          amountINR: paiseToRupees(FINANCIAL_RULES.BASIC_SPONSOR_COMMISSION_PAISE),
        };
      }
    }

    // -----------------------------------------------------------------------
    // SCENARIO 2: FULL QUALIFICATION (FULL_ACTIVATION OR BASIC_TO_FULL_UPGRADE)
    // -----------------------------------------------------------------------
    if (
      params.requestType === MembershipRequestType.FULL_ACTIVATION ||
      params.requestType === MembershipRequestType.BASIC_TO_FULL_UPGRADE
    ) {
      // 1. Transaction-level Idempotency Guard: Check if qualification event already recorded for this member
      const existingQualEvent = await tx.qualificationEvent.findFirst({
        where: { memberId: params.referredUser.id },
      });
      if (existingQualEvent) {
        return {
          sponsorMemberId: params.sponsor.memberId,
          qualificationOrder: existingQualEvent.qualificationOrderForSponsor,
          action: 'ALREADY_QUALIFIED',
          idempotentReplay: true,
          reason: 'Qualification event already processed for this member',
        };
      }

      // Determine qualification order for sponsor (excluding this user)
      const existingFullDirects = await tx.user.count({
        where: {
          sponsorId: params.sponsor.id,
          isFullQualified: true,
          id: { not: params.referredUser.id },
        },
      });

      const qualificationOrder = existingFullDirects + 1;
      const wasPreviouslyBasic = params.requestType === MembershipRequestType.BASIC_TO_FULL_UPGRADE;
      const priorCommissionPaise = wasPreviouslyBasic
        ? FINANCIAL_RULES.BASIC_SPONSOR_COMMISSION_PAISE
        : 0n;

      // Check whether sponsor is FULL or BASIC
      const latestSponsor = await tx.user.findUnique({
        where: { id: params.sponsor.id },
        select: { id: true, memberId: true, fullName: true, email: true, currentPackage: true, isFullQualified: true },
      });
      const isSponsorFull = Boolean(
        latestSponsor?.isFullQualified || latestSponsor?.currentPackage === MembershipPackage.FULL
      );

      // ---------------------------------------------------------------------
      // SUBCASE 2A: 1st or 3rd+ Full Qualified Direct -> ₹10,000 Total Entitlement
      // ---------------------------------------------------------------------
      if (qualificationOrder === 1 || qualificationOrder >= 3) {
        const totalEntitlement = FINANCIAL_RULES.QUALIFIED_DIRECT_1ST_ENTITLEMENT_PAISE; // ₹10,000

        // Feature 4: BASIC SPONSOR COMMISSION HOLD (Case B & Case C)
        if (!isSponsorFull) {
          if (wasPreviouslyBasic) {
            // CASE B: Sponsor is BASIC, Direct was BASIC and now upgrades to FULL
            // Sponsor already received ₹1,000 earlier. Hold additional ₹9,000.
            const holdAmountPaise = 900000n; // ₹9,000

            await tx.walletAccount.update({
              where: { userId: params.sponsor.id },
              data: {
                heldCommissionsPaise: { increment: holdAmountPaise },
              },
            });

            await tx.commissionHold.create({
              data: {
                sponsorId: params.sponsor.id,
                referredMemberId: params.referredUser.id,
                heldAmountPaise: holdAmountPaise,
                reason: 'BASIC_SPONSOR_DIRECT_UPGRADE',
                status: 'HELD',
              },
            });

            await tx.journalEntry.create({
              data: {
                referenceId: `JNL-HOLD-UPG-${params.requestId}`,
                eventType: 'BASIC_SPONSOR_DIRECT_UPGRADE_HELD',
                narration: `Simulated ₹9,000 sponsor bonus held for BASIC sponsor ${params.sponsor.memberId} on direct upgrade of ${params.referredUser.fullName}`,
                lines: {
                  create: [
                    {
                      account: JournalAccount.DIRECT_SPONSOR_COMMISSION_EXPENSE,
                      userId: null,
                      debitPaise: holdAmountPaise,
                      creditPaise: 0n,
                      description: `Commission expense for direct upgrade of ${params.referredUser.fullName}`,
                    },
                    {
                      account: JournalAccount.COMMISSION_HOLD_RESERVE,
                      userId: params.sponsor.id,
                      debitPaise: 0n,
                      creditPaise: holdAmountPaise,
                      description: `Hold reserve recorded for BASIC sponsor ${params.sponsor.memberId}`,
                    },
                  ],
                },
              },
            });

            await tx.qualificationEvent.create({
              data: {
                memberId: params.referredUser.id,
                sponsorId: params.sponsor.id,
                qualificationMethod: QualificationMethod.UPGRADE_PAYMENT,
                qualificationOrderForSponsor: qualificationOrder,
                feePaidPaise: params.feePaise,
                voucherIssuedPaise: 0n,
                walletCreditedPaise: 0n,
                holdReleasedPaise: 0n,
                commissionRecoveredPaise: 0n,
                unfundedRecoveryPaise: 0n,
              },
            });

            return {
              sponsorMemberId: params.sponsor.memberId,
              qualificationOrder,
              action: 'COMMISSION_HELD_BASIC_SPONSOR',
              heldINR: paiseToRupees(holdAmountPaise),
              reason: 'Direct upgraded to Full; ₹9,000 held until sponsor upgrades to Full',
            };
          } else {
            // CASE C: Sponsor is BASIC, Direct joins FULL directly
            // Release ₹1,000 to wallet, Hold ₹9,000.
            const releaseAmountPaise = 100000n; // ₹1,000
            const holdAmountPaise = 900000n;    // ₹9,000

            await tx.walletAccount.update({
              where: { userId: params.sponsor.id },
              data: {
                availableEarningsPaise: { increment: releaseAmountPaise },
                totalEarnedPaise: { increment: releaseAmountPaise },
                heldCommissionsPaise: { increment: holdAmountPaise },
              },
            });

            await tx.commissionHold.create({
              data: {
                sponsorId: params.sponsor.id,
                referredMemberId: params.referredUser.id,
                heldAmountPaise: holdAmountPaise,
                reason: 'BASIC_SPONSOR_DIRECT_FULL',
                status: 'HELD',
              },
            });

            await tx.journalEntry.create({
              data: {
                referenceId: `JNL-BASIC-FULL-${params.requestId}`,
                eventType: 'BASIC_SPONSOR_DIRECT_FULL_COMMISSION',
                narration: `Simulated entitlement for BASIC sponsor ${params.sponsor.memberId} from direct FULL join of ${params.referredUser.fullName}. Released ₹1,000, Held ₹9,000`,
                lines: {
                  create: [
                    {
                      account: JournalAccount.DIRECT_SPONSOR_COMMISSION_EXPENSE,
                      userId: null,
                      debitPaise: releaseAmountPaise + holdAmountPaise,
                      creditPaise: 0n,
                      description: `Commission expense for direct FULL activation of ${params.referredUser.fullName}`,
                    },
                    {
                      account: JournalAccount.MEMBER_EARNINGS_PAYABLE,
                      userId: params.sponsor.id,
                      debitPaise: 0n,
                      creditPaise: releaseAmountPaise,
                      description: `Earnings payable credited to sponsor ${params.sponsor.memberId}`,
                    },
                    {
                      account: JournalAccount.COMMISSION_HOLD_RESERVE,
                      userId: params.sponsor.id,
                      debitPaise: 0n,
                      creditPaise: holdAmountPaise,
                      description: `Hold reserve recorded for BASIC sponsor ${params.sponsor.memberId}`,
                    },
                  ],
                },
              },
            });

            await tx.qualificationEvent.create({
              data: {
                memberId: params.referredUser.id,
                sponsorId: params.sponsor.id,
                qualificationMethod: QualificationMethod.DIRECT_FULL,
                qualificationOrderForSponsor: qualificationOrder,
                feePaidPaise: params.feePaise,
                voucherIssuedPaise: 0n,
                walletCreditedPaise: releaseAmountPaise,
                holdReleasedPaise: 0n,
                commissionRecoveredPaise: 0n,
                unfundedRecoveryPaise: 0n,
              },
            });

            return {
              sponsorMemberId: params.sponsor.memberId,
              qualificationOrder,
              action: 'PARTIAL_RELEASE_AND_HOLD',
              releasedINR: paiseToRupees(releaseAmountPaise),
              heldINR: paiseToRupees(holdAmountPaise),
              reason: 'Direct joined Full; ₹1,000 released, ₹9,000 held until sponsor upgrades to Full',
            };
          }
        }

        // FULL SPONSOR: Normal flow
        const netWalletCredit = totalEntitlement - priorCommissionPaise; // e.g. ₹9,000 if previously Basic

        await tx.walletAccount.update({
          where: { userId: params.sponsor.id },
          data: {
            availableEarningsPaise: { increment: netWalletCredit },
            totalEarnedPaise: { increment: netWalletCredit },
          },
        });

        // Journal: Qualified Direct Commission
        await tx.journalEntry.create({
          data: {
            referenceId: `JNL-QUAL-${qualificationOrder}-${params.requestId}`,
            eventType: 'QUALIFIED_DIRECT_COMMISSION',
            narration: `Simulated qualification entitlement #${qualificationOrder} for sponsor ${params.sponsor.memberId} from ${params.referredUser.fullName}. Net wallet credit: ₹${paiseToRupees(netWalletCredit)}`,
            lines: {
              create: [
                {
                  account: JournalAccount.DIRECT_SPONSOR_COMMISSION_EXPENSE,
                  userId: null,
                  debitPaise: netWalletCredit,
                  creditPaise: 0n,
                  description: `Commission expense for qualified direct #${qualificationOrder}`,
                },
                {
                  account: JournalAccount.MEMBER_EARNINGS_PAYABLE,
                  userId: params.sponsor.id,
                  debitPaise: 0n,
                  creditPaise: netWalletCredit,
                  description: `Earnings payable credited to sponsor ${params.sponsor.memberId}`,
                },
              ],
            },
          },
        });

        await tx.qualificationEvent.create({
          data: {
            memberId: params.referredUser.id,
            sponsorId: params.sponsor.id,
            qualificationMethod: wasPreviouslyBasic
              ? QualificationMethod.UPGRADE_PAYMENT
              : QualificationMethod.DIRECT_FULL,
            qualificationOrderForSponsor: qualificationOrder,
            feePaidPaise: params.feePaise,
            voucherIssuedPaise: 0n,
            walletCreditedPaise: netWalletCredit,
            holdReleasedPaise: 0n,
            commissionRecoveredPaise: 0n,
            unfundedRecoveryPaise: 0n,
          },
        });

        return {
          sponsorMemberId: params.sponsor.memberId,
          qualificationOrder,
          action: 'QUALIFIED_DIRECT_WALLET_CREDIT',
          totalEntitlementINR: paiseToRupees(totalEntitlement),
          priorOffsetINR: paiseToRupees(priorCommissionPaise),
          netCreditedINR: paiseToRupees(netWalletCredit),
        };
      }

      // ---------------------------------------------------------------------
      // SUBCASE 2B: 2nd Full Qualified Direct
      // 1. ₹30,000 Shopping Voucher issued to sponsor (NOT cash)
      // 2. Release ₹1,000 hold reserve to available earnings
      // 3. Reconcile/recover earlier ₹1,000 basic commission (if previously basic)
      // ---------------------------------------------------------------------
      if (qualificationOrder === 2) {
        // Part 1: Issue ₹30,000 Shopping Voucher (EV Vehicle Voucher)
        const voucherGrantPaise = FINANCIAL_RULES.QUALIFIED_DIRECT_2ND_VOUCHER_PAISE;
        const sponsorVoucherCode = `VCHR-SPON-${Date.now().toString().slice(-8)}-${Math.floor(1000 + Math.random() * 9000)}`;

        const sponsorVoucher = await tx.shoppingVoucher.create({
          data: {
            voucherCode: sponsorVoucherCode,
            userId: params.sponsor.id,
            initialValuePaise: voucherGrantPaise,
            remainingBalancePaise: voucherGrantPaise,
            issuedReason: 'SECOND_QUALIFIED_DIRECT_GRANT',
            category: 'ADDITIONAL_SHOPPING_VOUCHER',
            emailSent: false, // Sandbox logged only, not live delivered
            emailSentAt: null,
            status: 'ACTIVE',
            expiresAt: new Date('2099-12-31T23:59:59.999Z'), // Pending approved business policy, vouchers do not automatically expire
          },
        });

        if (this.emailService && params.sponsor.email) {
          await this.emailService.sendVoucherNotification(
            params.sponsor.email,
            params.sponsor.fullName,
            {
              voucherCode: sponsorVoucherCode,
              category: 'ADDITIONAL_SHOPPING_VOUCHER',
              valueINR: paiseToRupees(voucherGrantPaise),
              expiresAt: '2099-12-31',
            }
          );

          await tx.auditLog.create({
            data: {
              actorId: params.sponsor.id,
              action: 'VOUCHER_EMAIL_NOTIFICATION',
              entityType: 'ShoppingVoucher',
              entityId: sponsorVoucher.id,
              metadata: {
                deliveryStatus: 'SANDBOX_LOGGED',
                recipientEmail: params.sponsor.email,
                voucherCode: sponsorVoucherCode,
                category: 'ADDITIONAL_SHOPPING_VOUCHER',
                loggedAt: new Date().toISOString(),
              },
            },
          });
        }

        await tx.walletAccount.update({
          where: { userId: params.sponsor.id },
          data: {
            shoppingVoucherBalancePaise: { increment: voucherGrantPaise },
          },
        });

        // Journal 1: Voucher Liability (Distinct from cash earnings)
        await tx.journalEntry.create({
          data: {
            referenceId: `JNL-VCHR-2ND-${params.requestId}`,
            eventType: 'SECOND_DIRECT_VOUCHER_LIABILITY',
            narration: `Simulated ₹30,000 shopping voucher issued to sponsor ${params.sponsor.memberId} for 2nd qualified direct`,
            lines: {
              create: [
                {
                  account: JournalAccount.SHOPPING_VOUCHER_PROMO_EXPENSE,
                  userId: null,
                  debitPaise: voucherGrantPaise,
                  creditPaise: 0n,
                  description: `Promotional voucher incentive expense for 2nd qualified direct`,
                },
                {
                  account: JournalAccount.SHOPPING_VOUCHER_LIABILITY,
                  userId: params.sponsor.id,
                  debitPaise: 0n,
                  creditPaise: voucherGrantPaise,
                  description: `Voucher liability recorded for sponsor ${params.sponsor.memberId}`,
                },
              ],
            },
          },
        });

        // Part 2: Release sponsor-level ₹1,000 hold reserve
        // 1. Identify the eligible BASIC hold reserve record FIRST
        const activeHold = await tx.commissionHold.findFirst({
          where: {
            sponsorId: params.sponsor.id,
            status: 'HELD',
            reason: { notIn: ['BASIC_SPONSOR_DIRECT_UPGRADE', 'BASIC_SPONSOR_DIRECT_FULL'] },
          },
          orderBy: { createdAt: 'asc' },
        });

        // 2. Derive release amount EXCLUSIVELY from the eligible hold record
        const holdToReleasePaise = activeHold ? activeHold.heldAmountPaise : 0n;

        // 3. Never release money when no eligible reserve exists!
        if (activeHold && holdToReleasePaise > 0n) {
          const actualDecrement =
            sponsorWallet.heldCommissionsPaise >= holdToReleasePaise
              ? holdToReleasePaise
              : sponsorWallet.heldCommissionsPaise;

          await tx.walletAccount.update({
            where: { userId: params.sponsor.id },
            data: {
              heldCommissionsPaise: { decrement: actualDecrement },
              availableEarningsPaise: { increment: actualDecrement },
              totalEarnedPaise: { increment: actualDecrement },
            },
          });

          await tx.commissionHold.update({
            where: { id: activeHold.id },
            data: {
              status: 'RELEASED',
              releasedAt: new Date(),
              releaseTransactionId: `JNL-HOLD-REL-${params.requestId}`,
            },
          });

          // Journal 2: Hold Release
          await tx.journalEntry.create({
            data: {
              referenceId: `JNL-HOLD-REL-${params.requestId}`,
              eventType: 'HOLD_RESERVE_RELEASE',
              narration: `Simulated release of ₹${paiseToRupees(actualDecrement)} hold reserve to sponsor ${params.sponsor.memberId}`,
              lines: {
                create: [
                  {
                    account: JournalAccount.COMMISSION_HOLD_RESERVE,
                    userId: params.sponsor.id,
                    debitPaise: actualDecrement,
                    creditPaise: 0n,
                    description: `Hold reserve released for sponsor ${params.sponsor.memberId}`,
                  },
                  {
                    account: JournalAccount.MEMBER_EARNINGS_PAYABLE,
                    userId: params.sponsor.id,
                    debitPaise: 0n,
                    creditPaise: actualDecrement,
                    description: `Earnings payable credited to sponsor ${params.sponsor.memberId} from hold release`,
                  },
                ],
              },
            },
          });
        }

        // Part 3: Commission Recovery (if referral was previously Basic)
        let fundedRecovery = 0n;
        let unfundedRecovery = 0n;

        if (wasPreviouslyBasic) {
          const freshSponsorWallet = await tx.walletAccount.findUnique({
            where: { userId: params.sponsor.id },
          });

          const availableAtRecovery = freshSponsorWallet?.availableEarningsPaise ?? 0n;
          const recoveryRequired = FINANCIAL_RULES.BASIC_SPONSOR_COMMISSION_PAISE; // ₹1,000

          fundedRecovery =
            recoveryRequired <= availableAtRecovery ? recoveryRequired : availableAtRecovery;
          unfundedRecovery = recoveryRequired - fundedRecovery;

          if (fundedRecovery > 0n) {
            await tx.walletAccount.update({
              where: { userId: params.sponsor.id },
              data: {
                availableEarningsPaise: { decrement: fundedRecovery },
              },
            });
          }

          if (unfundedRecovery > 0n) {
            await tx.walletAccount.update({
              where: { userId: params.sponsor.id },
              data: {
                pendingRecoveryPaise: { increment: unfundedRecovery },
              },
            });

            await tx.pendingRecovery.create({
              data: {
                sponsorId: params.sponsor.id,
                referredMemberId: params.referredUser.id,
                recoveryAmountPaise: unfundedRecovery,
                status: 'PENDING',
              },
            });
          }

          // Journal 3: Recovery Reconciliation
          const recoveryLines: Prisma.JournalLineCreateWithoutJournalEntryInput[] = [];
          if (fundedRecovery > 0n) {
            recoveryLines.push({
              account: JournalAccount.MEMBER_EARNINGS_PAYABLE,
              userId: params.sponsor.id,
              debitPaise: fundedRecovery,
              creditPaise: 0n,
              description: `Deduction from earnings payable for commission recovery`,
            });
          }
          if (unfundedRecovery > 0n) {
            recoveryLines.push({
              account: JournalAccount.MEMBER_PENDING_RECOVERY,
              userId: params.sponsor.id,
              debitPaise: unfundedRecovery,
              creditPaise: 0n,
              description: `Pending unrecovered advance recorded for sponsor`,
            });
          }
          recoveryLines.push({
            account: JournalAccount.DIRECT_SPONSOR_COMMISSION_EXPENSE,
            userId: null,
            debitPaise: 0n,
            creditPaise: recoveryRequired,
            description: `Recovery/reversal of basic commission for 2nd qualified direct`,
          });

          await tx.journalEntry.create({
            data: {
              referenceId: `JNL-REC-${params.requestId}`,
              eventType: 'COMMISSION_RECOVERY_RECONCILIATION',
              narration: `Simulated recovery of ₹${paiseToRupees(recoveryRequired)} basic commission from sponsor ${params.sponsor.memberId}`,
              lines: {
                create: recoveryLines,
              },
            },
          });
        }

        // Record QualificationEvent
        await tx.qualificationEvent.create({
          data: {
            memberId: params.referredUser.id,
            sponsorId: params.sponsor.id,
            qualificationMethod: wasPreviouslyBasic
              ? QualificationMethod.UPGRADE_PAYMENT
              : QualificationMethod.DIRECT_FULL,
            qualificationOrderForSponsor: 2,
            feePaidPaise: params.feePaise,
            voucherIssuedPaise: voucherGrantPaise,
            walletCreditedPaise: 0n,
            holdReleasedPaise: holdToReleasePaise,
            commissionRecoveredPaise: fundedRecovery,
            unfundedRecoveryPaise: unfundedRecovery,
          },
        });

        return {
          sponsorMemberId: params.sponsor.memberId,
          qualificationOrder: 2,
          action: 'SECOND_QUALIFIED_DIRECT_RECONCILIATION',
          voucherIssuedINR: paiseToRupees(voucherGrantPaise),
          holdReleasedINR: paiseToRupees(holdToReleasePaise),
          recoveredINR: paiseToRupees(fundedRecovery),
          unfundedRecoveryINR: paiseToRupees(unfundedRecovery),
        };
      }
    }

    return null;
  }

  /**
  * Propagates qualified volume (+1 unit) up the binary tree ancestor chain
  * when a member transitions to Full Qualification.
  */
  private async propagateBinaryVolumeOnFullQualification(
    tx: Prisma.TransactionClient,
    userId: string
  ): Promise<string[]> {
    const placement = await tx.binaryPlacement.findUnique({
      where: { userId },
      select: { parentId: true, leg: true },
    });

    if (!placement || !placement.parentId || !placement.leg) {
      return []; // Not yet placed in binary tree
    }

    let currParentId: string | null = placement.parentId;
    let currLeg: BinaryLeg | null = placement.leg;
    const visited = new Set<string>();
    const affectedAncestors: string[] = [];

    while (currParentId && currLeg) {
      if (visited.has(currParentId)) {
        throw new BadRequestException('Cycle detected in binary placement ancestor chain.');
      }
      visited.add(currParentId);

      const parentPlacement = await tx.binaryPlacement.findUnique({
        where: { userId: currParentId },
        select: { parentId: true, leg: true },
      });
      if (!parentPlacement) break;

      const updateData: any = {};
      if (currLeg === BinaryLeg.LEFT) {
        updateData.leftVolumePaise = { increment: 1n };
        updateData.carryLeftPaise = { increment: 1n };
      } else {
        updateData.rightVolumePaise = { increment: 1n };
        updateData.carryRightPaise = { increment: 1n };
      }

      await tx.binaryPlacement.update({
        where: { userId: currParentId },
        data: updateData,
      });

      affectedAncestors.push(currParentId);

      if (!parentPlacement.parentId || !parentPlacement.leg) break;
      currLeg = parentPlacement.leg;
      currParentId = parentPlacement.parentId;
    }

    // Queue outbox records for ancestors in tx
    if (tx.binaryMatchingOutbox) {
      for (const ancestorId of affectedAncestors) {
        await tx.binaryMatchingOutbox.create({
          data: {
            userId: ancestorId,
            triggerReason: 'UPGRADE',
            triggerUserId: userId,
            status: 'PENDING',
          },
        });
      }
      // Also queue the upgraded member so any carried-forward pairs can match!
      await tx.binaryMatchingOutbox.create({
        data: {
          userId,
          triggerReason: 'UPGRADE',
          triggerUserId: userId,
          status: 'PENDING',
        },
      });
    }
    affectedAncestors.push(userId);

    return affectedAncestors;
  }

  /**
   * Deterministically places a member in the binary tree on their intended leg
   * under the sponsor's subtree (standard direct-selling extreme outer spillover).
   * For BASIC members (isFullQualified = false), increments counts only (+1 count), 0 volume.
   * For FULL members (isFullQualified = true), increments counts and payable volume (+1 unit).
   */
  private async autoPlaceMemberInBinaryTree(
    tx: Prisma.TransactionClient,
    targetUser: User,
    isFullQualified: boolean = true
  ) {
    if (targetUser.role === UserRole.SUPER_ADMIN) {
      return null;
    }

    // 1. Determine sponsor / anchor node
    let anchorUserId = targetUser.sponsorId;
    if (!anchorUserId) {
      const rootAdmin = await tx.user.findFirst({
        where: { role: UserRole.SUPER_ADMIN },
        select: { id: true },
      });
      anchorUserId = rootAdmin?.id || null;
    }

    if (!anchorUserId || anchorUserId === targetUser.id) {
      return null;
    }

    // Ensure anchor has a BinaryPlacement record
    let anchorPlacement = await tx.binaryPlacement.findUnique({
      where: { userId: anchorUserId },
    });
    if (!anchorPlacement) {
      anchorPlacement = await tx.binaryPlacement.create({
        data: { userId: anchorUserId },
      });
    }

    // Determine intended side: LEFT or RIGHT
    const intendedSide: BinaryLeg =
      targetUser.intendedBinarySide === BinaryLeg.RIGHT ? BinaryLeg.RIGHT : BinaryLeg.LEFT;

    // 2. Extreme outer leg spillover traversal down intendedSide
    let targetParentId = anchorUserId;
    const visited = new Set<string>();

    while (targetParentId) {
      if (visited.has(targetParentId)) {
        throw new BadRequestException('Cycle detected in binary tree traversal during auto-placement.');
      }
      visited.add(targetParentId);

      const childOnLeg = await tx.binaryPlacement.findFirst({
        where: {
          parentId: targetParentId,
          leg: intendedSide,
        },
        select: { userId: true },
      });

      if (!childOnLeg) {
        // Found vacant leaf position on intendedSide!
        break;
      }

      targetParentId = childOnLeg.userId;
    }

    // 3. Upsert target user's BinaryPlacement under targetParentId on intendedSide
    await tx.binaryPlacement.upsert({
      where: { userId: targetUser.id },
      create: {
        userId: targetUser.id,
        parentId: targetParentId,
        leg: intendedSide,
      },
      update: {
        parentId: targetParentId,
        leg: intendedSide,
      },
    });

    // 4. Propagate counts (+1 count) and qualified volume (+1 unit if isFullQualified) up the ancestor chain
    let currParentId: string | null = targetParentId;
    let currLeg: BinaryLeg | null = intendedSide;
    const visitedPropagate = new Set<string>();
    const affectedAncestors: string[] = [];

    while (currParentId && currLeg) {
      if (visitedPropagate.has(currParentId)) break;
      visitedPropagate.add(currParentId);

      const parentNode: { parentId: string | null; leg: BinaryLeg | null } | null =
        await tx.binaryPlacement.findUnique({
          where: { userId: currParentId },
          select: { parentId: true, leg: true },
        });
      if (!parentNode) break;

      const updateData: any = {};
      if (currLeg === BinaryLeg.LEFT) {
        updateData.leftCount = { increment: 1 };
        if (isFullQualified) {
          updateData.leftVolumePaise = { increment: 1n };
          updateData.carryLeftPaise = { increment: 1n };
        }
      } else {
        updateData.rightCount = { increment: 1 };
        if (isFullQualified) {
          updateData.rightVolumePaise = { increment: 1n };
          updateData.carryRightPaise = { increment: 1n };
        }
      }

      await tx.binaryPlacement.update({
        where: { userId: currParentId },
        data: updateData,
      });

      if (isFullQualified) {
        affectedAncestors.push(currParentId);
      }

      if (!parentNode.parentId || !parentNode.leg) break;
      currLeg = parentNode.leg;
      currParentId = parentNode.parentId;
    }

    // Queue outbox records for ancestors in tx only if volume was added (isFullQualified)
    if (isFullQualified && tx.binaryMatchingOutbox) {
      for (const ancestorId of affectedAncestors) {
        await tx.binaryMatchingOutbox.create({
          data: {
            userId: ancestorId,
            triggerReason: 'FULL_ACTIVATION',
            triggerUserId: targetUser.id,
            status: 'PENDING',
          },
        });
      }
    }

    return {
      action: 'AUTO_PLACED',
      placedUserId: targetUser.id,
      parentId: targetParentId,
      leg: intendedSide,
      affectedAncestors,
    };
  }

  /**
   * Admin Portal: Held Sponsor Commission Report
   */
  async getAdminCommissionHolds() {
    const holds = await this.prisma.commissionHold.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const userIds = [
      ...new Set([...holds.map((h) => h.sponsorId), ...holds.map((h) => h.referredMemberId)]),
    ];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, memberId: true, fullName: true, currentPackage: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return holds.map((h) => ({
      ...h,
      heldINR: paiseToRupees(h.heldAmountPaise),
      sponsor: userMap.get(h.sponsorId) || null,
      referredMember: userMap.get(h.referredMemberId) || null,
    }));
  }

  /**
   * Member Portal: Authenticated member's sponsor commission holds
   */
  async getMyCommissionHolds(userId: string) {
    const holds = await this.prisma.commissionHold.findMany({
      where: { sponsorId: userId },
      orderBy: { createdAt: 'desc' },
    });

    const referredUserIds = holds.map((h) => h.referredMemberId);
    const referredUsers = await this.prisma.user.findMany({
      where: { id: { in: referredUserIds } },
      select: { id: true, memberId: true, fullName: true, currentPackage: true },
    });
    const userMap = new Map(referredUsers.map((u) => [u.id, u]));

    return holds.map((h) => {
      const ref = userMap.get(h.referredMemberId);
      const isReserve =
        h.reason === 'BASIC_2ND_DIRECT_HOLD_RESERVE' || h.reason === 'BASIC_HOLD_RESERVE';
      const releaseCondition = isReserve
        ? 'Released upon qualification of 2nd direct referral (EV PRO or EV ULTRA)'
        : 'Released upon sponsor upgrade to EV ULTRA';

      return {
        id: h.id,
        reason: h.reason,
        holdType: isReserve ? 'SECOND_DIRECT_RESERVE' : 'UPGRADE_COMMISSION_HOLD',
        heldAmountINR: paiseToRupees(h.heldAmountPaise),
        heldAmountPaise: h.heldAmountPaise.toString(),
        status: h.status,
        releaseCondition,
        referredMemberId: ref?.memberId || 'N/A',
        referredMemberName: ref?.fullName || 'Direct Member',
        referredMemberPackage: ref?.currentPackage || 'N/A',
        createdAt: h.createdAt,
        releasedAt: h.releasedAt,
        releaseTransactionId: h.releaseTransactionId,
      };
    });
  }
}


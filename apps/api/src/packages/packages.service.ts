import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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
} from './dto/membership-request.dto';

@Injectable()
export class PackagesService {
  constructor(private readonly prisma: PrismaService) {}

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
          'Eligible for Binary Matching Income (1:2 / 2:1 ratio, ₹3,000/match)',
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
  // PHASE 3A: MEMBERSHIP ACTIVATION & UPGRADE REQUESTS
  // =========================================================================

  async createMembershipRequest(userId: string, dto: CreateMembershipRequestDto) {
    const user = await this.prisma.user.findUnique({
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
      const existingKey = await this.prisma.membershipRequest.findUnique({
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
    const pendingRequest = await this.prisma.membershipRequest.findFirst({
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

    const request = await this.prisma.membershipRequest.create({
      data: {
        userId,
        requestType: dto.requestType,
        feePaise: expectedFeePaise,
        paymentMode: dto.paymentMode || 'SIMULATED_TEST',
        paymentReference: dto.paymentReference || `SIM-REF-${Date.now().toString().slice(-8)}`,
        idempotencyKey: dto.idempotencyKey || null,
        isSimulated: true,
        status: MembershipRequestStatus.PENDING,
        metadata: dto.metadata || { compliance: 'SIMULATION_ONLY', source: 'member_portal' },
      },
    });

    await this.prisma.auditLog.create({
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
    adminId: string,
    dto: ReviewMembershipRequestDto
  ) {
    return await this.prisma.$transaction(async (tx) => {
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

      // If user has a sponsor, lock the sponsor to serialize concurrent qualifications
      if (user.sponsor) {
        await tx.$queryRaw`
          SELECT id FROM "User" WHERE id = ${user.sponsor.id} FOR UPDATE
        `;
      }

      // 1. Mark request as APPROVED
      const updatedRequest = await tx.membershipRequest.update({
        where: { id: requestId },
        data: {
          status: MembershipRequestStatus.APPROVED,
          reviewedBy: adminId,
          reviewedAt: new Date(),
          adminNotes: dto.adminNotes || 'Approved in compliance simulation mode',
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

        // Grant Member's ₹30,000 Shopping Voucher
        const voucherCode = `VCHR-MBR-${Date.now().toString().slice(-8)}`;
        await tx.shoppingVoucher.create({
          data: {
            voucherCode,
            userId: user.id,
            initialValuePaise: voucherIssuedPaise,
            remainingBalancePaise: voucherIssuedPaise,
            issuedReason: 'FULL_MEMBERSHIP_ACTIVATION_GRANT',
            status: 'ACTIVE',
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        });

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

        // Grant Member's ₹30,000 Shopping Voucher
        const voucherCode = `VCHR-MBR-${Date.now().toString().slice(-8)}`;
        await tx.shoppingVoucher.create({
          data: {
            voucherCode,
            userId: user.id,
            initialValuePaise: voucherIssuedPaise,
            remainingBalancePaise: voucherIssuedPaise,
            issuedReason: 'UPGRADE_PAYMENT_GRANT',
            status: 'ACTIVE',
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        });

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

      // 3b. PHASE 3C: BINARY VOLUME PROPAGATION ON FULL QUALIFICATION
      // If the member is already placed in the binary tree, their full qualification confers
      // +1 unit of qualified volume to ancestors up their placement branch.
      if (
        req.requestType === MembershipRequestType.FULL_ACTIVATION ||
        req.requestType === MembershipRequestType.BASIC_TO_FULL_UPGRADE
      ) {
        await this.propagateBinaryVolumeOnFullQualification(tx, user.id);
      }

      // 4. Record Administrative Audit Log
      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'APPROVE_MEMBERSHIP_REQUEST',
          entityType: 'MEMBERSHIP_REQUEST',
          entityId: req.id,
          metadata: {
            requestType: req.requestType,
            memberId: user.memberId,
            isSimulated: true,
            complianceMode: 'SIMULATION_ONLY',
            sponsorSettlement: sponsorSettlementResult,
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
      };
    });
  }

  async rejectMembershipRequest(
    requestId: string,
    adminId: string,
    dto: ReviewMembershipRequestDto
  ) {
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
          reviewedBy: adminId,
          reviewedAt: new Date(),
          adminNotes: dto.adminNotes || 'Request rejected by administrative simulation review',
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'REJECT_MEMBERSHIP_REQUEST',
          entityType: 'MEMBERSHIP_REQUEST',
          entityId: req.id,
          metadata: {
            requestType: req.requestType,
            memberId: req.user?.memberId,
            notes: dto.adminNotes,
            complianceMode: 'SIMULATION_ONLY',
          },
        },
      });

      return {
        message: 'Membership request has been rejected',
        request: {
          ...updated,
          feeINR: paiseToRupees(updated.feePaise),
        },
      };
    });
  }

  // =========================================================================
  // PHASE 3B: SPONSOR COMMISSION SETTLEMENT ENGINE (IN-TRANSACTION)
  // =========================================================================

  private async settleSponsorCommissionInTx(
    tx: Prisma.TransactionClient,
    params: {
      sponsor: User & { wallet: WalletAccount | null };
      referredUser: User;
      requestType: MembershipRequestType;
      requestId: string;
      feePaise: bigint;
    }
  ) {
    // Ensure sponsor wallet exists
    let sponsorWallet = params.sponsor.wallet;
    if (!sponsorWallet) {
      sponsorWallet = await tx.walletAccount.create({
        data: { userId: params.sponsor.id },
      });
    }

    // -----------------------------------------------------------------------
    // SCENARIO 1: BASIC ACTIVATION
    // -----------------------------------------------------------------------
    if (params.requestType === MembershipRequestType.BASIC_ACTIVATION) {
      const fullDirectsCount = await tx.user.count({
        where: {
          sponsorId: params.sponsor.id,
          isFullQualified: true,
        },
      });

      // Maintain ₹1,000 hold reserve prior to 2nd Full Qualified direct
      const shouldHold =
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
            status: 'HELD',
          },
        });

        // Journal: Commission Hold
        await tx.journalEntry.create({
          data: {
            referenceId: `JNL-HOLD-${params.requestId}`,
            eventType: 'BASIC_SPONSOR_COMMISSION_HELD',
            narration: `Simulated ₹1,000 hold reserve for sponsor ${params.sponsor.memberId} from ${params.referredUser.fullName}'s Basic activation`,
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
          action: 'COMMISSION_HELD',
          amountINR: paiseToRupees(FINANCIAL_RULES.BASIC_SPONSOR_COMMISSION_PAISE),
          reason: 'Hold reserve target of ₹1,000 maintained prior to 2nd Full Qualified direct',
        };
      } else {
        await tx.walletAccount.update({
          where: { userId: params.sponsor.id },
          data: {
            availableEarningsPaise: { increment: FINANCIAL_RULES.BASIC_SPONSOR_COMMISSION_PAISE },
            totalEarnedPaise: { increment: FINANCIAL_RULES.BASIC_SPONSOR_COMMISSION_PAISE },
          },
        });

        // Journal: Commission Released Directly to Wallet
        await tx.journalEntry.create({
          data: {
            referenceId: `JNL-REL-${params.requestId}`,
            eventType: 'BASIC_SPONSOR_COMMISSION_RELEASED',
            narration: `Simulated ₹1,000 commission credited to sponsor ${params.sponsor.memberId} from ${params.referredUser.fullName}'s Basic activation`,
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

      // ---------------------------------------------------------------------
      // SUBCASE 2A: 1st or 3rd+ Full Qualified Direct -> ₹10,000 Total Entitlement
      // ---------------------------------------------------------------------
      if (qualificationOrder === 1 || qualificationOrder >= 3) {
        const totalEntitlement = FINANCIAL_RULES.QUALIFIED_DIRECT_1ST_ENTITLEMENT_PAISE; // ₹10,000
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
        // Part 1: Issue ₹30,000 Shopping Voucher
        const voucherGrantPaise = FINANCIAL_RULES.QUALIFIED_DIRECT_2ND_VOUCHER_PAISE;
        const sponsorVoucherCode = `VCHR-SPON-${Date.now().toString().slice(-8)}`;

        await tx.shoppingVoucher.create({
          data: {
            voucherCode: sponsorVoucherCode,
            userId: params.sponsor.id,
            initialValuePaise: voucherGrantPaise,
            remainingBalancePaise: voucherGrantPaise,
            issuedReason: 'SECOND_QUALIFIED_DIRECT_GRANT',
            status: 'ACTIVE',
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        });

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
        const currentHeld = sponsorWallet.heldCommissionsPaise;
        const holdToReleasePaise =
          currentHeld >= FINANCIAL_RULES.BASIC_HOLD_RESERVE_TARGET_PAISE
            ? FINANCIAL_RULES.BASIC_HOLD_RESERVE_TARGET_PAISE
            : currentHeld;

        if (holdToReleasePaise > 0n) {
          await tx.walletAccount.update({
            where: { userId: params.sponsor.id },
            data: {
              heldCommissionsPaise: { decrement: holdToReleasePaise },
              availableEarningsPaise: { increment: holdToReleasePaise },
              totalEarnedPaise: { increment: holdToReleasePaise },
            },
          });

          // Update oldest active CommissionHold record
          const activeHold = await tx.commissionHold.findFirst({
            where: { sponsorId: params.sponsor.id, status: 'HELD' },
            orderBy: { createdAt: 'asc' },
          });

          if (activeHold) {
            await tx.commissionHold.update({
              where: { id: activeHold.id },
              data: {
                status: 'RELEASED',
                releasedAt: new Date(),
                releaseTransactionId: `JNL-HOLD-REL-${params.requestId}`,
              },
            });
          }

          // Journal 2: Hold Release
          await tx.journalEntry.create({
            data: {
              referenceId: `JNL-HOLD-REL-${params.requestId}`,
              eventType: 'HOLD_RESERVE_RELEASE',
              narration: `Simulated release of ₹${paiseToRupees(holdToReleasePaise)} hold reserve to sponsor ${params.sponsor.memberId}`,
              lines: {
                create: [
                  {
                    account: JournalAccount.COMMISSION_HOLD_RESERVE,
                    userId: params.sponsor.id,
                    debitPaise: holdToReleasePaise,
                    creditPaise: 0n,
                    description: `Hold reserve released for sponsor ${params.sponsor.memberId}`,
                  },
                  {
                    account: JournalAccount.MEMBER_EARNINGS_PAYABLE,
                    userId: params.sponsor.id,
                    debitPaise: 0n,
                    creditPaise: holdToReleasePaise,
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
  ) {
    const placement = await tx.binaryPlacement.findUnique({
      where: { userId },
      select: { parentId: true, leg: true },
    });

    if (!placement || !placement.parentId || !placement.leg) {
      return; // Not yet placed in binary tree
    }

    let currParentId: string | null = placement.parentId;
    let currLeg: BinaryLeg | null = placement.leg;

    while (currParentId && currLeg) {
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

      const parentNode: { parentId: string | null; leg: BinaryLeg | null } | null = await tx.binaryPlacement.findUnique({
        where: { userId: currParentId },
        select: { parentId: true, leg: true },
      });

      if (!parentNode || !parentNode.parentId || !parentNode.leg) break;
      currLeg = parentNode.leg;
      currParentId = parentNode.parentId;
    }
  }
}


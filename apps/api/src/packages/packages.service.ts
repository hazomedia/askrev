import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  FINANCIAL_RULES,
  MembershipPackage,
  QualificationMethod,
  paiseToRupees,
} from '@askrev/shared';

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

  async upgradeUserPackage(
    userId: string,
    method: QualificationMethod,
    paymentReference: string = 'DEV-SANDBOX-REF'
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.isFullQualified) {
      throw new BadRequestException('User is already Full Qualified. Double qualification is strictly prohibited.');
    }

    if (method === QualificationMethod.UPGRADE_SHOPPING) {
      throw new BadRequestException(
        '₹60,000 Shopping qualification path is currently pending business approval and tax compliance sign-off.'
      );
    }

    // Process upgrade in transaction
    const updated = await this.prisma.$transaction(async (tx) => {
      // 1. Update user to Full Qualified
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          currentPackage: MembershipPackage.FULL,
          isFullQualified: true,
          qualificationMethod: method,
          qualificationDate: new Date(),
        },
      });

      // 2. Issue ₹30,000 shopping voucher if upgrading via payment
      const voucherCode = `VCHR-${Date.now().toString().slice(-8)}`;
      await tx.shoppingVoucher.create({
        data: {
          voucherCode,
          userId,
          initialValuePaise: FINANCIAL_RULES.FULL_VOUCHER_GRANT_PAISE,
          remainingBalancePaise: FINANCIAL_RULES.FULL_VOUCHER_GRANT_PAISE,
          issuedReason: 'UPGRADE_PAYMENT_GRANT',
          status: 'ACTIVE',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        },
      });

      // 3. Update wallet voucher balance
      await tx.walletAccount.update({
        where: { userId },
        data: {
          shoppingVoucherBalancePaise: {
            increment: FINANCIAL_RULES.FULL_VOUCHER_GRANT_PAISE,
          },
        },
      });

      // 4. Record audit log
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'PACKAGE_UPGRADE',
          entityType: 'USER',
          entityId: userId,
          metadata: {
            method,
            paymentReference,
            voucherIssued: voucherCode,
            status: 'SIMULATION_UPGRADE_COMPLETE',
          },
        },
      });

      return updatedUser;
    });

    return {
      message: 'Membership upgraded to Full Qualified successfully',
      user: {
        id: updated.id,
        memberId: updated.memberId,
        currentPackage: updated.currentPackage,
        isFullQualified: updated.isFullQualified,
        qualificationMethod: updated.qualificationMethod,
      },
    };
  }
}

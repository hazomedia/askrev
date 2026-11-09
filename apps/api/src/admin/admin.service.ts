import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MembershipPackage, UserRole, paiseToRupees } from '@askrev/shared';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverviewStats() {
    const totalMembers = await this.prisma.user.count();
    const freeUsers = await this.prisma.user.count({ where: { role: UserRole.FREE_USER } });
    const basicMembers = await this.prisma.user.count({ where: { currentPackage: MembershipPackage.BASIC } });
    const fullMembers = await this.prisma.user.count({ where: { currentPackage: MembershipPackage.FULL } });
    const fullQualified = await this.prisma.user.count({ where: { isFullQualified: true } });

    // Aggregate wallet financial figures
    const wallets = await this.prisma.walletAccount.findMany();
    let totalAvailableEarningsPaise = 0n;
    let totalHeldCommissionsPaise = 0n;
    let totalPendingRecoveryPaise = 0n;
    let totalShoppingVoucherBalancePaise = 0n;

    for (const w of wallets) {
      totalAvailableEarningsPaise += w.availableEarningsPaise;
      totalHeldCommissionsPaise += w.heldCommissionsPaise;
      totalPendingRecoveryPaise += w.pendingRecoveryPaise;
      totalShoppingVoucherBalancePaise += w.shoppingVoucherBalancePaise;
    }

    const totalBookings = await this.prisma.evBooking.count();
    const totalVouchersIssued = await this.prisma.shoppingVoucher.count();

    return {
      memberships: {
        totalRegistered: totalMembers,
        freeUsers,
        basicMembers,
        fullMembers,
        fullQualified,
      },
      financialLiabilities: {
        totalAvailableEarningsPayableINR: paiseToRupees(totalAvailableEarningsPaise),
        totalHeldCommissionsReserveINR: paiseToRupees(totalHeldCommissionsPaise),
        totalPendingRecoveryAssetINR: paiseToRupees(totalPendingRecoveryPaise),
        totalOutstandingVoucherLiabilityINR: paiseToRupees(totalShoppingVoucherBalancePaise),
      },
      commerce: {
        totalBookings,
        totalVouchersIssued,
      },
      complianceStatus: {
        complianceMode: process.env.COMPLIANCE_MODE || 'SIMULATION_ONLY',
        livePayoutsEnabled: process.env.ENABLE_LIVE_PAYOUTS === 'true',
        liveMatchingEnabled: process.env.ENABLE_LIVE_MATCHING === 'true',
        voucherCashConversionBlocked: true,
        legalNotice: 'Direct selling rules compliance active. Commission simulator active.',
      },
    };
  }

  async getAuditLogs() {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MembershipPackage, UserRole, paiseToRupees, JournalAccount } from '@askrev/shared';

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
    const pendingMembershipRequests = await this.prisma.membershipRequest.count({
      where: { status: 'PENDING' },
    });

    return {
      memberships: {
        totalRegistered: totalMembers,
        freeUsers,
        basicMembers,
        fullMembers,
        fullQualified,
        pendingMembershipRequests,
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
      take: 100,
    });
  }

  /**
   * System-wide ledger financial reconciliation
   */
  async getFinancialReconciliation() {
    // 1. Wallets
    const wallets = await this.prisma.walletAccount.findMany();
    let walletAvailablePaise = 0n;
    let walletVoucherPaise = 0n;
    for (const w of wallets) {
      walletAvailablePaise += w.availableEarningsPaise;
      walletVoucherPaise += w.shoppingVoucherBalancePaise;
    }

    // 2. Earnings Payable Ledger
    const earningsLines = await this.prisma.journalLine.findMany({
      where: { account: JournalAccount.MEMBER_EARNINGS_PAYABLE },
    });
    let ledgerEarningsNetPaise = 0n;
    for (const l of earningsLines) {
      ledgerEarningsNetPaise += l.creditPaise - l.debitPaise;
    }

    // 3. Voucher Liability Ledger
    const voucherLines = await this.prisma.journalLine.findMany({
      where: { account: JournalAccount.SHOPPING_VOUCHER_LIABILITY },
    });
    let ledgerVoucherNetPaise = 0n;
    for (const l of voucherLines) {
      ledgerVoucherNetPaise += l.creditPaise - l.debitPaise;
    }

    // 4. Active Vouchers Table
    const vouchers = await this.prisma.shoppingVoucher.findMany({
      where: { status: { in: ['ACTIVE', 'PARTIALLY_REDEEMED'] } },
    });
    let activeVouchersPaise = 0n;
    for (const v of vouchers) {
      activeVouchersPaise += v.remainingBalancePaise;
    }

    return {
      earningsWallet: {
        walletTotalINR: paiseToRupees(walletAvailablePaise),
        ledgerLiabilityNetINR: paiseToRupees(ledgerEarningsNetPaise),
        discrepancyINR: paiseToRupees(walletAvailablePaise - ledgerEarningsNetPaise),
        isBalanced: walletAvailablePaise === ledgerEarningsNetPaise,
      },
      shoppingVouchers: {
        activeVouchersTableINR: paiseToRupees(activeVouchersPaise),
        ledgerLiabilityNetINR: paiseToRupees(ledgerVoucherNetPaise),
        discrepancyINR: paiseToRupees(activeVouchersPaise - ledgerVoucherNetPaise),
        isBalanced: activeVouchersPaise === ledgerVoucherNetPaise,
      },
      auditTimestamp: new Date().toISOString(),
    };
  }

  /**
   * Comprehensive Voucher Transactions across the platform
   */
  async getVoucherTransactionsAdmin() {
    const transactions = await this.prisma.voucherTransaction.findMany({
      include: {
        voucher: {
          include: {
            user: { select: { memberId: true, fullName: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return transactions.map((t) => ({
      id: t.id,
      voucherCode: t.voucher.voucherCode,
      memberId: t.voucher.user.memberId,
      memberName: t.voucher.user.fullName,
      transactionType: t.transactionType,
      amountINR: paiseToRupees(t.amountPaise),
      balanceAfterINR: paiseToRupees(t.balanceAfterPaise),
      referenceId: t.referenceId,
      narration: t.narration,
      createdAt: t.createdAt,
    }));
  }

  /**
   * Suspicious Duplicate Transaction Detection
   */
  async detectSuspiciousActivity() {
    // Check for duplicate payment references
    const bookings = await this.prisma.evBooking.findMany({
      where: { paymentReference: { not: null } },
      select: { paymentReference: true, bookingNumber: true, id: true },
    });

    const refMap = new Map<string, string[]>();
    for (const b of bookings) {
      if (b.paymentReference) {
        const list = refMap.get(b.paymentReference) || [];
        list.push(b.bookingNumber);
        refMap.set(b.paymentReference, list);
      }
    }

    const duplicateBookings = Array.from(refMap.entries())
      .filter(([_, list]) => list.length > 1)
      .map(([ref, list]) => ({ paymentReference: ref, bookingNumbers: list }));

    return {
      status: duplicateBookings.length === 0 ? 'CLEAN_NO_SUSPICIOUS_DUPLICATES' : 'DUPLICATES_DETECTED',
      duplicatePaymentReferences: duplicateBookings,
      scanTimestamp: new Date().toISOString(),
    };
  }
}

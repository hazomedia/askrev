import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MembershipPackage, UserRole, paiseToRupees, JournalAccount } from '@askrev/shared';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Comprehensive Operational & Financial Overview
   */
  async getOverviewStats() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // 1. Members Breakdown
    const [
      totalMembers,
      freeUsers,
      basicMembers,
      fullMembers,
      fullQualified,
      newRegistrations,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: UserRole.FREE_USER } }),
      this.prisma.user.count({ where: { currentPackage: MembershipPackage.BASIC } }),
      this.prisma.user.count({ where: { currentPackage: MembershipPackage.FULL } }),
      this.prisma.user.count({ where: { isFullQualified: true } }),
      this.prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    ]);

    // 2. Membership Requests Breakdown
    const [
      pendingMembershipRequests,
      approvedRequests,
      rejectedRequests,
      pendingUpgrades,
    ] = await Promise.all([
      this.prisma.membershipRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.membershipRequest.count({ where: { status: 'APPROVED' } }),
      this.prisma.membershipRequest.count({ where: { status: 'REJECTED' } }),
      this.prisma.membershipRequest.count({
        where: { status: 'PENDING', requestType: 'BASIC_TO_FULL_UPGRADE' },
      }),
    ]);

    // 3. Aggregate Wallet Financials
    const wallets = await this.prisma.walletAccount.findMany();
    let totalAvailableEarningsPaise = 0n;
    let totalHeldCommissionsPaise = 0n;
    let totalPendingRecoveryPaise = 0n;
    let totalShoppingVoucherBalancePaise = 0n;
    let totalEarnedPaise = 0n;

    for (const w of wallets) {
      totalAvailableEarningsPaise += w.availableEarningsPaise;
      totalHeldCommissionsPaise += w.heldCommissionsPaise;
      totalPendingRecoveryPaise += w.pendingRecoveryPaise;
      totalShoppingVoucherBalancePaise += w.shoppingVoucherBalancePaise;
      totalEarnedPaise += w.totalEarnedPaise;
    }

    // 4. Voucher Redemptions Total
    const allVouchers = await this.prisma.shoppingVoucher.findMany({
      select: { initialValuePaise: true, remainingBalancePaise: true },
    });
    let totalVouchersIssuedCount = allVouchers.length;
    let totalVouchersRedeemedPaise = 0n;
    for (const v of allVouchers) {
      if (v.initialValuePaise > v.remainingBalancePaise) {
        totalVouchersRedeemedPaise += v.initialValuePaise - v.remainingBalancePaise;
      }
    }

    // 5. Binary Matching Rewards Total
    const binaryEvents = await this.prisma.binaryMatchEvent.findMany({
      select: { rewardPaise: true, matchesSettled: true },
    });
    let totalBinaryRewardPaise = 0n;
    let totalBinaryMatchesCount = 0;
    for (const be of binaryEvents) {
      totalBinaryRewardPaise += be.rewardPaise;
      totalBinaryMatchesCount += be.matchesSettled;
    }

    // 6. EV Bookings Totals
    const bookings = await this.prisma.evBooking.findMany({
      select: {
        bookingStatus: true,
        bookingAmountPaise: true,
        voucherAppliedPaise: true,
        netCashPaidPaise: true,
      },
    });

    let totalBookings = bookings.length;
    let confirmedBookings = 0;
    let cancelledBookings = 0;
    let totalVoucherAppliedPaise = 0n;
    let totalNetCashPaidPaise = 0n;

    for (const b of bookings) {
      if (b.bookingStatus === 'CANCELLED') {
        cancelledBookings++;
      } else {
        confirmedBookings++;
        totalVoucherAppliedPaise += b.voucherAppliedPaise;
        totalNetCashPaidPaise += b.netCashPaidPaise;
      }
    }

    // 7. Recent Admin Audit Actions
    const recentAuditLogs = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    // 8. Suspicious Activity Detection Scan
    const suspiciousScan = await this.detectSuspiciousActivity();

    // 9. Quick Equilibrium Check
    const allJournals = await this.prisma.journalEntry.findMany({
      include: { lines: true },
    });
    let unbalancedJournalCount = 0;
    for (const j of allJournals) {
      const dr = j.lines.reduce((s, l) => s + l.debitPaise, 0n);
      const cr = j.lines.reduce((s, l) => s + l.creditPaise, 0n);
      if (dr !== cr) unbalancedJournalCount++;
    }

    return {
      memberships: {
        totalRegistered: totalMembers,
        freeUsers,
        basicMembers,
        fullMembers,
        fullQualified,
        newRegistrationsLast7Days: newRegistrations,
      },
      requests: {
        pending: pendingMembershipRequests,
        approved: approvedRequests,
        rejected: rejectedRequests,
        pendingUpgrades,
      },
      financialLiabilities: {
        totalSimulatedEarningsINR: paiseToRupees(totalEarnedPaise),
        totalAvailableEarningsPayableINR: paiseToRupees(totalAvailableEarningsPaise),
        totalHeldCommissionsReserveINR: paiseToRupees(totalHeldCommissionsPaise),
        totalPendingRecoveryAssetINR: paiseToRupees(totalPendingRecoveryPaise),
        totalOutstandingVoucherLiabilityINR: paiseToRupees(totalShoppingVoucherBalancePaise),
        totalVouchersRedeemedINR: paiseToRupees(totalVouchersRedeemedPaise),
        totalBinaryRewardsINR: paiseToRupees(totalBinaryRewardPaise),
        totalBinaryMatchesSettled: totalBinaryMatchesCount,
      },
      commerce: {
        totalBookings,
        confirmedBookings,
        cancelledBookings,
        totalVouchersIssued: totalVouchersIssuedCount,
        totalVoucherAppliedINR: paiseToRupees(totalVoucherAppliedPaise),
        totalNetCashPaidINR: paiseToRupees(totalNetCashPaidPaise),
      },
      system: {
        unbalancedJournalCount,
        reconciliationStatus: unbalancedJournalCount === 0 ? 'RECONCILED_PERFECT' : 'DISCREPANCY_DETECTED',
        suspiciousAlertsCount: suspiciousScan.duplicatePaymentReferences.length,
        complianceMode: process.env.COMPLIANCE_MODE || 'SIMULATION_ONLY',
        livePayoutsEnabled: process.env.ENABLE_LIVE_PAYOUTS === 'true',
        liveMatchingEnabled: process.env.ENABLE_LIVE_MATCHING === 'true',
      },
      recentActions: recentAuditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        actorId: log.actorId,
        entityType: log.entityType,
        entityId: log.entityId,
        metadata: log.metadata,
        createdAt: log.createdAt,
      })),
    };
  }

  /**
   * Paginated Member Wallets
   */
  async getWalletsAdmin(query?: { search?: string; page?: string | number; limit?: string | number }) {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query?.limit) || 25));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query?.search) {
      where.user = {
        OR: [
          { fullName: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
          { memberId: { contains: query.search, mode: 'insensitive' } },
        ],
      };
    }

    const [total, wallets] = await Promise.all([
      this.prisma.walletAccount.count({ where }),
      this.prisma.walletAccount.findMany({
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
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      wallets: wallets.map((w) => ({
        id: w.id,
        userId: w.userId,
        memberId: w.user?.memberId || 'N/A',
        fullName: w.user?.fullName || 'Unknown',
        email: w.user?.email || 'N/A',
        currentPackage: w.user?.currentPackage || 'FREE',
        isFullQualified: w.user?.isFullQualified || false,
        availableEarningsINR: paiseToRupees(w.availableEarningsPaise),
        heldCommissionsINR: paiseToRupees(w.heldCommissionsPaise),
        pendingRecoveryINR: paiseToRupees(w.pendingRecoveryPaise),
        shoppingVoucherINR: paiseToRupees(w.shoppingVoucherBalancePaise),
        totalEarnedINR: paiseToRupees(w.totalEarnedPaise),
        updatedAt: w.updatedAt,
      })),
    };
  }

  /**
   * Paginated Double-Entry Journal Entries (Ledger Inspection)
   */
  async getLedgerAdmin(query?: {
    search?: string;
    eventType?: string;
    page?: string | number;
    limit?: string | number;
  }) {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query?.limit) || 25));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query?.search) {
      where.OR = [
        { referenceId: { contains: query.search, mode: 'insensitive' } },
        { narration: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query?.eventType) {
      where.eventType = query.eventType;
    }

    const [total, entries] = await Promise.all([
      this.prisma.journalEntry.count({ where }),
      this.prisma.journalEntry.findMany({
        where,
        include: {
          lines: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      entries: entries.map((e) => {
        const totalDebitPaise = e.lines.reduce((s, l) => s + l.debitPaise, 0n);
        const totalCreditPaise = e.lines.reduce((s, l) => s + l.creditPaise, 0n);
        return {
          id: e.id,
          referenceId: e.referenceId,
          eventType: e.eventType,
          narration: e.narration,
          totalDebitINR: paiseToRupees(totalDebitPaise),
          totalCreditINR: paiseToRupees(totalCreditPaise),
          isBalanced: totalDebitPaise === totalCreditPaise,
          lineCount: e.lines.length,
          createdAt: e.createdAt,
          lines: e.lines.map((l) => ({
            id: l.id,
            account: l.account,
            userId: l.userId,
            debitINR: paiseToRupees(l.debitPaise),
            creditINR: paiseToRupees(l.creditPaise),
            description: l.description,
          })),
        };
      }),
    };
  }

  /**
   * Paginated Audit Logs
   */
  async getAuditLogs(query?: { action?: string; search?: string; page?: string | number; limit?: string | number }) {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query?.limit) || 50));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query?.action) {
      where.action = query.action;
    }
    if (query?.search) {
      where.OR = [
        { action: { contains: query.search, mode: 'insensitive' } },
        { entityType: { contains: query.search, mode: 'insensitive' } },
        { entityId: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      logs,
    };
  }

  /**
   * System-wide and Per-Member Financial Reconciliation
   */
  async getFinancialReconciliation() {
    const wallets = await this.prisma.walletAccount.findMany({
      include: { user: { select: { memberId: true, fullName: true, role: true } } },
    });

    let walletAvailablePaise = 0n;
    let walletVoucherPaise = 0n;
    for (const w of wallets) {
      walletAvailablePaise += w.availableEarningsPaise;
      walletVoucherPaise += w.shoppingVoucherBalancePaise;
    }

    // General ledger balance for MEMBER_EARNINGS_PAYABLE (Credits - Debits)
    const earningsLines = await this.prisma.journalLine.findMany({
      where: { account: JournalAccount.MEMBER_EARNINGS_PAYABLE },
    });
    let ledgerEarningsNetPaise = 0n;
    for (const l of earningsLines) {
      ledgerEarningsNetPaise += l.creditPaise - l.debitPaise;
    }

    // General ledger balance for SHOPPING_VOUCHER_LIABILITY (Credits - Debits)
    const voucherLines = await this.prisma.journalLine.findMany({
      where: { account: JournalAccount.SHOPPING_VOUCHER_LIABILITY },
    });
    let ledgerVoucherNetPaise = 0n;
    for (const l of voucherLines) {
      ledgerVoucherNetPaise += l.creditPaise - l.debitPaise;
    }

    // Active unredeemed vouchers
    const activeVouchers = await this.prisma.shoppingVoucher.findMany({
      where: { status: { in: ['ACTIVE', 'PARTIALLY_REDEEMED'] } },
    });
    let activeVouchersPaise = 0n;
    for (const v of activeVouchers) {
      activeVouchersPaise += v.remainingBalancePaise;
    }

    // Double-Entry Journals Check
    const allJournals = await this.prisma.journalEntry.findMany({
      include: { lines: true },
    });
    let balancedCount = 0;
    let unbalancedCount = 0;
    for (const j of allJournals) {
      const dr = j.lines.reduce((s, l) => s + l.debitPaise, 0n);
      const cr = j.lines.reduce((s, l) => s + l.creditPaise, 0n);
      if (dr === cr) balancedCount++;
      else unbalancedCount++;
    }

    // Per-Member Level Reconciliation
    const activeVouchersByUser = new Map<string, bigint>();
    for (const v of activeVouchers) {
      const prev = activeVouchersByUser.get(v.userId) || 0n;
      activeVouchersByUser.set(v.userId, prev + v.remainingBalancePaise);
    }

    const earningsByUser = new Map<string, bigint>();
    for (const l of earningsLines) {
      if (l.userId) {
        const prev = earningsByUser.get(l.userId) || 0n;
        earningsByUser.set(l.userId, prev + (l.creditPaise - l.debitPaise));
      }
    }

    const memberAudits: any[] = [];
    const memberVoucherDiscrepancies: any[] = [];
    const memberEarningsDiscrepancies: any[] = [];

    for (const w of wallets) {
      const expectedVoucherPaise = activeVouchersByUser.get(w.userId) || 0n;
      const voucherDiffPaise = w.shoppingVoucherBalancePaise - expectedVoucherPaise;
      if (voucherDiffPaise !== 0n) {
        memberVoucherDiscrepancies.push({
          memberId: w.user?.memberId,
          diffINR: paiseToRupees(voucherDiffPaise),
        });
      }

      const expectedEarningsPaise = earningsByUser.get(w.userId) || 0n;
      const earningsDiffPaise = w.availableEarningsPaise - expectedEarningsPaise;
      if (earningsDiffPaise !== 0n) {
        memberEarningsDiscrepancies.push({
          memberId: w.user?.memberId,
          diffINR: paiseToRupees(earningsDiffPaise),
        });
      }

      memberAudits.push({
        id: w.id,
        memberId: w.user?.memberId || 'N/A',
        fullName: w.user?.fullName || 'Unknown',
        walletAvailableINR: paiseToRupees(w.availableEarningsPaise),
        ledgerEarningsINR: paiseToRupees(expectedEarningsPaise),
        earningsDiffINR: paiseToRupees(earningsDiffPaise),
        walletVoucherINR: paiseToRupees(w.shoppingVoucherBalancePaise),
        activeVouchersINR: paiseToRupees(expectedVoucherPaise),
        voucherDiffINR: paiseToRupees(voucherDiffPaise),
        isBalanced: voucherDiffPaise === 0n && earningsDiffPaise === 0n,
      });
    }

    const isPerMemberBalanced =
      memberVoucherDiscrepancies.length === 0 && memberEarningsDiscrepancies.length === 0;

    const earningsDiscrepancy = walletAvailablePaise - ledgerEarningsNetPaise;
    const voucherDiscrepancy = activeVouchersPaise - ledgerVoucherNetPaise;

    return {
      status:
        earningsDiscrepancy === 0n &&
        voucherDiscrepancy === 0n &&
        unbalancedCount === 0 &&
        isPerMemberBalanced
          ? 'RECONCILED'
          : 'DISCREPANCY_DETECTED',
      earningsWallet: {
        walletTotalINR: paiseToRupees(walletAvailablePaise),
        ledgerLiabilityNetINR: paiseToRupees(ledgerEarningsNetPaise),
        discrepancyINR: paiseToRupees(earningsDiscrepancy),
        isBalanced: earningsDiscrepancy === 0n,
      },
      shoppingVouchers: {
        activeVouchersTableINR: paiseToRupees(activeVouchersPaise),
        ledgerLiabilityNetINR: paiseToRupees(ledgerVoucherNetPaise),
        discrepancyINR: paiseToRupees(voucherDiscrepancy),
        isBalanced: voucherDiscrepancy === 0n,
      },
      journals: {
        totalJournals: allJournals.length,
        balancedCount,
        unbalancedCount,
        isEquilibrium: unbalancedCount === 0,
      },
      perMember: {
        isAllMembersBalanced: isPerMemberBalanced,
        totalMembersAudited: wallets.length,
        discrepanciesCount: memberVoucherDiscrepancies.length + memberEarningsDiscrepancies.length,
        memberDetails: memberAudits.slice(0, 50), // Sample or first 50
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

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paiseToRupees, JournalAccount, UserRole } from '@askrev/shared';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get earnings wallet overview with all 4 authoritative balances
   */
  async getWalletOverview(userId: string) {
    let wallet = await this.prisma.walletAccount.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await this.prisma.walletAccount.create({
        data: { userId },
      });
    }

    return {
      availableEarningsINR: paiseToRupees(wallet.availableEarningsPaise),
      heldCommissionsINR: paiseToRupees(wallet.heldCommissionsPaise),
      pendingRecoveryINR: paiseToRupees(wallet.pendingRecoveryPaise),
      totalEarnedINR: paiseToRupees(wallet.totalEarnedPaise),
      shoppingVoucherINR: paiseToRupees(wallet.shoppingVoucherBalancePaise),
      currency: 'INR',
      complianceMode: process.env.COMPLIANCE_MODE || 'SIMULATION_ONLY',
      withdrawalsEnabled: false,
      withdrawalNotice: 'Withdrawals are disabled in compliance simulation mode. Live payouts are strictly non-operational.',
    };
  }

  /**
   * Complete Wallet Transaction History derived from the authoritative double-entry ledger
   */
  async getWalletTransactions(userId: string) {
    const lines = await this.prisma.journalLine.findMany({
      where: {
        userId,
      },
      include: {
        journalEntry: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return lines.map((line) => {
      const isCredit = line.creditPaise > 0n;
      return {
        id: line.id,
        date: line.createdAt.toISOString(),
        transactionType: line.journalEntry.eventType,
        description: line.description || line.journalEntry.narration,
        account: line.account,
        creditINR: paiseToRupees(line.creditPaise),
        debitINR: paiseToRupees(line.debitPaise),
        amountINR: paiseToRupees(isCredit ? line.creditPaise : line.debitPaise),
        isCredit,
        status: 'COMPLETED_SIMULATION',
        referenceId: line.journalEntry.referenceId,
      };
    });
  }

  /**
   * Detailed Sponsor Commission History for the member
   */
  async getSponsorCommissionHistory(userId: string) {
    const [events, holds, recoveries] = await Promise.all([
      this.prisma.qualificationEvent.findMany({
        where: { sponsorId: userId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.commissionHold.findMany({
        where: { sponsorId: userId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.pendingRecovery.findMany({
        where: { sponsorId: userId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      qualificationEvents: events.map((e) => ({
        id: e.id,
        memberId: e.memberId,
        qualificationMethod: e.qualificationMethod,
        orderForSponsor: e.qualificationOrderForSponsor,
        walletCreditedINR: paiseToRupees(e.walletCreditedPaise),
        voucherIssuedINR: paiseToRupees(e.voucherIssuedPaise),
        holdReleasedINR: paiseToRupees(e.holdReleasedPaise),
        commissionRecoveredINR: paiseToRupees(e.commissionRecoveredPaise),
        createdAt: e.createdAt,
      })),
      holds: holds.map((h) => ({
        id: h.id,
        referredMemberId: h.referredMemberId,
        heldAmountINR: paiseToRupees(h.heldAmountPaise),
        status: h.status,
        releasedAt: h.releasedAt,
        createdAt: h.createdAt,
      })),
      recoveries: recoveries.map((r) => ({
        id: r.id,
        referredMemberId: r.referredMemberId,
        recoveryAmountINR: paiseToRupees(r.recoveryAmountPaise),
        recoveredINR: paiseToRupees(r.recoveredPaise),
        status: r.status,
        createdAt: r.createdAt,
      })),
    };
  }

  /**
   * System-wide Financial Reconciliation between Wallet Balances and General Ledger
   */
  async getAdminWalletReconciliation() {
    const wallets = await this.prisma.walletAccount.findMany({
      include: { user: { select: { memberId: true, fullName: true, role: true } } },
    });

    let totalWalletAvailablePaise = 0n;
    let totalWalletHeldPaise = 0n;
    let totalWalletRecoveryPaise = 0n;
    let totalWalletEarnedPaise = 0n;
    let totalWalletVoucherPaise = 0n;

    for (const w of wallets) {
      totalWalletAvailablePaise += w.availableEarningsPaise;
      totalWalletHeldPaise += w.heldCommissionsPaise;
      totalWalletRecoveryPaise += w.pendingRecoveryPaise;
      totalWalletEarnedPaise += w.totalEarnedPaise;
      totalWalletVoucherPaise += w.shoppingVoucherBalancePaise;
    }

    // General ledger balance for MEMBER_EARNINGS_PAYABLE (Credits - Debits)
    const ledgerLines = await this.prisma.journalLine.findMany({
      where: { account: JournalAccount.MEMBER_EARNINGS_PAYABLE },
    });

    let ledgerEarningsPayableNetPaise = 0n;
    for (const l of ledgerLines) {
      ledgerEarningsPayableNetPaise += l.creditPaise - l.debitPaise;
    }

    // General ledger balance for SHOPPING_VOUCHER_LIABILITY (Credits - Debits)
    const voucherLedgerLines = await this.prisma.journalLine.findMany({
      where: { account: JournalAccount.SHOPPING_VOUCHER_LIABILITY },
    });

    let ledgerVoucherLiabilityNetPaise = 0n;
    for (const vl of voucherLedgerLines) {
      ledgerVoucherLiabilityNetPaise += vl.creditPaise - vl.debitPaise;
    }

    // Active unredeemed vouchers sum
    const activeVouchers = await this.prisma.shoppingVoucher.findMany({
      where: { status: { in: ['ACTIVE', 'PARTIALLY_REDEEMED'] } },
    });

    let totalActiveVoucherBalancePaise = 0n;
    for (const v of activeVouchers) {
      totalActiveVoucherBalancePaise += v.remainingBalancePaise;
    }

    const earningsDiscrepancyPaise = totalWalletAvailablePaise - ledgerEarningsPayableNetPaise;
    const voucherDiscrepancyPaise = totalActiveVoucherBalancePaise - ledgerVoucherLiabilityNetPaise;

    // Per-Member Level Reconciliation Audit (Requirement 5)
    const memberVoucherDiscrepancies: any[] = [];
    const memberEarningsDiscrepancies: any[] = [];

    const activeVouchersByUser = new Map<string, bigint>();
    for (const v of activeVouchers) {
      const prev = activeVouchersByUser.get(v.userId) || 0n;
      activeVouchersByUser.set(v.userId, prev + v.remainingBalancePaise);
    }

    const earningsByUser = new Map<string, bigint>();
    for (const l of ledgerLines) {
      if (l.userId) {
        const prev = earningsByUser.get(l.userId) || 0n;
        earningsByUser.set(l.userId, prev + (l.creditPaise - l.debitPaise));
      }
    }

    for (const w of wallets) {
      const expectedVoucherPaise = activeVouchersByUser.get(w.userId) || 0n;
      if (w.shoppingVoucherBalancePaise !== expectedVoucherPaise) {
        memberVoucherDiscrepancies.push({
          memberId: w.user.memberId,
          walletVoucherINR: paiseToRupees(w.shoppingVoucherBalancePaise),
          vouchersSumINR: paiseToRupees(expectedVoucherPaise),
          discrepancyINR: paiseToRupees(w.shoppingVoucherBalancePaise - expectedVoucherPaise),
        });
      }

      const expectedEarningsPaise = earningsByUser.get(w.userId) || 0n;
      if (w.availableEarningsPaise !== expectedEarningsPaise) {
        memberEarningsDiscrepancies.push({
          memberId: w.user.memberId,
          walletAvailableINR: paiseToRupees(w.availableEarningsPaise),
          ledgerNetINR: paiseToRupees(expectedEarningsPaise),
          discrepancyINR: paiseToRupees(w.availableEarningsPaise - expectedEarningsPaise),
        });
      }
    }

    const isPerMemberBalanced =
      memberVoucherDiscrepancies.length === 0 && memberEarningsDiscrepancies.length === 0;

    return {
      reconciliationStatus:
        earningsDiscrepancyPaise === 0n &&
        voucherDiscrepancyPaise === 0n &&
        isPerMemberBalanced
          ? 'RECONCILED_PERFECT'
          : 'DISCREPANCY_DETECTED',
      walletLiability: {
        totalWalletAvailableINR: paiseToRupees(totalWalletAvailablePaise),
        ledgerEarningsPayableNetINR: paiseToRupees(ledgerEarningsPayableNetPaise),
        discrepancyINR: paiseToRupees(earningsDiscrepancyPaise),
        isBalanced: earningsDiscrepancyPaise === 0n,
      },
      voucherLiability: {
        totalActiveVoucherBalanceINR: paiseToRupees(totalActiveVoucherBalancePaise),
        ledgerVoucherLiabilityNetINR: paiseToRupees(ledgerVoucherLiabilityNetPaise),
        discrepancyINR: paiseToRupees(voucherDiscrepancyPaise),
        isBalanced: voucherDiscrepancyPaise === 0n,
      },
      perMemberAudit: {
        isAllMembersBalanced: isPerMemberBalanced,
        totalMembersAudited: wallets.length,
        voucherDiscrepancies: memberVoucherDiscrepancies,
        earningsDiscrepancies: memberEarningsDiscrepancies,
      },
      systemMetrics: {
        totalWallets: wallets.length,
        totalHeldCommissionsINR: paiseToRupees(totalWalletHeldPaise),
        totalPendingRecoveryINR: paiseToRupees(totalWalletRecoveryPaise),
        totalEarnedINR: paiseToRupees(totalWalletEarnedPaise),
      },
      complianceMode: process.env.COMPLIANCE_MODE || 'SIMULATION_ONLY',
    };
  }

  /**
   * Request withdrawal - Strictly disabled in SIMULATION_ONLY mode
   */
  async requestWithdrawal() {
    throw new BadRequestException(
      'Withdrawals are strictly disabled in COMPLIANCE_MODE=SIMULATION_ONLY. Live banking payouts and fund dispatches are disabled.'
    );
  }
}


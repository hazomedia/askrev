import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paiseToRupees, JournalAccount, UserRole } from '@askrev/shared';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * Get earnings wallet overview with all 4 authoritative balances
   */
  async getWalletOverview(userId: string) {
    const [user, existingWallet, ledgerLines, binaryMatchEvents, qualificationEvents] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          isEmailVerified: true,
          binaryPlacement: {
            select: {
              totalRewardEarnedPaise: true,
            },
          },
        },
      }),
      this.prisma.walletAccount.findUnique({
        where: { userId },
      }),
      this.prisma.journalLine
        ? this.prisma.journalLine.findMany({
            where: {
              userId,
              account: {
                in: [
                  JournalAccount.MEMBER_EARNINGS_PAYABLE,
                  '2000_MEMBER_EARNINGS_PAYABLE',
                ],
              },
            },
            include: {
              journalEntry: {
                select: {
                  eventType: true,
                  referenceId: true,
                },
              },
            },
          })
        : Promise.resolve([]),
      this.prisma.binaryMatchEvent
        ? this.prisma.binaryMatchEvent.findMany({
            where: { userId },
            select: { rewardPaise: true },
          })
        : Promise.resolve([]),
      this.prisma.qualificationEvent
        ? this.prisma.qualificationEvent.findMany({
            where: { sponsorId: userId },
            select: { walletCreditedPaise: true, holdReleasedPaise: true },
          })
        : Promise.resolve([]),
    ]);

    let wallet = existingWallet;
    if (!wallet) {
      wallet = await this.prisma.walletAccount.create({
        data: { userId },
      });
    }

    // Direct Sponsor Income (EV Crown Bonus): sum actual Direct Sponsor Income ledger categories
    const isDirectSponsorEvent = (eventType: string): boolean => {
      const et = (eventType || '').toUpperCase();
      return (
        et === 'BASIC_SPONSOR_COMMISSION_RELEASED' ||
        et === 'QUALIFIED_DIRECT_COMMISSION' ||
        et === 'HOLD_RESERVE_RELEASE' ||
        et === 'DIRECT_SPONSOR' ||
        et === 'DIRECT_SPONSOR_COMMISSION' ||
        et.includes('SPONSOR')
      );
    };

    // Binary Matching Income (EV Royal Match): sum actual Binary Matching Income ledger categories
    const isBinaryMatchEvent = (eventType: string): boolean => {
      const et = (eventType || '').toUpperCase();
      return (
        et === 'BINARY_MATCHING_REWARD' ||
        et === 'BINARY_MATCH' ||
        et === 'BINARY_MATCHING' ||
        et.includes('BINARY')
      );
    };

    let ledgerCrownBonusPaise = 0n;
    let ledgerRoyalMatchPaise = 0n;

    for (const line of (ledgerLines as any[]) || []) {
      const eventType = line.journalEntry?.eventType || '';
      const credit = BigInt(line.creditPaise ? String(line.creditPaise) : '0');
      const debit = BigInt(line.debitPaise ? String(line.debitPaise) : '0');
      const netPaise = credit - debit;
      if (isDirectSponsorEvent(eventType)) {
        ledgerCrownBonusPaise += netPaise;
      } else if (isBinaryMatchEvent(eventType)) {
        ledgerRoyalMatchPaise += netPaise;
      }
    }

    // Historical Reconciliation without modifying existing ledger records:
    // If ledger has direct records, prioritize ledger records.
    // If historical QualificationEvent or BinaryMatchEvent records exist without matching journal entries, reconcile them cleanly.
    const qualEventsPaise = ((qualificationEvents as any[]) || []).reduce(
      (sum: bigint, q: any) => {
        const credited = BigInt(q.walletCreditedPaise ? String(q.walletCreditedPaise) : '0');
        const hold = BigInt(q.holdReleasedPaise ? String(q.holdReleasedPaise) : '0');
        return sum + credited + hold;
      },
      0n
    );
    const crownBonusPaise = ledgerCrownBonusPaise > qualEventsPaise ? ledgerCrownBonusPaise : qualEventsPaise;

    const binaryEventsPaise = ((binaryMatchEvents as any[]) || []).reduce(
      (sum: bigint, b: any) => {
        const reward = BigInt(b.rewardPaise ? String(b.rewardPaise) : '0');
        return sum + reward;
      },
      0n
    );
    const placementPaise = BigInt(user?.binaryPlacement?.totalRewardEarnedPaise ? String(user.binaryPlacement.totalRewardEarnedPaise) : '0');
    const historicalBinaryPaise = binaryEventsPaise > placementPaise ? binaryEventsPaise : placementPaise;
    const royalMatchPaise = ledgerRoyalMatchPaise > historicalBinaryPaise ? ledgerRoyalMatchPaise : historicalBinaryPaise;

    const walletTotalEarned = BigInt(wallet.totalEarnedPaise ? String(wallet.totalEarnedPaise) : '0');
    const computedTotalEarned = crownBonusPaise + royalMatchPaise;
    const totalEarnedPaise = walletTotalEarned > computedTotalEarned ? walletTotalEarned : computedTotalEarned;

    return {
      availableEarningsINR: paiseToRupees(wallet.availableEarningsPaise),
      heldCommissionsINR: paiseToRupees(wallet.heldCommissionsPaise),
      pendingRecoveryINR: paiseToRupees(wallet.pendingRecoveryPaise),
      totalEarnedINR: paiseToRupees(totalEarnedPaise),
      shoppingVoucherINR: paiseToRupees(wallet.shoppingVoucherBalancePaise),
      isEmailVerified: !!user?.isEmailVerified,
      breakdown: {
        totalEarningsINR: paiseToRupees(totalEarnedPaise),
        crownBonusINR: paiseToRupees(crownBonusPaise),
        royalMatchINR: paiseToRupees(royalMatchPaise),
        legacyIncomeINR: 0,
        clubFundINR: 0,
      },
      currency: 'INR',
      complianceMode: process.env.COMPLIANCE_MODE || 'SIMULATION_ONLY',
      withdrawalsEnabled: false,
      withdrawalNotice: 'Withdrawals are restricted in compliance simulation mode. Live payouts are strictly non-operational.',
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
   * Request withdrawal - Enforces server-side email verification and live payouts status
   */
  async requestWithdrawal(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });

    if (!user) {
      throw new NotFoundException('Member not found');
    }

    // Server-side mandatory email verification check
    if (!user.isEmailVerified) {
      throw new BadRequestException(
        'Email verification is mandatory prior to requesting withdrawals. Please verify your registered email address.'
      );
    }

    const complianceMode = process.env.COMPLIANCE_MODE || 'SIMULATION_ONLY';
    const enableLivePayouts = process.env.ENABLE_LIVE_PAYOUTS === 'true';

    // Strictly enforce disabled live payouts
    if (!enableLivePayouts || complianceMode === 'SIMULATION_ONLY') {
      return {
        success: false,
        restricted: true,
        livePayoutsEnabled: false,
        complianceMode,
        minWithdrawalINR: 1000,
        availableBalanceINR: paiseToRupees(user.wallet?.availableEarningsPaise || 0n),
        message:
          'Withdrawals are restricted in compliance simulation mode. Live payouts and banking transfers are non-operational until supervisory admin clearance.',
      };
    }

    // If live payouts were enabled:
    const availablePaise = user.wallet?.availableEarningsPaise || 0n;
    const minPaise = 100000n; // ₹1,000
    if (availablePaise < minPaise) {
      throw new BadRequestException('Minimum withdrawal threshold is ₹1,000.');
    }

    return {
      success: true,
      restricted: false,
      message: 'Withdrawal request logged successfully.',
    };
  }
}


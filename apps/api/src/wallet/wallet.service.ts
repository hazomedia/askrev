import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ServiceUnavailableException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/encryption.service';
import { EmailService } from '../auth/email.service';
import { paiseToRupees, JournalAccount, UserRole } from '@askrev/shared';
import {
  RequestWithdrawalDto,
  PayoutDestinationType,
  AdminApproveWithdrawalDto,
  AdminRejectWithdrawalDto,
  AdminSettleWithdrawalDto,
  WithdrawalQueryDto,
} from './dto/withdrawal.dto';
import { randomUUID } from 'crypto';
import { LegacyMatrixService } from '../legacy-matrix/legacy-matrix.service';

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly encryptionService?: EncryptionService,
    @Optional() private readonly emailService?: EmailService,
    @Optional() private readonly legacyMatrixService?: LegacyMatrixService
  ) { }

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
    let ledgerLegacyIncomePaise = 0n;

    for (const line of (ledgerLines as any[]) || []) {
      const eventType = line.journalEntry?.eventType || '';
      const credit = BigInt(line.creditPaise ? String(line.creditPaise) : '0');
      const debit = BigInt(line.debitPaise ? String(line.debitPaise) : '0');
      const netPaise = credit - debit;
      if (isDirectSponsorEvent(eventType)) {
        ledgerCrownBonusPaise += netPaise;
      } else if (isBinaryMatchEvent(eventType)) {
        ledgerRoyalMatchPaise += netPaise;
      } else if (eventType === 'LEGACY_MATRIX_SETTLEMENT') {
        ledgerLegacyIncomePaise += netPaise;
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

    // Authoritative Matrix Calculation for EV Legacy Income (Even levels) & EV Club Fund (Odd levels)
    let matrixOverview: any = null;
    if (this.legacyMatrixService) {
      try {
        matrixOverview = await this.legacyMatrixService.getMyMatrixOverview(userId);
      } catch (e) {
        // Fallback gracefully
      }
    }

    const shoppingWallet = await this.getShoppingWalletBalance(userId, matrixOverview);

    const walletTotalEarned = BigInt(wallet.totalEarnedPaise ? String(wallet.totalEarnedPaise) : '0');
    const computedTotalEarned = crownBonusPaise + royalMatchPaise + ledgerLegacyIncomePaise;
    const totalEarnedPaise = walletTotalEarned > computedTotalEarned ? walletTotalEarned : computedTotalEarned;

    const legacyProjectedINR = Number(
      matrixOverview?.metrics?.earningsWalletProjectedINR ??
      matrixOverview?.accumulatedLegacyIncomeINR ??
      0
    );
    const legacyCreditedINR = Number(
      matrixOverview?.actuallyCreditedLegacyIncomeINR ??
      (ledgerLegacyIncomePaise > 0n ? Number(ledgerLegacyIncomePaise / 100n) : 0)
    );
    const legacyUncreditedINR = Math.max(0, legacyProjectedINR - legacyCreditedINR);
    const isMatrixQualified = Boolean(matrixOverview?.isQualified);
    const legacyPendingQualificationINR = isMatrixQualified ? 0 : legacyUncreditedINR;
    const legacyQualifiedAwaitingSettlementINR = isMatrixQualified ? legacyUncreditedINR : 0;
    const sponsorCommissionHoldsINR = paiseToRupees(wallet.heldCommissionsPaise);
    const totalPendingINR = sponsorCommissionHoldsINR + legacyUncreditedINR;

    return {
      availableEarningsINR: paiseToRupees(wallet.availableEarningsPaise),
      heldCommissionsINR: sponsorCommissionHoldsINR,
      pendingRecoveryINR: paiseToRupees(wallet.pendingRecoveryPaise),
      totalEarnedINR: paiseToRupees(totalEarnedPaise),
      shoppingVoucherINR: paiseToRupees(wallet.shoppingVoucherBalancePaise),
      shoppingWalletINR: shoppingWallet.availableShoppingWalletINR,
      shoppingWallet,
      isEmailVerified: !!user?.isEmailVerified,
      legacyPending: {
        projectedLegacyIncomeINR: legacyProjectedINR,
        creditedLegacyIncomeINR: legacyCreditedINR,
        uncreditedLegacyIncomeINR: legacyUncreditedINR,
        pendingQualificationINR: legacyPendingQualificationINR,
        qualifiedAwaitingSettlementINR: legacyQualifiedAwaitingSettlementINR,
        isQualified: isMatrixQualified,
        activeDirectsCount: matrixOverview?.activeDirectsCount ?? 0,
        sponsorCommissionHoldsINR,
        totalPendingINR,
      },
      breakdown: {
        totalEarningsINR: paiseToRupees(totalEarnedPaise),
        crownBonusINR: paiseToRupees(crownBonusPaise),
        royalMatchINR: paiseToRupees(royalMatchPaise),
        legacyIncomeINR: paiseToRupees(ledgerLegacyIncomePaise),
        clubFundINR: shoppingWallet.availableShoppingWalletINR,
      },
      currency: 'INR',
      complianceMode: process.env.COMPLIANCE_MODE || 'SIMULATION_ONLY',
      withdrawalsEnabled: false,
      withdrawalNotice: 'Withdrawals are restricted in compliance simulation mode. Live payouts are strictly non-operational.',
    };
  }

  /**
   * Authoritative Shopping Wallet (EV Club Fund) Balance & Ledger History
   * Calculates net balance from 2150_EV_CLUB_FUND_LIABILITY ledger lines (Credits - Debits).
   */
  async getShoppingWalletBalance(userId: string, preloadedMatrix?: any) {
    const lines = await this.prisma.journalLine.findMany({
      where: {
        userId,
        account: {
          in: [
            JournalAccount.EV_CLUB_FUND_LIABILITY,
            '2150_EV_CLUB_FUND_LIABILITY',
          ],
        },
      },
      include: {
        journalEntry: {
          select: {
            referenceId: true,
            eventType: true,
            narration: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalCreditsPaise = 0n;
    let totalDebitsPaise = 0n;

    for (const line of lines) {
      if (
        line.account === '2000_MEMBER_EARNINGS_PAYABLE' ||
        line.account === JournalAccount.MEMBER_EARNINGS_PAYABLE ||
        (line as any).accountNumber === '2000_MEMBER_EARNINGS_PAYABLE'
      ) {
        continue;
      }
      totalCreditsPaise += line.creditPaise || 0n;
      totalDebitsPaise += line.debitPaise || 0n;
    }

    const availableBalancePaise =
      totalCreditsPaise > totalDebitsPaise
        ? totalCreditsPaise - totalDebitsPaise
        : 0n;

    let matrixOverview = preloadedMatrix;
    if (!matrixOverview && this.legacyMatrixService) {
      try {
        matrixOverview = await this.legacyMatrixService.getMyMatrixOverview(userId);
      } catch (e) {
        // Fallback gracefully
      }
    }

    const evClubProjectedINR = Number(
      matrixOverview?.metrics?.evClubProjectedINR ??
      matrixOverview?.accumulatedEvClubFundINR ??
      0
    );
    const totalCreditedINR = Number(totalCreditsPaise / 100n);
    const pendingEvClubFundINR = Math.max(0, evClubProjectedINR - totalCreditedINR);
    const isMatrixQualified = Boolean(matrixOverview?.isQualified);
    const activeDirectsCount = matrixOverview?.activeDirectsCount ?? 0;
    const pendingQualificationINR = isMatrixQualified ? 0 : pendingEvClubFundINR;
    const qualifiedAwaitingSettlementINR = isMatrixQualified ? pendingEvClubFundINR : 0;
    const availableShoppingINR = Number(availableBalancePaise / 100n);

    let checkoutAvailabilityStatus = 'NO_ACTIVE_BALANCE';
    let checkoutAvailabilityLabel = 'No Active Balance';
    if (availableShoppingINR > 0) {
      checkoutAvailabilityStatus = 'AVAILABLE';
      checkoutAvailabilityLabel = `₹${availableShoppingINR.toLocaleString('en-IN')} Available for Checkout`;
    } else if (pendingEvClubFundINR > 0) {
      if (isMatrixQualified) {
        checkoutAvailabilityStatus = 'AWAITING_SETTLEMENT';
        checkoutAvailabilityLabel = 'Qualified • Awaiting Settlement';
      } else {
        checkoutAvailabilityStatus = 'PENDING_QUALIFICATION';
        checkoutAvailabilityLabel = `Pending Direct Qualification (${activeDirectsCount}/3)`;
      }
    }

    return {
      userId,
      availableShoppingWalletPaise: availableBalancePaise.toString(),
      availableShoppingWalletINR: availableShoppingINR,
      totalCreditedPaise: totalCreditsPaise.toString(),
      totalCreditedINR,
      totalDebitedPaise: totalDebitsPaise.toString(),
      totalDebitedINR: Number(totalDebitsPaise / 100n),
      projectedEvClubFundINR: evClubProjectedINR,
      pendingEvClubFundINR,
      pendingQualificationINR,
      qualifiedAwaitingSettlementINR,
      isQualified: isMatrixQualified,
      activeDirectsCount,
      checkoutAvailabilityStatus,
      checkoutAvailabilityLabel,
      isWithdrawable: false,
      isTransferable: false,
      rulesNotice:
        'Shopping Wallet (EV Club Fund) is strictly dedicated for EV bookings and product purchases. It is non-withdrawable and non-transferable to cash or Earnings Wallet.',
      transactions: lines.map((l) => ({
        id: l.id,
        referenceId: l.journalEntry?.referenceId ?? null,
        eventType: l.journalEntry?.eventType ?? null,
        narration: l.journalEntry?.narration ?? l.description,
        creditINR: Number(l.creditPaise / 100n),
        debitINR: Number(l.debitPaise / 100n),
        createdAt: l.createdAt,
      })),
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
   * Admin: Complete Shopping Wallet (EV Club Fund) Ledger with search & pagination (Task 5)
   */
  async getAdminShoppingLedger(params: { page?: number; limit?: number; search?: string }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 50));
    const skip = (page - 1) * limit;

    const whereClause: any = {
      account: {
        in: [
          JournalAccount.EV_CLUB_FUND_LIABILITY,
          '2150_EV_CLUB_FUND_LIABILITY',
        ],
      },
    };

    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      const matchedUsers = await this.prisma.user.findMany({
        where: {
          OR: [
            { memberId: { contains: q, mode: 'insensitive' } },
            { fullName: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });
      const matchedUserIds = matchedUsers.map((u) => u.id);

      whereClause.OR = [
        ...(matchedUserIds.length > 0 ? [{ userId: { in: matchedUserIds } }] : []),
        { journalEntry: { referenceId: { contains: q, mode: 'insensitive' } } },
        { journalEntry: { narration: { contains: q, mode: 'insensitive' } } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, lines, aggregateCredits] = await Promise.all([
      this.prisma.journalLine.count({ where: whereClause }),
      this.prisma.journalLine.findMany({
        where: whereClause,
        include: {
          journalEntry: {
            select: { id: true, referenceId: true, eventType: true, narration: true, createdAt: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.journalLine.aggregate({
        where: whereClause,
        _sum: { creditPaise: true, debitPaise: true },
      }),
    ]);

    const userIds = [...new Set(lines.map((l) => l.userId).filter(Boolean))] as string[];
    const users = userIds.length > 0
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, memberId: true, fullName: true, email: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const totalCreditsPaise = aggregateCredits._sum.creditPaise || 0n;
    const totalDebitsPaise = aggregateCredits._sum.debitPaise || 0n;
    const netLiabilityPaise =
      totalCreditsPaise > totalDebitsPaise ? totalCreditsPaise - totalDebitsPaise : 0n;

    return {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      summary: {
        totalCreditsINR: Number(totalCreditsPaise / 100n),
        totalDebitsINR: Number(totalDebitsPaise / 100n),
        netOutstandingShoppingLiabilityINR: Number(netLiabilityPaise / 100n),
      },
      records: lines.map((l) => {
        const u = l.userId ? userMap.get(l.userId) : null;
        const isCredit = l.creditPaise > 0n;
        const amountPaise = isCredit ? l.creditPaise : l.debitPaise;
        return {
          id: l.id,
          referenceId: l.journalEntry?.referenceId || l.id,
          memberId: u?.memberId || 'SYSTEM',
          memberName: u?.fullName || 'System Account',
          transactionType: l.journalEntry?.eventType || 'SHOPPING_WALLET_TX',
          description: l.description || l.journalEntry?.narration || 'Shopping Wallet movement',
          creditINR: Number(l.creditPaise / 100n),
          debitINR: Number(l.debitPaise / 100n),
          amountINR: Number(amountPaise / 100n),
          isCredit,
          date: l.createdAt.toISOString(),
          status: 'SETTLED',
        };
      }),
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
   * Member Withdrawal Eligibility Check
   */
  async getWithdrawalEligibility(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });

    if (!user) {
      throw new NotFoundException('Member not found');
    }

    const finSettings = (this.prisma as any).financialSettings
      ? await (this.prisma as any).financialSettings.findUnique({ where: { id: 'GLOBAL' } })
      : null;

    const availablePaise = user.wallet?.availableEarningsPaise || 0n;
    const minWithdrawalINR = finSettings?.minWithdrawalINR ?? 1000;
    const maxWithdrawalINR = finSettings?.maxWithdrawalINR ?? null;
    const adminChargePercent = finSettings?.adminChargePercent ?? 10;
    const tdsEnabled = finSettings?.tdsEnabled ?? false;
    const tdsPercent = (tdsEnabled && finSettings?.tdsPercent) ? finSettings.tdsPercent : 0;
    const withdrawalRequestsEnabled = finSettings?.withdrawalRequestsEnabled ?? true;
    const disabledReason = finSettings?.withdrawalDisabledReason || null;

    const minWithdrawalPaise = BigInt(Math.round(minWithdrawalINR * 100));
    const reasons: string[] = [];

    if (!withdrawalRequestsEnabled) {
      reasons.push(disabledReason || 'Withdrawal requests are temporarily paused by administration.');
    }
    if (!user.isEmailVerified) {
      reasons.push('Email verification is required prior to requesting withdrawals.');
    }
    if (availablePaise < minWithdrawalPaise) {
      reasons.push(`Minimum withdrawal threshold is ₹${minWithdrawalINR.toLocaleString('en-IN')}. Your available balance is insufficient.`);
    }

    const eligible = withdrawalRequestsEnabled && user.isEmailVerified && availablePaise >= minWithdrawalPaise;

    return {
      eligible,
      isEmailVerified: !!user.isEmailVerified,
      availableEarningsINR: paiseToRupees(availablePaise),
      minWithdrawalINR,
      maxWithdrawalINR,
      withdrawalChargePercent: adminChargePercent,
      tdsPercent,
      tdsEnabled,
      withdrawalRequestsEnabled,
      payoutExecutionEnabled: finSettings?.payoutExecutionEnabled ?? false,
      disabledReason,
      withdrawalChargePolicy: `Standard ${adminChargePercent}% Business Withdrawal Charge`,
      reasons,
      complianceMode: process.env.COMPLIANCE_MODE || 'SIMULATION_ONLY',
      manualSettlementWorkflow: true,
      notice:
        `Withdrawals are subject to a ${adminChargePercent}% business withdrawal charge (Net settlement = Gross - ${adminChargePercent}%).${tdsPercent > 0 ? ` Statutory TDS deduction: ${tdsPercent}%.` : ''} Automated payment gateway dispatches remain strictly simulation-only.`,
    };
  }

  /**
   * Member Withdrawal History
   */
  async getMyWithdrawals(userId: string) {
    const requests = await this.prisma.withdrawalRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return requests.map((w) => {
      const details = (w.bankDetails as any) || {};
      const grossPaise = w.amountPaise;
      const withdrawalChargePaise = details.withdrawalChargePaise
        ? BigInt(details.withdrawalChargePaise)
        : details.tdsPaise
        ? BigInt(details.tdsPaise)
        : (grossPaise * 10n) / 100n;
      const netPaise = details.netAmountPaise ? BigInt(details.netAmountPaise) : grossPaise - withdrawalChargePaise;

      return {
        id: w.id,
        grossAmountINR: paiseToRupees(grossPaise),
        withdrawalChargeINR: paiseToRupees(withdrawalChargePaise),
        netAmountINR: paiseToRupees(netPaise),
        status: w.status,
        destinationType: details.destinationType || 'BANK_ACCOUNT',
        destinationMasked: details.destinationMasked || 'N/A',
        utrNumber: details.utrNumber || null,
        settledAt: details.settledAt || null,
        rejectionReason: details.rejectionReason || null,
        adminNotes: w.adminNotes || null,
        createdAt: w.createdAt.toISOString(),
      };
    });
  }

  /**
   * Request withdrawal - Enforces server-side email verification, payout destination validation, and live payouts status
   */
  async requestWithdrawal(userId: string, dto?: RequestWithdrawalDto) {
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

    let destinationMasked = '';
    let encryptedPayoutDetails: any = null;

    if (dto) {
      if (dto.destinationType === PayoutDestinationType.BANK_ACCOUNT) {
        if (!dto.accountHolderName?.trim() || !dto.bankName?.trim() || !dto.accountNumber?.trim() || !dto.ifscCode?.trim()) {
          throw new BadRequestException('All Bank Account fields (Account Holder Name, Bank Name, Account Number, IFSC) are mandatory.');
        }
        if (dto.confirmAccountNumber && dto.confirmAccountNumber.trim() !== dto.accountNumber.trim()) {
          throw new BadRequestException('Account number and confirmation account number do not match.');
        }
        const cleanAcc = dto.accountNumber.trim();
        if (!/^\d{9,18}$/.test(cleanAcc)) {
          throw new BadRequestException('Invalid account number. Must contain between 9 and 18 numeric digits.');
        }
        const cleanIfsc = dto.ifscCode.trim().toUpperCase();
        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
          throw new BadRequestException('Invalid IFSC code format (e.g. HDFC0001234).');
        }
        // Fail closed: No plaintext fallback allowed
        if (!this.encryptionService) {
          throw new ServiceUnavailableException(
            'Secure encryption service is unavailable. Payout credential processing failed closed.'
          );
        }

        let encryptedAccountNumber: string;
        try {
          encryptedAccountNumber = this.encryptionService.encrypt(cleanAcc);
          if (!encryptedAccountNumber || encryptedAccountNumber === cleanAcc) {
            throw new Error('Encryption returned invalid or unencrypted result');
          }
        } catch {
          throw new ServiceUnavailableException(
            'Secure encryption service failed. Payout credential processing failed closed.'
          );
        }

        destinationMasked = `Bank: ${dto.bankName.trim()} (A/C: ••••${cleanAcc.slice(-4)}, IFSC: ${cleanIfsc})`;
        encryptedPayoutDetails = {
          type: 'BANK_ACCOUNT',
          accountHolderName: dto.accountHolderName.trim(),
          bankName: dto.bankName.trim(),
          encryptedAccountNumber,
          maskedAccountNumber: `••••${cleanAcc.slice(-4)}`,
          ifscCode: cleanIfsc,
        };
      } else if (dto.destinationType === PayoutDestinationType.UPI) {
        if (!dto.upiId?.trim() || !dto.accountHolderName?.trim()) {
          throw new BadRequestException('Beneficiary UPI ID and Account Holder Name are required for UPI withdrawal.');
        }
        const cleanUpi = dto.upiId.trim();
        if (!/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(cleanUpi)) {
          throw new BadRequestException('Invalid UPI ID format (e.g. member@okhdfcbank).');
        }

        // Fail closed: No plaintext fallback allowed
        if (!this.encryptionService) {
          throw new ServiceUnavailableException(
            'Secure encryption service is unavailable. Payout credential processing failed closed.'
          );
        }

        let encryptedUpiId: string;
        try {
          encryptedUpiId = this.encryptionService.encrypt(cleanUpi);
          if (!encryptedUpiId || encryptedUpiId === cleanUpi) {
            throw new Error('Encryption returned invalid or unencrypted result');
          }
        } catch {
          throw new ServiceUnavailableException(
            'Secure encryption service failed. Payout credential processing failed closed.'
          );
        }

        const parts = cleanUpi.split('@');
        const maskedUpiHandle = parts[0].length > 3 ? `${parts[0].slice(0, 2)}•••${parts[0].slice(-1)}@${parts[1]}` : `•••@${parts[1]}`;
        destinationMasked = `UPI: ${maskedUpiHandle} (${dto.accountHolderName.trim()})`;
        encryptedPayoutDetails = {
          type: 'UPI',
          accountHolderName: dto.accountHolderName.trim(),
          encryptedUpiId,
          maskedUpiId: maskedUpiHandle,
        };
      }
    }

    const finSettings = (this.prisma as any).financialSettings
      ? await (this.prisma as any).financialSettings.findUnique({ where: { id: 'GLOBAL' } })
      : null;

    const complianceMode = process.env.COMPLIANCE_MODE || 'SIMULATION_ONLY';
    const enableLivePayouts = process.env.ENABLE_LIVE_PAYOUTS === 'true' || (finSettings?.payoutExecutionEnabled ?? false);
    const enableManualWithdrawals = process.env.ENABLE_MANUAL_WITHDRAWALS === 'true' || (finSettings?.withdrawalRequestsEnabled ?? false);

    if (finSettings && !finSettings.withdrawalRequestsEnabled) {
      throw new BadRequestException(
        finSettings.withdrawalDisabledReason || 'Withdrawal requests are currently disabled by administration.'
      );
    }

    // Strictly enforce disabled live payouts if manual workflow is not activated
    if (!enableManualWithdrawals && (!enableLivePayouts || complianceMode === 'SIMULATION_ONLY')) {
      try {
        await this.prisma.auditLog.create({
          data: {
            actorId: userId,
            action: 'WITHDRAWAL_VALIDATION_SIMULATION_BLOCKED',
            entityType: 'User',
            entityId: userId,
            metadata: {
              destinationType: dto?.destinationType || 'UNSPECIFIED',
              destinationMasked: destinationMasked || undefined,
              complianceMode,
              livePayoutsEnabled: false,
              stored: false,
            },
          },
        });
      } catch { }

      return {
        success: false,
        restricted: true,
        livePayoutsEnabled: false,
        complianceMode,
        minWithdrawalINR: finSettings?.minWithdrawalINR ?? 1000,
        availableBalanceINR: paiseToRupees(user.wallet?.availableEarningsPaise || 0n),
        destinationMasked: destinationMasked || undefined,
        message:
          'Withdrawals are restricted in compliance simulation mode. Payout destination details were validated, but no live payout request or credentials were submitted or stored.',
      };
    }

    // Manual / UAT Settlement Workflow execution:
    const minINR = finSettings?.minWithdrawalINR ?? 1000;
    const maxINR = finSettings?.maxWithdrawalINR ?? null;
    const adminChargePct = finSettings?.adminChargePercent ?? 10;
    const tdsEnabled = finSettings?.tdsEnabled ?? false;
    const tdsPct = (tdsEnabled && finSettings?.tdsPercent) ? finSettings.tdsPercent : 0;

    const amountINR = dto?.amountINR ? Number(dto.amountINR) : 0;
    if (amountINR < minINR) {
      throw new BadRequestException(`Minimum withdrawal threshold is ₹${minINR.toLocaleString('en-IN')}.`);
    }
    if (maxINR && amountINR > maxINR) {
      throw new BadRequestException(`Maximum withdrawal threshold is ₹${maxINR.toLocaleString('en-IN')}.`);
    }

    const amountPaise = BigInt(Math.round(amountINR * 100));
    const availablePaise = user.wallet?.availableEarningsPaise || 0n;
    if (availablePaise < amountPaise) {
      throw new BadRequestException(
        `Insufficient available earnings. Requested: ₹${amountINR}, Available: ₹${paiseToRupees(availablePaise)}.`
      );
    }

    // Idempotency check: prevent duplicate submissions within 24h
    if (dto?.idempotencyKey) {
      const existingReq = await this.prisma.withdrawalRequest.findFirst({
        where: {
          userId,
          status: { in: ['PENDING', 'APPROVED'] },
        },
      });
      if (existingReq) {
        const details = (existingReq.bankDetails as any) || {};
        if (details.idempotencyKey === dto.idempotencyKey) {
          const reqGrossPaise = existingReq.amountPaise;
          const reqChargePaise = details.withdrawalChargePaise
            ? BigInt(details.withdrawalChargePaise)
            : (reqGrossPaise * BigInt(adminChargePct)) / 100n;
          const reqTdsPaise = details.tdsPaise ? BigInt(details.tdsPaise) : 0n;
          const reqNetPaise = details.netAmountPaise
            ? BigInt(details.netAmountPaise)
            : reqGrossPaise - reqChargePaise - reqTdsPaise;

          return {
            success: true,
            restricted: false,
            requestId: existingReq.id,
            status: existingReq.status,
            grossAmountINR: paiseToRupees(reqGrossPaise),
            withdrawalChargeINR: paiseToRupees(reqChargePaise),
            netAmountINR: paiseToRupees(reqNetPaise),
            destinationMasked: details.destinationMasked || destinationMasked,
            message: 'Withdrawal request already recorded (idempotent submission).',
          };
        }
      }
    }

    // Calculated Business Withdrawal Charge and optional TDS
    const withdrawalChargePaise = (amountPaise * BigInt(adminChargePct)) / 100n;
    const tdsPaise = tdsPct > 0 ? (amountPaise * BigInt(tdsPct)) / 100n : 0n;
    const netAmountPaise = amountPaise - withdrawalChargePaise - tdsPaise;
    const withdrawalId = randomUUID();

    // Execute atomic balance reservation & double-entry journal entry
    await this.prisma.$transaction(async (tx) => {
      // 1. Deduct requested amount from available earnings
      await tx.walletAccount.update({
        where: { userId },
        data: {
          availableEarningsPaise: {
            decrement: amountPaise,
          },
        },
      });

      // 2. Create double-entry journal entry: Debit MEMBER_EARNINGS_PAYABLE, Credit COMMISSION_HOLD_RESERVE
      await tx.journalEntry.create({
        data: {
          referenceId: `WTH_REQ_${withdrawalId}`,
          eventType: 'MEMBER_WITHDRAWAL_REQUESTED',
          narration: `Withdrawal request of ₹${amountINR} submitted by member ${user.memberId} (Gross: ₹${amountINR}, 10% Charge: ₹${paiseToRupees(withdrawalChargePaise)}, Net: ₹${paiseToRupees(netAmountPaise)})`,
          lines: {
            create: [
              {
                userId,
                account: JournalAccount.MEMBER_EARNINGS_PAYABLE,
                debitPaise: amountPaise,
                creditPaise: 0n,
                description: `Funds reserved for withdrawal ${withdrawalId}`,
              },
              {
                userId,
                account: JournalAccount.COMMISSION_HOLD_RESERVE,
                debitPaise: 0n,
                creditPaise: amountPaise,
                description: `Commission reserve held for pending settlement ${withdrawalId}`,
              },
            ],
          },
        },
      });

      // 3. Create WithdrawalRequest record
      await tx.withdrawalRequest.create({
        data: {
          id: withdrawalId,
          userId,
          amountPaise,
          status: 'PENDING',
          bankDetails: {
            grossAmountPaise: amountPaise.toString(),
            withdrawalChargePaise: withdrawalChargePaise.toString(),
            withdrawalChargePercent: adminChargePct,
            tdsPaise: tdsPaise.toString(),
            tdsPercent: tdsPct,
            netAmountPaise: netAmountPaise.toString(),
            destinationType: dto?.destinationType || PayoutDestinationType.BANK_ACCOUNT,
            destinationMasked,
            encryptedPayoutDetails,
            idempotencyKey: dto?.idempotencyKey || null,
          },
        },
      });

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'WITHDRAWAL_REQUEST_SUBMITTED',
          entityType: 'WithdrawalRequest',
          entityId: withdrawalId,
          metadata: {
            amountINR,
            withdrawalChargeINR: paiseToRupees(withdrawalChargePaise),
            netAmountINR: paiseToRupees(netAmountPaise),
            destinationType: dto?.destinationType,
            destinationMasked,
            complianceMode,
          },
        },
      });
    });

    // Send confirmation email asynchronously (non-blocking)
    if (this.emailService && user.email) {
      try {
        await this.emailService.sendWithdrawalRequestConfirmation(
          user.email,
          user.fullName || user.memberId,
          {
            requestId: withdrawalId,
            amountINR,
            destinationMasked,
            date: new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }),
          }
        );
      } catch { }
    }

    return {
      success: true,
      restricted: false,
      requestId: withdrawalId,
      grossAmountINR: amountINR,
      withdrawalChargeINR: paiseToRupees(withdrawalChargePaise),
      netAmountINR: paiseToRupees(netAmountPaise),
      status: 'PENDING',
      destinationMasked,
      message: 'Withdrawal request submitted successfully. Our finance team will review and process your settlement.',
    };
  }

  /**
   * Admin: List Withdrawal Requests with filtering & pagination
   */
  async getAdminWithdrawals(query: WithdrawalQueryDto) {
    const { status, page = 1, limit = 50, search } = query;
    const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
    const take = Math.min(100, Math.max(1, limit));

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (search?.trim()) {
      const q = search.trim();
      where.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { user: { memberId: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { user: { fullName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [items, total, pendingCount, approvedCount, settledCount, rejectedCount] = await Promise.all([
      this.prisma.withdrawalRequest.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              memberId: true,
              fullName: true,
              email: true,
              phone: true,
              currentPackage: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.withdrawalRequest.count({ where }),
      this.prisma.withdrawalRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.withdrawalRequest.count({ where: { status: 'APPROVED' } }),
      this.prisma.withdrawalRequest.count({ where: { status: 'SETTLED' } }),
      this.prisma.withdrawalRequest.count({ where: { status: 'REJECTED' } }),
    ]);

    let totalGrossPaise = 0n;
    let totalNetPaise = 0n;
    let totalWithdrawalChargePaise = 0n;

    const formattedItems = (items as any[]).map((w) => {
      const details = (w.bankDetails as any) || {};
      const grossPaise = w.amountPaise;
      const withdrawalChargePaise = details.withdrawalChargePaise
        ? BigInt(details.withdrawalChargePaise)
        : details.tdsPaise
        ? BigInt(details.tdsPaise)
        : (grossPaise * 10n) / 100n;
      const netPaise = details.netAmountPaise ? BigInt(details.netAmountPaise) : grossPaise - withdrawalChargePaise;

      totalGrossPaise += grossPaise;
      totalNetPaise += netPaise;
      totalWithdrawalChargePaise += withdrawalChargePaise;

      const user = w.user || {};
      return {
        id: w.id,
        memberId: user.memberId || 'N/A',
        memberName: user.fullName || 'Member',
        email: user.email || 'N/A',
        mobileNumber: user.phone || 'N/A',
        currentPackage: user.currentPackage || 'N/A',
        grossAmountINR: paiseToRupees(grossPaise),
        withdrawalChargeINR: paiseToRupees(withdrawalChargePaise),
        netAmountINR: paiseToRupees(netPaise),
        status: w.status,
        destinationType: details.destinationType || 'BANK_ACCOUNT',
        destinationMasked: details.destinationMasked || 'N/A',
        utrNumber: details.utrNumber || null,
        settledAt: details.settledAt || null,
        rejectionReason: details.rejectionReason || null,
        adminNotes: w.adminNotes || null,
        createdAt: w.createdAt.toISOString(),
      };
    });

    return {
      items: formattedItems,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / take) || 1,
      },
      summary: {
        pendingCount,
        approvedCount,
        settledCount,
        rejectedCount,
        pageGrossTotalINR: paiseToRupees(totalGrossPaise),
        pageNetTotalINR: paiseToRupees(totalNetPaise),
        pageWithdrawalChargeTotalINR: paiseToRupees(totalWithdrawalChargePaise),
      },
    };
  }

  /**
   * Enforces financial activation gates on all financial mutation operations.
   * In Production SIMULATION_ONLY mode, live financial activations and manual withdrawals are disabled.
   */
  private async ensureFinancialMutationAllowed(actionName: string) {
    const complianceMode = process.env.COMPLIANCE_MODE || 'SIMULATION_ONLY';
    const enableLivePayouts = process.env.ENABLE_LIVE_PAYOUTS === 'true';
    const enableManualWithdrawals = process.env.ENABLE_MANUAL_WITHDRAWALS === 'true';

    const finSettings = (this.prisma as any).financialSettings
      ? await (this.prisma as any).financialSettings.findUnique({ where: { id: 'GLOBAL' } })
      : null;

    const withdrawalsAllowed = enableManualWithdrawals || (finSettings?.withdrawalRequestsEnabled ?? false);
    const payoutsAllowed = enableLivePayouts || (finSettings?.payoutExecutionEnabled ?? false);

    if (!withdrawalsAllowed && !payoutsAllowed) {
      throw new ForbiddenException(
        `Financial mutations are strictly disabled in Production (${actionName} blocked). Live financial activations and manual withdrawals are disabled.`
      );
    }
  }

  /**
   * Admin: Approve Withdrawal Request
   */
  async adminApproveWithdrawal(adminUserId: string, withdrawalId: string, dto?: AdminApproveWithdrawalDto) {
    await this.ensureFinancialMutationAllowed('Withdrawal Approval');
    const withdrawal = await this.prisma.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
      include: { user: true },
    });

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal request not found.');
    }
    if (withdrawal.status !== 'PENDING') {
      throw new BadRequestException(`Cannot approve withdrawal with status ${withdrawal.status}. Must be PENDING.`);
    }

    const currentDetails = (withdrawal.bankDetails as any) || {};
    const updatedDetails = {
      ...currentDetails,
      approvedBy: adminUserId,
      approvedAt: new Date().toISOString(),
      adminNotes: dto?.adminNotes || withdrawal.adminNotes,
    };

    const updated = await this.prisma.withdrawalRequest.update({
      where: { id: withdrawalId },
      data: {
        status: 'APPROVED',
        adminNotes: dto?.adminNotes || withdrawal.adminNotes,
        bankDetails: updatedDetails,
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        actorId: adminUserId,
        action: 'WITHDRAWAL_APPROVED_BY_ADMIN',
        entityType: 'WithdrawalRequest',
        entityId: withdrawalId,
        metadata: {
          adminUserId,
          amountINR: paiseToRupees(withdrawal.amountPaise),
          adminNotes: dto?.adminNotes,
        },
      },
    });

    // Notify member via email
    if (this.emailService && withdrawal.user.email) {
      try {
        await this.emailService.sendWithdrawalStatusEmail(
          withdrawal.user.email,
          withdrawal.user.fullName || withdrawal.user.memberId,
          {
            requestId: withdrawalId,
            status: 'APPROVED',
            amountINR: paiseToRupees(withdrawal.amountPaise),
          }
        );
      } catch { }
    }

    return {
      success: true,
      requestId: updated.id,
      status: updated.status,
      message: 'Withdrawal request approved successfully. Ready for bank settlement.',
    };
  }

  /**
   * Admin: Reject Withdrawal Request (Refunds reserved balance with journal reversal)
   */
  async adminRejectWithdrawal(adminUserId: string, withdrawalId: string, dto: AdminRejectWithdrawalDto) {
    await this.ensureFinancialMutationAllowed('Withdrawal Rejection');
    const withdrawal = await this.prisma.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
      include: { user: true },
    });

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal request not found.');
    }
    if (withdrawal.status === 'SETTLED' || withdrawal.status === 'REJECTED') {
      throw new BadRequestException(`Cannot reject withdrawal with status ${withdrawal.status}.`);
    }

    const currentDetails = (withdrawal.bankDetails as any) || {};
    const updatedDetails = {
      ...currentDetails,
      rejectedBy: adminUserId,
      rejectedAt: new Date().toISOString(),
      rejectionReason: dto.rejectionReason,
      adminNotes: dto.adminNotes || withdrawal.adminNotes,
    };

    await this.prisma.$transaction(async (tx) => {
      // 1. Refund the member's wallet
      await tx.walletAccount.update({
        where: { userId: withdrawal.userId },
        data: {
          availableEarningsPaise: {
            increment: withdrawal.amountPaise,
          },
        },
      });

      // 2. Reversal journal entry: Debit COMMISSION_HOLD_RESERVE, Credit MEMBER_EARNINGS_PAYABLE
      await tx.journalEntry.create({
        data: {
          referenceId: `WTH_REJ_${withdrawalId}`,
          eventType: 'MEMBER_WITHDRAWAL_REJECTED',
          narration: `Reversal of withdrawal request ${withdrawalId}: rejected by admin (${dto.rejectionReason})`,
          lines: {
            create: [
              {
                userId: withdrawal.userId,
                account: JournalAccount.COMMISSION_HOLD_RESERVE,
                debitPaise: withdrawal.amountPaise,
                creditPaise: 0n,
                description: `Hold release on rejected withdrawal ${withdrawalId}`,
              },
              {
                userId: withdrawal.userId,
                account: JournalAccount.MEMBER_EARNINGS_PAYABLE,
                debitPaise: 0n,
                creditPaise: withdrawal.amountPaise,
                description: `Refund available earnings for rejected withdrawal ${withdrawalId}`,
              },
            ],
          },
        },
      });

      // 3. Update withdrawal request status
      await tx.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: {
          status: 'REJECTED',
          adminNotes: dto.adminNotes || withdrawal.adminNotes,
          bankDetails: updatedDetails,
        },
      });

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          actorId: adminUserId,
          action: 'WITHDRAWAL_REJECTED_BY_ADMIN',
          entityType: 'WithdrawalRequest',
          entityId: withdrawalId,
          metadata: {
            adminUserId,
            rejectionReason: dto.rejectionReason,
            amountINR: paiseToRupees(withdrawal.amountPaise),
          },
        },
      });
    });

    // Notify member via email
    if (this.emailService && withdrawal.user.email) {
      try {
        await this.emailService.sendWithdrawalStatusEmail(
          withdrawal.user.email,
          withdrawal.user.fullName || withdrawal.user.memberId,
          {
            requestId: withdrawalId,
            status: 'REJECTED',
            amountINR: paiseToRupees(withdrawal.amountPaise),
            reason: dto.rejectionReason,
          }
        );
      } catch { }
    }

    return {
      success: true,
      requestId: withdrawalId,
      status: 'REJECTED',
      refundedINR: paiseToRupees(withdrawal.amountPaise),
      message: 'Withdrawal request rejected and reserved balance refunded to member.',
    };
  }

  /**
   * Admin: Settle Withdrawal via Bank Transfer (Records UTR & posts final settlement journal)
   */
  async adminSettleWithdrawal(adminUserId: string, withdrawalId: string, dto: AdminSettleWithdrawalDto) {
    await this.ensureFinancialMutationAllowed('Withdrawal Settlement');
    if (!dto.utrNumber?.trim()) {
      throw new BadRequestException('Valid Bank UTR / Reference number is required for manual settlement.');
    }

    const withdrawal = await this.prisma.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
      include: { user: true },
    });

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal request not found.');
    }
    if (withdrawal.status === 'SETTLED') {
      throw new BadRequestException('This withdrawal has already been settled.');
    }
    if (withdrawal.status === 'REJECTED') {
      throw new BadRequestException('Cannot settle a rejected withdrawal.');
    }

    const cleanUtr = dto.utrNumber.trim();
    const settlementDate = dto.settlementDate || new Date().toISOString();
    const details = (withdrawal.bankDetails as any) || {};
    const grossPaise = withdrawal.amountPaise;
    const withdrawalChargePaise = details.withdrawalChargePaise
      ? BigInt(details.withdrawalChargePaise)
      : details.tdsPaise
      ? BigInt(details.tdsPaise)
      : (grossPaise * 10n) / 100n;
    const netPaise = details.netAmountPaise ? BigInt(details.netAmountPaise) : grossPaise - withdrawalChargePaise;

    const updatedDetails = {
      ...details,
      settledBy: adminUserId,
      settledAt: settlementDate,
      utrNumber: cleanUtr,
      adminNotes: dto.adminNotes || withdrawal.adminNotes,
    };

    await this.prisma.$transaction(async (tx) => {
      // 1. Update wallet totalWithdrawnPaise
      await tx.walletAccount.update({
        where: { userId: withdrawal.userId },
        data: {
          totalWithdrawnPaise: {
            increment: grossPaise,
          },
        },
      });

      // 2. Final settlement journal:
      // Debit: COMMISSION_HOLD_RESERVE (Gross amount released)
      // Credit: CASH_AND_BANK (Net payout transferred to bank)
      // Credit: MEMBER_EARNINGS_PAYABLE / Withdrawal Charge Revenue (10% Business Withdrawal Charge)
      await tx.journalEntry.create({
        data: {
          referenceId: `WTH_SETTLE_${withdrawalId}`,
          eventType: 'MEMBER_WITHDRAWAL_SETTLED',
          narration: `Bank settlement for withdrawal ${withdrawalId} via UTR ${cleanUtr} (Net: ₹${paiseToRupees(netPaise)}, 10% Charge: ₹${paiseToRupees(withdrawalChargePaise)})`,
          lines: {
            create: [
              {
                userId: withdrawal.userId,
                account: JournalAccount.COMMISSION_HOLD_RESERVE,
                debitPaise: grossPaise,
                creditPaise: 0n,
                description: `Settlement release for withdrawal ${withdrawalId}`,
              },
              {
                userId: withdrawal.userId,
                account: JournalAccount.CASH_AND_BANK,
                debitPaise: 0n,
                creditPaise: netPaise,
                description: `Bank payout via UTR ${cleanUtr}`,
              },
              {
                userId: withdrawal.userId,
                account: JournalAccount.MEMBER_EARNINGS_PAYABLE,
                debitPaise: 0n,
                creditPaise: withdrawalChargePaise,
                description: `10% Business Withdrawal Charge for UTR ${cleanUtr}`,
              },
            ],
          },
        },
      });

      // 3. Mark withdrawal request SETTLED
      await tx.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: {
          status: 'SETTLED',
          adminNotes: dto.adminNotes || withdrawal.adminNotes,
          bankDetails: updatedDetails,
        },
      });

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          actorId: adminUserId,
          action: 'WITHDRAWAL_SETTLED_MANUALLY',
          entityType: 'WithdrawalRequest',
          entityId: withdrawalId,
          metadata: {
            adminUserId,
            utrNumber: cleanUtr,
            grossAmountINR: paiseToRupees(grossPaise),
            netAmountINR: paiseToRupees(netPaise),
            withdrawalChargeINR: paiseToRupees(withdrawalChargePaise),
            settlementDate,
          },
        },
      });
    });

    // Send bank settlement confirmation email
    if (this.emailService && withdrawal.user.email) {
      try {
        await this.emailService.sendBankSettlementConfirmation(
          withdrawal.user.email,
          withdrawal.user.fullName || withdrawal.user.memberId,
          {
            requestId: withdrawalId,
            amountINR: paiseToRupees(grossPaise),
            utrNumber: cleanUtr,
            settlementDate: new Date(settlementDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }),
            destinationMasked: details.destinationMasked || 'Registered Bank Account',
          }
        );
      } catch { }
    }

    return {
      success: true,
      requestId: withdrawalId,
      status: 'SETTLED',
      utrNumber: cleanUtr,
      settledGrossINR: paiseToRupees(grossPaise),
      settledNetINR: paiseToRupees(netPaise),
      withdrawalChargeINR: paiseToRupees(withdrawalChargePaise),
      message: `Withdrawal successfully marked settled with Bank UTR ${cleanUtr}.`,
    };
  }

  /**
   * Admin: Export Withdrawals to CSV format for Finance team
   */
  async exportWithdrawalReport(query: WithdrawalQueryDto): Promise<string> {
    const { status, search } = query;
    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (search?.trim()) {
      const q = search.trim();
      where.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { user: { memberId: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const items = await this.prisma.withdrawalRequest.findMany({
      where,
      include: {
        user: {
          select: {
            memberId: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    const headers = [
      'Request ID',
      'Member ID',
      'Full Name',
      'Email',
      'Mobile',
      'Gross Amount (INR)',
      'Withdrawal Charge 10% (INR)',
      'Net Settlement (INR)',
      'Destination Type',
      'Destination Masked',
      'Status',
      'UTR Number',
      'Settled At',
      'Created At',
      'Admin Notes',
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = (items as any[]).map((w) => {
      const details = (w.bankDetails as any) || {};
      const grossPaise = w.amountPaise;
      const withdrawalChargePaise = details.withdrawalChargePaise
        ? BigInt(details.withdrawalChargePaise)
        : details.tdsPaise
        ? BigInt(details.tdsPaise)
        : (grossPaise * 10n) / 100n;
      const netPaise = details.netAmountPaise ? BigInt(details.netAmountPaise) : grossPaise - withdrawalChargePaise;
      const user = w.user || {};

      return [
        escapeCsv(w.id),
        escapeCsv(user.memberId || 'N/A'),
        escapeCsv(user.fullName || 'Member'),
        escapeCsv(user.email || 'N/A'),
        escapeCsv(user.phone || ''),
        escapeCsv(paiseToRupees(grossPaise)),
        escapeCsv(paiseToRupees(withdrawalChargePaise)),
        escapeCsv(paiseToRupees(netPaise)),
        escapeCsv(details.destinationType || 'BANK_ACCOUNT'),
        escapeCsv(details.destinationMasked || 'N/A'),
        escapeCsv(w.status),
        escapeCsv(details.utrNumber || ''),
        escapeCsv(details.settledAt || ''),
        escapeCsv(w.createdAt.toISOString()),
        escapeCsv(w.adminNotes || details.rejectionReason || ''),
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * EV Club Fund Overview & Utilization Readiness (Task 5)
   */
  async getEvClubFundOverview(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        memberId: true,
        fullName: true,
        currentPackage: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Member not found');
    }

    // Direct sponsor qualification calculation:
    const activeDirectsCount = await this.prisma.user.count({
      where: {
        sponsorId: user.id,
        currentPackage: { in: ['BASIC', 'FULL'] },
      },
    });

    const isQualified = activeDirectsCount >= 3;

    // Check member's matrix placement
    const placement = await this.prisma.legacyMatrixPlacement.findUnique({
      where: { userId },
    });

    let evClubProjectedINR = 0;
    if (placement) {
      // Traverse downline odd levels (1, 3, 5, 7)
      const oddLevels = [1, 3, 5, 7];
      let currentLayerIds = [placement.id];

      for (let level = 1; level <= 8; level++) {
        if (currentLayerIds.length === 0) break;
        const children = await this.prisma.legacyMatrixPlacement.findMany({
          where: { parentId: { in: currentLayerIds } },
          select: { id: true },
        });
        if (oddLevels.includes(level)) {
          const unitRate = level >= 5 ? 300 : 200;
          evClubProjectedINR += children.length * unitRate;
        }
        currentLayerIds = children.map((c) => c.id);
      }
    }

    const evClubQualifiedINR = isQualified ? evClubProjectedINR : 0;
    const evClubCreditedINR = 0; // Strictly prospective, 0 in production

    return {
      userId,
      memberId: user.memberId,
      isQualified,
      activeDirectsCount,
      requiredDirects: 3,
      fundMetrics: {
        evClubProjectedINR,
        evClubQualifiedINR,
        evClubCreditedINR,
        availableForUtilizationINR: evClubCreditedINR,
        currency: 'INR',
      },
      accountingPolicy: {
        source: 'Odd Levels of EV Legacy 3×8 Matrix (Levels 1, 3, 5, 7)',
        status: 'SIMULATION_ONLY',
        withdrawableToBank: false,
        purpose:
          'Dedicated Clean Mobility Incentive. Cannot be withdrawn to bank accounts. Earmarked exclusively for showroom purchases, charging hardware, and battery care.',
      },
      utilizationPrograms: [
        {
          id: 'EV_PURCHASE_CREDIT',
          title: 'Askr EV Showroom Purchase Credit',
          description:
            'Apply accumulated EV Club Fund balance toward down payment or full purchase of approved electric two-wheelers, scooters, or cars across all Askr EV partner showrooms.',
          maxRedemptionPercent: 100,
          status: 'PROGRAM_ANNOUNCED',
        },
        {
          id: 'CHARGER_BUNDLE',
          title: 'Home EV AC Fast Charger & Solar Bundle',
          description:
            'Redeem for a certified 7.4kW Type-2 Home EV Charger, smart energy metering box, and rooftop solar connection accessory kit.',
          maxRedemptionPercent: 100,
          status: 'PROGRAM_ANNOUNCED',
        },
        {
          id: 'BATTERY_HEALTH_CARE',
          title: '3-Year Extended Battery Warranty & Comprehensive Service',
          description:
            'Comprehensive battery cell balancing, health certification, roadside assistance, and replacement warranty protection.',
          maxRedemptionPercent: 100,
          status: 'PROGRAM_ANNOUNCED',
        },
      ],
    };
  }

  /**
   * EV Club Fund Utilization Request (Task 5)
   */
  async requestClubFundUtilization(userId: string, optionId: string, amountINR: number) {
    const overview = await this.getEvClubFundOverview(userId);

    const validPrograms = ['EV_PURCHASE_CREDIT', 'CHARGER_BUNDLE', 'BATTERY_HEALTH_CARE'];
    if (!validPrograms.includes(optionId)) {
      throw new BadRequestException(`Invalid EV Club Fund program ID: ${optionId}`);
    }

    if (amountINR <= 0) {
      throw new BadRequestException('Utilization amount must be greater than zero.');
    }

    // In current UAT / Production, utilization policy is pending commercial rollout
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: userId,
          action: 'EV_CLUB_FUND_UTILIZATION_SIMULATION_REQUESTED',
          entityType: 'User',
          entityId: userId,
          metadata: {
            programId: optionId,
            requestedAmountINR: amountINR,
            qualifiedFundINR: overview.fundMetrics.evClubQualifiedINR,
            complianceMode: process.env.COMPLIANCE_MODE || 'SIMULATION_ONLY',
          },
        },
      });
    } catch { }

    return {
      success: false,
      status: 'POLICY_PENDING_APPROVAL',
      programId: optionId,
      requestedAmountINR: amountINR,
      qualifiedBalanceINR: overview.fundMetrics.evClubQualifiedINR,
      message:
        'EV Club Fund commercial redemption is currently in preview mode. Live utilization will open alongside authorized showroom delivery partners upon completion of statutory direct selling compliance filings.',
    };
  }
}


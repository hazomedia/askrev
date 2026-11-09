import { Injectable, Logger } from '@nestjs/common';
import {
  FINANCIAL_RULES,
  JournalAccount,
  MembershipPackage,
  QualificationMethod,
  SimulationEvent,
  SimulationResult,
  BinaryMatchInput,
  BinaryMatchResult,
  rupeesToPaise,
  paiseToRupees,
  formatINR,
  safeBigIntMax,
  safeBigIntMin,
} from '@askrev/shared';

export interface SimulatedDirectReferral {
  memberId: string;
  name: string;
  initialPackage: MembershipPackage;
  upgradesToFull?: boolean;
  upgradeOrder?: number;
  qualificationMethod?: QualificationMethod;
  refunded?: boolean;
}

export interface SimulationInput {
  sponsorMemberId: string;
  directReferrals: SimulatedDirectReferral[];
  initialHoldReservePaise?: bigint;
  initialAvailableEarningsPaise?: bigint;
}

interface InternalDirectRecord {
  memberId: string;
  name: string;
  currentPackage: MembershipPackage;
  isFullQualified: boolean;
  basicCommissionPaidPaise: bigint;
  qualifiedCommissionCreditedPaise: bigint;
  voucherIssuedPaise: bigint;
  qualificationOrder: number;
}

@Injectable()
export class CommissionSimulatorService {
  private readonly logger = new Logger(CommissionSimulatorService.name);

  /**
   * Run the deterministic commission simulation for a sponsor with their directs.
   * Fully adheres to double-entry accounting and hold/recovery ledgers.
   */
  public simulateSponsorChain(input: SimulationInput): SimulationResult {
    let availableEarnings = input.initialAvailableEarningsPaise ?? 0n;
    let heldCommissions = input.initialHoldReservePaise ?? 0n;
    let pendingRecovery = 0n;
    let shoppingVoucher = 0n;

    let totalActivatedDirects = 0;
    let totalFullQualifiedDirects = 0;

    const directRecords = new Map<string, InternalDirectRecord>();
    const events: SimulationEvent[] = [];
    let stepNumber = 1;

    // Helper to log and record journal entries
    const recordEvent = (
      eventType: SimulationEvent['eventType'],
      memberId: string,
      memberName: string,
      description: string,
      deltas: {
        walletDeltaPaise: bigint;
        holdDeltaPaise: bigint;
        recoveryDeltaPaise: bigint;
        voucherDeltaPaise: bigint;
      },
      journalLines: SimulationEvent['journalLines']
    ) => {
      availableEarnings += deltas.walletDeltaPaise;
      heldCommissions += deltas.holdDeltaPaise;
      pendingRecovery += deltas.recoveryDeltaPaise;
      shoppingVoucher += deltas.voucherDeltaPaise;

      // Verification: withdrawable wallet must never drop below 0
      if (availableEarnings < 0n) {
        throw new Error(`Insolvency Violation: Available earnings dropped below zero (${availableEarnings} paise)`);
      }

      events.push({
        step: stepNumber++,
        eventType,
        memberId,
        memberName,
        description,
        walletDeltaPaise: deltas.walletDeltaPaise,
        holdDeltaPaise: deltas.holdDeltaPaise,
        recoveryDeltaPaise: deltas.recoveryDeltaPaise,
        voucherDeltaPaise: deltas.voucherDeltaPaise,
        resultingWalletState: {
          availableEarningsINR: paiseToRupees(availableEarnings),
          heldCommissionsINR: paiseToRupees(heldCommissions),
          pendingRecoveryINR: paiseToRupees(pendingRecovery),
          shoppingVoucherINR: paiseToRupees(shoppingVoucher),
        },
        journalLines,
      });
    };

    // PHASE A: Process initial activations in given order
    for (const ref of input.directReferrals) {
      if (ref.initialPackage === MembershipPackage.FREE) {
        directRecords.set(ref.memberId, {
          memberId: ref.memberId,
          name: ref.name,
          currentPackage: MembershipPackage.FREE,
          isFullQualified: false,
          basicCommissionPaidPaise: 0n,
          qualifiedCommissionCreditedPaise: 0n,
          voucherIssuedPaise: 0n,
          qualificationOrder: 0,
        });

        recordEvent(
          'BASIC_ACTIVATION',
          ref.memberId,
          ref.name,
          `Free registration for ${ref.name} (${ref.memberId}). No commission generated.`,
          { walletDeltaPaise: 0n, holdDeltaPaise: 0n, recoveryDeltaPaise: 0n, voucherDeltaPaise: 0n },
          []
        );
        continue;
      }

      if (ref.initialPackage === MembershipPackage.BASIC) {
        totalActivatedDirects++;
        const record: InternalDirectRecord = {
          memberId: ref.memberId,
          name: ref.name,
          currentPackage: MembershipPackage.BASIC,
          isFullQualified: false,
          basicCommissionPaidPaise: FINANCIAL_RULES.BASIC_SPONSOR_COMMISSION_PAISE,
          qualifiedCommissionCreditedPaise: 0n,
          voucherIssuedPaise: 0n,
          qualificationOrder: 0,
        };
        directRecords.set(ref.memberId, record);

        // Commission Hold Reserve Rule:
        // Before 2nd Full Qualified direct, maintain one ₹1,000 hold reserve when sufficient basic commissions are available.
        const shouldHold = totalFullQualifiedDirects < 2 && heldCommissions < FINANCIAL_RULES.BASIC_HOLD_RESERVE_TARGET_PAISE;

        if (shouldHold) {
          recordEvent(
            'BASIC_ACTIVATION',
            ref.memberId,
            ref.name,
            `Basic ₹3,000 activation by ${ref.name}. ₹1,000 commission held in reserve (target reserve of ₹1,000 maintained).`,
            {
              walletDeltaPaise: 0n,
              holdDeltaPaise: FINANCIAL_RULES.BASIC_SPONSOR_COMMISSION_PAISE,
              recoveryDeltaPaise: 0n,
              voucherDeltaPaise: 0n,
            },
            [
              {
                account: JournalAccount.CASH_AND_BANK,
                debitINR: 3000,
                creditINR: 0,
                description: `Joining fee received from ${ref.name}`,
              },
              {
                account: JournalAccount.PLATFORM_JOINING_REVENUE,
                debitINR: 0,
                creditINR: 3000,
                description: `Joining fee revenue recognized for ${ref.name}`,
              },
              {
                account: JournalAccount.DIRECT_SPONSOR_COMMISSION_EXPENSE,
                debitINR: 1000,
                creditINR: 0,
                description: `Commission expense for basic activation of ${ref.name}`,
              },
              {
                account: JournalAccount.COMMISSION_HOLD_RESERVE,
                debitINR: 0,
                creditINR: 1000,
                description: `Hold reserve payable recorded for sponsor`,
              },
            ]
          );
        } else {
          recordEvent(
            'BASIC_ACTIVATION',
            ref.memberId,
            ref.name,
            `Basic ₹3,000 activation by ${ref.name}. ₹1,000 commission released to wallet.`,
            {
              walletDeltaPaise: FINANCIAL_RULES.BASIC_SPONSOR_COMMISSION_PAISE,
              holdDeltaPaise: 0n,
              recoveryDeltaPaise: 0n,
              voucherDeltaPaise: 0n,
            },
            [
              {
                account: JournalAccount.CASH_AND_BANK,
                debitINR: 3000,
                creditINR: 0,
                description: `Joining fee received from ${ref.name}`,
              },
              {
                account: JournalAccount.PLATFORM_JOINING_REVENUE,
                debitINR: 0,
                creditINR: 3000,
                description: `Joining fee revenue recognized for ${ref.name}`,
              },
              {
                account: JournalAccount.DIRECT_SPONSOR_COMMISSION_EXPENSE,
                debitINR: 1000,
                creditINR: 0,
                description: `Commission expense for basic activation of ${ref.name}`,
              },
              {
                account: JournalAccount.MEMBER_EARNINGS_PAYABLE,
                debitINR: 0,
                creditINR: 1000,
                description: `Earnings payable credited to sponsor wallet`,
              },
            ]
          );
        }
      }

      if (ref.initialPackage === MembershipPackage.FULL) {
        totalActivatedDirects++;
        totalFullQualifiedDirects++;
        const qualificationOrder = totalFullQualifiedDirects;

        const record: InternalDirectRecord = {
          memberId: ref.memberId,
          name: ref.name,
          currentPackage: MembershipPackage.FULL,
          isFullQualified: true,
          basicCommissionPaidPaise: 0n,
          qualifiedCommissionCreditedPaise: 0n,
          voucherIssuedPaise: 0n,
          qualificationOrder,
        };
        directRecords.set(ref.memberId, record);

        this.applyFullQualificationEntitlement(
          qualificationOrder,
          ref,
          record,
          availableEarnings,
          heldCommissions,
          pendingRecovery,
          shoppingVoucher,
          recordEvent
        );
      }
    }

    // PHASE B: Process Upgrades in specified sequence
    const upgradeCandidates = input.directReferrals
      .filter((r) => r.upgradesToFull && r.initialPackage !== MembershipPackage.FULL)
      .sort((a, b) => (a.upgradeOrder ?? 99) - (b.upgradeOrder ?? 99));

    for (const ref of upgradeCandidates) {
      const record = directRecords.get(ref.memberId);
      if (!record || record.isFullQualified) {
        continue; // Never grant qualification twice
      }

      totalFullQualifiedDirects++;
      const qualificationOrder = totalFullQualifiedDirects;
      record.currentPackage = MembershipPackage.FULL;
      record.isFullQualified = true;
      record.qualificationOrder = qualificationOrder;

      this.applyFullQualificationEntitlement(
        qualificationOrder,
        ref,
        record,
        availableEarnings,
        heldCommissions,
        pendingRecovery,
        shoppingVoucher,
        recordEvent
      );
    }

    // Validate that all recorded journal entries are strictly balanced
    const doubleEntryBalanced = events.every((event) => {
      const totalDebit = event.journalLines.reduce((sum, line) => sum + line.debitINR, 0);
      const totalCredit = event.journalLines.reduce((sum, line) => sum + line.creditINR, 0);
      return Math.abs(totalDebit - totalCredit) < 0.0001;
    });

    return {
      sponsorMemberId: input.sponsorMemberId,
      totalDirects: input.directReferrals.length,
      totalActivatedDirects,
      totalFullQualifiedDirects,
      finalWalletState: {
        availableEarningsINR: paiseToRupees(availableEarnings),
        heldCommissionsINR: paiseToRupees(heldCommissions),
        pendingRecoveryINR: paiseToRupees(pendingRecovery),
        shoppingVoucherINR: paiseToRupees(shoppingVoucher),
        availableEarningsPaise: availableEarnings.toString(),
        heldCommissionsPaise: heldCommissions.toString(),
        pendingRecoveryPaise: pendingRecovery.toString(),
        shoppingVoucherPaise: shoppingVoucher.toString(),
      },
      events,
      doubleEntryBalanced,
      complianceNotice:
        'All financial figures generated in SIMULATION_ONLY mode. Live payouts and MLM matching rewards are strictly deactivated pending regulatory sign-off.',
    };
  }

  private applyFullQualificationEntitlement(
    qualificationOrder: number,
    ref: SimulatedDirectReferral,
    record: InternalDirectRecord,
    currentAvailable: bigint,
    currentHeld: bigint,
    currentRecovery: bigint,
    currentVoucher: bigint,
    recordEvent: Function
  ) {
    if (qualificationOrder === 1 || qualificationOrder >= 3) {
      // 1st or 3rd+ Full Qualified Direct: ₹10,000 total wallet entitlement.
      // Offset any previously paid basic commission (e.g. ₹1,000).
      const totalEntitlement = FINANCIAL_RULES.QUALIFIED_DIRECT_1ST_ENTITLEMENT_PAISE; // ₹10,000
      const previousPaid = record.basicCommissionPaidPaise;
      const netWalletDelta = totalEntitlement - previousPaid; // e.g. ₹9,000

      record.qualifiedCommissionCreditedPaise = netWalletDelta;

      const feePaise = ref.initialPackage === MembershipPackage.FULL ? 3300000n : 3000000n;
      const feeINR = paiseToRupees(feePaise);
      const netWalletINR = paiseToRupees(netWalletDelta);
      const previousPaidINR = paiseToRupees(previousPaid);

      recordEvent(
        'UPGRADE_TO_FULL',
        ref.memberId,
        ref.name,
        `Qualification #${qualificationOrder} by ${ref.name}. Total entitlement ₹10,000. Less prior ₹${previousPaidINR} basic commission = Proposed wallet credit ₹${netWalletINR}.`,
        {
          walletDeltaPaise: netWalletDelta,
          holdDeltaPaise: 0n,
          recoveryDeltaPaise: 0n,
          voucherDeltaPaise: 0n,
        },
        [
          {
            account: JournalAccount.CASH_AND_BANK,
            debitINR: feeINR,
            creditINR: 0,
            description: `Payment received for full qualification of ${ref.name}`,
          },
          {
            account: JournalAccount.PLATFORM_JOINING_REVENUE,
            debitINR: 0,
            creditINR: feeINR,
            description: `Revenue recognized for qualification of ${ref.name}`,
          },
          {
            account: JournalAccount.DIRECT_SPONSOR_COMMISSION_EXPENSE,
            debitINR: netWalletINR,
            creditINR: 0,
            description: `Additional commission expense for direct #${qualificationOrder}`,
          },
          {
            account: JournalAccount.MEMBER_EARNINGS_PAYABLE,
            debitINR: 0,
            creditINR: netWalletINR,
            description: `Earnings payable credited to sponsor wallet`,
          },
        ]
      );
    } else if (qualificationOrder === 2) {
      // 2nd Full Qualified Direct:
      // 1. Issue proposed ₹30,000 Shopping Voucher (not cash).
      // 2. Release sponsor-level ₹1,000 hold reserve.
      // 3. Reconcile/recover earlier ₹1,000 basic commission attributable to that referral.
      // Modeled as distinct journal transactions!
      const voucherAmountPaise = FINANCIAL_RULES.QUALIFIED_DIRECT_2ND_VOUCHER_PAISE; // ₹30,000
      const holdToReleasePaise = currentHeld >= FINANCIAL_RULES.BASIC_HOLD_RESERVE_TARGET_PAISE
        ? FINANCIAL_RULES.BASIC_HOLD_RESERVE_TARGET_PAISE
        : currentHeld;
      const priorCommissionToRecover = record.basicCommissionPaidPaise; // ₹1,000 if previously paid

      record.voucherIssuedPaise = voucherAmountPaise;

      // Journal 1: Voucher Issuance (Distinct Liability, not withdrawable cash)
      recordEvent(
        'UPGRADE_TO_FULL',
        ref.memberId,
        ref.name,
        `Qualification #2 by ${ref.name}. Issued ₹30,000 Shopping Voucher (distinct liability, non-withdrawable).`,
        {
          walletDeltaPaise: 0n,
          holdDeltaPaise: 0n,
          recoveryDeltaPaise: 0n,
          voucherDeltaPaise: voucherAmountPaise,
        },
        [
          {
            account: JournalAccount.SHOPPING_VOUCHER_PROMO_EXPENSE,
            debitINR: 30000,
            creditINR: 0,
            description: `Promotional voucher incentive expense for 2nd qualified direct`,
          },
          {
            account: JournalAccount.SHOPPING_VOUCHER_LIABILITY,
            debitINR: 0,
            creditINR: 30000,
            description: `Outstanding voucher liability recorded for sponsor`,
          },
        ]
      );

      // Journal 2: Hold Release (Hold reserve released to withdrawable wallet)
      if (holdToReleasePaise > 0n) {
        const holdINR = paiseToRupees(holdToReleasePaise);
        recordEvent(
          'UPGRADE_TO_FULL',
          ref.memberId,
          ref.name,
          `Hold Reserve Release: ₹${holdINR} held commission released to sponsor available earnings payable.`,
          {
            walletDeltaPaise: holdToReleasePaise,
            holdDeltaPaise: -holdToReleasePaise,
            recoveryDeltaPaise: 0n,
            voucherDeltaPaise: 0n,
          },
          [
            {
              account: JournalAccount.COMMISSION_HOLD_RESERVE,
              debitINR: holdINR,
              creditINR: 0,
              description: `Release of held reserve upon achieving 2nd qualified direct`,
            },
            {
              account: JournalAccount.MEMBER_EARNINGS_PAYABLE,
              debitINR: 0,
              creditINR: holdINR,
              description: `Earnings payable credited to sponsor wallet from hold release`,
            },
          ]
        );
      }

      // Journal 3: Separate Recovery of previously paid ₹1,000 basic commission
      if (priorCommissionToRecover > 0n) {
        const recoveryINR = paiseToRupees(priorCommissionToRecover);

        // Check if available balance can fund recovery; if not, record explicit pending recovery without negative balance
        const fundedRecovery = safeBigIntMin(priorCommissionToRecover, currentAvailable + holdToReleasePaise);
        const unfundedRecovery = priorCommissionToRecover - fundedRecovery;

        recordEvent(
          'UPGRADE_TO_FULL',
          ref.memberId,
          ref.name,
          `Commission Reconciliation: Recovery of ₹${recoveryINR} basic commission previously paid for ${ref.name}. Net cash effect = ₹0.`,
          {
            walletDeltaPaise: -fundedRecovery,
            holdDeltaPaise: 0n,
            recoveryDeltaPaise: unfundedRecovery,
            voucherDeltaPaise: 0n,
          },
          [
            {
              account: JournalAccount.MEMBER_EARNINGS_PAYABLE,
              debitINR: paiseToRupees(fundedRecovery),
              creditINR: 0,
              description: `Deduction from earnings payable for commission recovery`,
            },
            ...(unfundedRecovery > 0n
              ? [
                  {
                    account: JournalAccount.MEMBER_PENDING_RECOVERY,
                    debitINR: paiseToRupees(unfundedRecovery),
                    creditINR: 0,
                    description: `Pending unrecovered advance recorded for sponsor`,
                  },
                ]
              : []),
            {
              account: JournalAccount.DIRECT_SPONSOR_COMMISSION_EXPENSE,
              debitINR: 0,
              creditINR: recoveryINR,
              description: `Reversal/recovery of commission expense for 2nd qualified direct`,
            },
          ]
        );
      }
    }
  }

  /**
   * Run the exact canonical scenario specified in Master Prompt Section 5:
   * A sponsors B, C, D, E (all joining ₹3,000 Basic).
   * B: ₹1,000 released
   * C: ₹1,000 held
   * D: ₹1,000 released
   * E: ₹1,000 released
   * Then D upgrades first (1st Qualified Direct -> ₹9,000 additional wallet credit).
   * Then E upgrades second (2nd Qualified Direct -> ₹30,000 Voucher, C's ₹1,000 hold released, E's ₹1,000 recovered).
   */
  public runPresetScenarioAtoE(): SimulationResult {
    return this.simulateSponsorChain({
      sponsorMemberId: 'ASKR-100001',
      directReferrals: [
        { memberId: 'ASKR-100002', name: 'Member B', initialPackage: MembershipPackage.BASIC },
        { memberId: 'ASKR-100003', name: 'Member C', initialPackage: MembershipPackage.BASIC },
        { memberId: 'ASKR-100004', name: 'Member D', initialPackage: MembershipPackage.BASIC, upgradesToFull: true, upgradeOrder: 1 },
        { memberId: 'ASKR-100005', name: 'Member E', initialPackage: MembershipPackage.BASIC, upgradesToFull: true, upgradeOrder: 2 },
      ],
    });
  }

  /**
   * Binary Matching Simulation:
   * Ratio: 1:2 OR 2:1
   * Proposed match reward: ₹3,000
   * Daily cap: 15 matches (₹45,000 max daily)
   * Beneficiary must be Full Qualified.
   */
  public simulateBinaryMatching(input: BinaryMatchInput): BinaryMatchResult {
    if (!input.isBeneficiaryQualified) {
      return {
        matchesConsumed: 0,
        leftUnitsUsed: 0,
        rightUnitsUsed: 0,
        newCarryLeft: input.leftUnits + input.previousCarryLeft,
        newCarryRight: input.rightUnits + input.previousCarryRight,
        cappedOutMatches: 0,
        proposedRewardPaise: 0n,
        proposedRewardINR: 0,
        isQualified: false,
        rejectionReason: 'Beneficiary member is not Full Qualified. Full Qualification is mandatory for matching income.',
      };
    }

    let totalLeft = input.leftUnits + input.previousCarryLeft;
    let totalRight = input.rightUnits + input.previousCarryRight;

    let matchesFound = 0;
    let leftUsed = 0;
    let rightUsed = 0;

    // Evaluate matching using 1:2 or 2:1 ratio greedy matching
    while (true) {
      const remainingLeft = totalLeft - leftUsed;
      const remainingRight = totalRight - rightUsed;

      // Try 2 Left : 1 Right
      if (remainingLeft >= 2 && remainingRight >= 1 && remainingLeft >= remainingRight) {
        matchesFound++;
        leftUsed += 2;
        rightUsed += 1;
        continue;
      }

      // Try 1 Left : 2 Right
      if (remainingLeft >= 1 && remainingRight >= 2) {
        matchesFound++;
        leftUsed += 1;
        rightUsed += 2;
        continue;
      }

      break;
    }

    // Daily Capping calculation
    const remainingCapSlots = Math.max(0, FINANCIAL_RULES.BINARY_DAILY_MAX_MATCHES - input.todayMatchesAlreadySettled);
    const payableMatches = Math.min(matchesFound, remainingCapSlots);
    const cappedOutMatches = matchesFound - payableMatches;

    const proposedRewardPaise = BigInt(payableMatches) * FINANCIAL_RULES.BINARY_MATCH_REWARD_PAISE;

    return {
      matchesConsumed: payableMatches,
      leftUnitsUsed: leftUsed,
      rightUnitsUsed: rightUsed,
      newCarryLeft: totalLeft - leftUsed,
      newCarryRight: totalRight - rightUsed,
      cappedOutMatches,
      proposedRewardPaise,
      proposedRewardINR: paiseToRupees(proposedRewardPaise),
      isQualified: true,
    };
  }
}

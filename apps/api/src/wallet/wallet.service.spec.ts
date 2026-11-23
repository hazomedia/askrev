import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WalletService } from './wallet.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('WalletService', () => {
  let service: WalletService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
      },
      walletAccount: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      journalLine: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      binaryMatchEvent: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      qualificationEvent: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    service = new WalletService(mockPrisma);
  });

  describe('getWalletOverview - Authoritative Breakdown & Direct Summation', () => {
    it('returns authoritative balances and calculates Crown Bonus and Royal Match from actual ledger categories', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@askrev.com',
        isEmailVerified: true,
        binaryPlacement: {
          totalRewardEarnedPaise: 300000n, // ₹3,000 Royal Match historical placement
        },
      });

      mockPrisma.walletAccount.findUnique.mockResolvedValue({
        id: 'wallet-1',
        userId: 'user-1',
        availableEarningsPaise: 500000n,
        heldCommissionsPaise: 100000n,
        pendingRecoveryPaise: 0n,
        totalEarnedPaise: 1000000n, // ₹10,000 Total
        shoppingVoucherBalancePaise: 3000000n,
      });

      // Provide actual ledger lines:
      // Direct Sponsor: BASIC_SPONSOR (₹4,000) + QUALIFIED_DIRECT (₹3,000) = ₹7,000
      // Binary Matching: BINARY_MATCHING_REWARD (₹3,000)
      mockPrisma.journalLine.findMany.mockResolvedValue([
        {
          accountNumber: '2000_MEMBER_EARNINGS_PAYABLE',
          creditPaise: 400000n,
          debitPaise: 0n,
          journalEntry: { eventType: 'BASIC_SPONSOR_COMMISSION_RELEASED', referenceId: 'ref-1' },
        },
        {
          accountNumber: '2000_MEMBER_EARNINGS_PAYABLE',
          creditPaise: 300000n,
          debitPaise: 0n,
          journalEntry: { eventType: 'QUALIFIED_DIRECT_COMMISSION', referenceId: 'ref-2' },
        },
        {
          accountNumber: '2000_MEMBER_EARNINGS_PAYABLE',
          creditPaise: 300000n,
          debitPaise: 0n,
          journalEntry: { eventType: 'BINARY_MATCHING_REWARD', referenceId: 'ref-3' },
        },
      ]);

      const overview = await service.getWalletOverview('user-1');

      expect(overview.availableEarningsINR).toBe(5000);
      expect(overview.totalEarnedINR).toBe(10000);
      expect(overview.isEmailVerified).toBe(true);
      expect(overview.breakdown.totalEarningsINR).toBe(10000);
      expect(overview.breakdown.crownBonusINR).toBe(7000);
      expect(overview.breakdown.royalMatchINR).toBe(3000);
      expect(overview.breakdown.legacyIncomeINR).toBe(0);
      expect(overview.breakdown.clubFundINR).toBe(0);
      expect(overview.withdrawalsEnabled).toBe(false);
    });

    it('NEVER derives EV Crown Bonus by subtracting Binary Income from Total Earnings', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-divergent',
        email: 'divergent@askrev.com',
        isEmailVerified: true,
        binaryPlacement: null,
      });

      // Total earned is ₹20,000, Royal Match from ledger is ₹6,000, Crown Bonus from ledger is ₹5,000.
      // Under the old flawed subtraction logic, Crown Bonus would incorrectly evaluate to ₹14,000 (20,000 - 6,000).
      // Under correct direct summation, Crown Bonus must strictly be ₹5,000!
      mockPrisma.walletAccount.findUnique.mockResolvedValue({
        id: 'wallet-divergent',
        userId: 'user-divergent',
        availableEarningsPaise: 1000000n,
        heldCommissionsPaise: 0n,
        pendingRecoveryPaise: 0n,
        totalEarnedPaise: 2000000n, // ₹20,000 Total
        shoppingVoucherBalancePaise: 0n,
      });

      mockPrisma.journalLine.findMany.mockResolvedValue([
        {
          accountNumber: '2000_MEMBER_EARNINGS_PAYABLE',
          creditPaise: 500000n, // ₹5,000 Direct Sponsor
          debitPaise: 0n,
          journalEntry: { eventType: 'BASIC_SPONSOR_COMMISSION_RELEASED', referenceId: 'ref-sponsor' },
        },
        {
          accountNumber: '2000_MEMBER_EARNINGS_PAYABLE',
          creditPaise: 600000n, // ₹6,000 Binary Matching
          debitPaise: 0n,
          journalEntry: { eventType: 'BINARY_MATCHING_REWARD', referenceId: 'ref-binary' },
        },
      ]);

      const overview = await service.getWalletOverview('user-divergent');

      expect(overview.breakdown.crownBonusINR).toBe(5000); // NOT 14000!
      expect(overview.breakdown.royalMatchINR).toBe(6000);
      expect(overview.breakdown.totalEarningsINR).toBe(20000);
    });

    it('reconciles historical earnings from QualificationEvent and BinaryMatchEvent without modifying ledger', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-historical',
        email: 'historical@askrev.com',
        isEmailVerified: true,
        binaryPlacement: {
          totalRewardEarnedPaise: 300000n,
        },
      });

      mockPrisma.walletAccount.findUnique.mockResolvedValue({
        id: 'wallet-historical',
        userId: 'user-historical',
        availableEarningsPaise: 800000n,
        heldCommissionsPaise: 0n,
        pendingRecoveryPaise: 0n,
        totalEarnedPaise: 800000n, // ₹8,000 Total
        shoppingVoucherBalancePaise: 0n,
      });

      // No ledger lines exist for this user yet
      mockPrisma.journalLine.findMany.mockResolvedValue([]);

      // Historical events exist:
      // QualificationEvent: ₹5,000 (3,000 credited + 2,000 hold released)
      mockPrisma.qualificationEvent.findMany.mockResolvedValue([
        { walletCreditedPaise: 300000n, holdReleasedPaise: 200000n },
      ]);

      // BinaryMatchEvent: ₹3,000
      mockPrisma.binaryMatchEvent.findMany.mockResolvedValue([
        { rewardPaise: 300000n },
      ]);

      const overview = await service.getWalletOverview('user-historical');

      expect(overview.breakdown.crownBonusINR).toBe(5000);
      expect(overview.breakdown.royalMatchINR).toBe(3000);
      expect(overview.breakdown.totalEarningsINR).toBe(8000);
    });

    it('prioritizes direct ledger records over historical fallback when ledger has higher authoritative entries', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-hybrid',
        email: 'hybrid@askrev.com',
        isEmailVerified: true,
        binaryPlacement: null,
      });

      mockPrisma.walletAccount.findUnique.mockResolvedValue({
        id: 'wallet-hybrid',
        userId: 'user-hybrid',
        availableEarningsPaise: 1500000n,
        heldCommissionsPaise: 0n,
        pendingRecoveryPaise: 0n,
        totalEarnedPaise: 1500000n,
        shoppingVoucherBalancePaise: 0n,
      });

      // Ledger has ₹10,000 Sponsor and ₹5,000 Binary
      mockPrisma.journalLine.findMany.mockResolvedValue([
        {
          accountNumber: '2000_MEMBER_EARNINGS_PAYABLE',
          creditPaise: 1000000n,
          debitPaise: 0n,
          journalEntry: { eventType: 'BASIC_SPONSOR_COMMISSION_RELEASED', referenceId: 'ref-1' },
        },
        {
          accountNumber: '2000_MEMBER_EARNINGS_PAYABLE',
          creditPaise: 500000n,
          debitPaise: 0n,
          journalEntry: { eventType: 'BINARY_MATCHING_REWARD', referenceId: 'ref-2' },
        },
      ]);

      // Older historical events have lower values
      mockPrisma.qualificationEvent.findMany.mockResolvedValue([
        { walletCreditedPaise: 200000n, holdReleasedPaise: 0n },
      ]);
      mockPrisma.binaryMatchEvent.findMany.mockResolvedValue([
        { rewardPaise: 100000n },
      ]);

      const overview = await service.getWalletOverview('user-hybrid');

      expect(overview.breakdown.crownBonusINR).toBe(10000);
      expect(overview.breakdown.royalMatchINR).toBe(5000);
      expect(overview.breakdown.totalEarningsINR).toBe(15000);
    });
  });

  describe('requestWithdrawal', () => {
    it('throws BadRequestException when user email is not verified', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-unverified',
        email: 'unverified@askrev.com',
        isEmailVerified: false,
        wallet: { availableEarningsPaise: 500000n },
      });

      await expect(service.requestWithdrawal('user-unverified')).rejects.toThrow(
        BadRequestException
      );
    });

    it('returns restricted state when email is verified but live payouts disabled in simulation mode', async () => {
      process.env.COMPLIANCE_MODE = 'SIMULATION_ONLY';
      process.env.ENABLE_LIVE_PAYOUTS = 'false';

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-verified',
        email: 'verified@askrev.com',
        isEmailVerified: true,
        wallet: { availableEarningsPaise: 500000n },
      });

      const result = await service.requestWithdrawal('user-verified');

      expect(result.success).toBe(false);
      expect(result.restricted).toBe(true);
      expect(result.livePayoutsEnabled).toBe(false);
      expect(result.minWithdrawalINR).toBe(1000);
      expect(result.message).toContain('compliance simulation mode');
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.requestWithdrawal('non-existent')).rejects.toThrow(
        NotFoundException
      );
    });
  });
});

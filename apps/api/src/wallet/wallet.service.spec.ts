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
        findMany: vi.fn(),
      },
    };
    service = new WalletService(mockPrisma);
  });

  describe('getWalletOverview', () => {
    it('returns authoritative balances, email verification status, and income breakdown', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@askrev.com',
        isEmailVerified: true,
        binaryPlacement: {
          totalRewardEarnedPaise: 300000n, // ₹3,000 Royal Match
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

      const overview = await service.getWalletOverview('user-1');

      expect(overview.availableEarningsINR).toBe(5000);
      expect(overview.totalEarnedINR).toBe(10000);
      expect(overview.isEmailVerified).toBe(true);
      expect(overview.breakdown.totalEarningsINR).toBe(10000);
      expect(overview.breakdown.royalMatchINR).toBe(3000);
      expect(overview.breakdown.crownBonusINR).toBe(7000);
      expect(overview.breakdown.legacyIncomeINR).toBe(0);
      expect(overview.breakdown.clubFundINR).toBe(0);
      expect(overview.withdrawalsEnabled).toBe(false);
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

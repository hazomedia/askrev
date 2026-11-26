import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WalletService } from './wallet.service';
import { PayoutDestinationType } from './dto/withdrawal.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { JournalAccount } from '@askrev/shared';

describe('Withdrawal & Bank Settlement System (UAT)', () => {
  let service: WalletService;
  let mockPrisma: any;
  let mockEncryptionService: any;
  let mockEmailService: any;

  beforeEach(() => {
    process.env.COMPLIANCE_MODE = 'SIMULATION_ONLY';
    process.env.ENABLE_MANUAL_WITHDRAWALS = 'true';

    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        count: vi.fn(),
      },
      walletAccount: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      withdrawalRequest: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      journalEntry: {
        create: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      legacyMatrixPlacement: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      $transaction: vi.fn(async (cb: any) => cb(mockPrisma)),
    };

    mockEncryptionService = {
      encrypt: vi.fn((val: string) => `enc_${val}`),
    };

    mockEmailService = {
      sendWithdrawalRequestConfirmation: vi.fn().mockResolvedValue(true),
      sendWithdrawalStatusEmail: vi.fn().mockResolvedValue(true),
      sendBankSettlementConfirmation: vi.fn().mockResolvedValue(true),
    };

    service = new WalletService(
      mockPrisma,
      mockEncryptionService,
      mockEmailService
    );
  });

  describe('getWithdrawalEligibility', () => {
    it('returns ineligible if email is not verified', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u-1',
        isEmailVerified: false,
        wallet: { availableEarningsPaise: 500000n },
      });

      const res = await service.getWithdrawalEligibility('u-1');
      expect(res.eligible).toBe(false);
      expect(res.isEmailVerified).toBe(false);
      expect(res.reasons).toContain('Email verification is required prior to requesting withdrawals.');
    });

    it('returns ineligible if available balance is under ₹1,000', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u-2',
        isEmailVerified: true,
        wallet: { availableEarningsPaise: 50000n }, // ₹500
      });

      const res = await service.getWithdrawalEligibility('u-2');
      expect(res.eligible).toBe(false);
      expect(res.reasons).toContain('Minimum withdrawal threshold is ₹1,000. Your available balance is insufficient.');
    });

    it('returns eligible if email is verified and balance >= ₹1,000', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u-3',
        isEmailVerified: true,
        wallet: { availableEarningsPaise: 200000n }, // ₹2,000
      });

      const res = await service.getWithdrawalEligibility('u-3');
      expect(res.eligible).toBe(true);
      expect(res.reasons.length).toBe(0);
      expect(res.minWithdrawalINR).toBe(1000);
      expect(res.tdsRatePercent).toBe(5);
    });
  });

  describe('requestWithdrawal', () => {
    it('submits withdrawal, deducts balance, logs double-entry journal and sends confirmation email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u-3',
        memberId: 'EV10003',
        fullName: 'Test Member',
        email: 'test@askrev.com',
        isEmailVerified: true,
        wallet: { availableEarningsPaise: 300000n }, // ₹3,000
      });
      mockPrisma.withdrawalRequest.findFirst.mockResolvedValue(null);

      const res = await service.requestWithdrawal('u-3', {
        destinationType: PayoutDestinationType.BANK_ACCOUNT,
        amountINR: 2000,
        accountHolderName: 'Test Member',
        bankName: 'HDFC Bank',
        accountNumber: '123456789012',
        confirmAccountNumber: '123456789012',
        ifscCode: 'HDFC0001234',
        idempotencyKey: 'idemp-123',
      });

      expect(res.success).toBe(true);
      expect(res.grossAmountINR).toBe(2000);
      expect(res.tdsAmountINR).toBe(100); // 5% of 2000
      expect(res.netAmountINR).toBe(1900);
      expect(res.status).toBe('PENDING');

      // Verify wallet deduction
      expect(mockPrisma.walletAccount.update).toHaveBeenCalledWith({
        where: { userId: 'u-3' },
        data: {
          availableEarningsPaise: {
            decrement: 200000n,
          },
        },
      });

      // Verify journal creation (Debit MEMBER_EARNINGS_PAYABLE, Credit COMMISSION_HOLD_RESERVE)
      expect(mockPrisma.journalEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: 'MEMBER_WITHDRAWAL_REQUESTED',
            lines: {
              create: [
                expect.objectContaining({
                  account: JournalAccount.MEMBER_EARNINGS_PAYABLE,
                  debitPaise: 200000n,
                }),
                expect.objectContaining({
                  account: JournalAccount.COMMISSION_HOLD_RESERVE,
                  creditPaise: 200000n,
                }),
              ],
            },
          }),
        })
      );

      // Verify email was sent
      expect(mockEmailService.sendWithdrawalRequestConfirmation).toHaveBeenCalledWith(
        'test@askrev.com',
        'Test Member',
        expect.objectContaining({
          amountINR: 2000,
        })
      );
    });

    it('handles idempotent submissions cleanly', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u-3',
        memberId: 'EV10003',
        isEmailVerified: true,
        wallet: { availableEarningsPaise: 300000n },
      });
      mockPrisma.withdrawalRequest.findFirst.mockResolvedValue({
        id: 'existing-wth-id',
        status: 'PENDING',
        amountPaise: 200000n,
        bankDetails: {
          idempotencyKey: 'dup-key',
          destinationMasked: 'Bank: HDFC Bank',
        },
      });

      const res = await service.requestWithdrawal('u-3', {
        destinationType: PayoutDestinationType.BANK_ACCOUNT,
        amountINR: 2000,
        accountHolderName: 'Test Member',
        bankName: 'HDFC Bank',
        accountNumber: '123456789012',
        confirmAccountNumber: '123456789012',
        ifscCode: 'HDFC0001234',
        idempotencyKey: 'dup-key',
      });

      expect(res.success).toBe(true);
      expect(res.requestId).toBe('existing-wth-id');
      expect(res.message).toContain('idempotent submission');
      expect(mockPrisma.walletAccount.update).not.toHaveBeenCalled();
    });
  });

  describe('adminApproveWithdrawal', () => {
    it('approves a pending withdrawal and notifies member', async () => {
      mockPrisma.withdrawalRequest.findUnique.mockResolvedValue({
        id: 'wth-100',
        userId: 'u-3',
        status: 'PENDING',
        amountPaise: 200000n,
        bankDetails: {},
        user: { email: 'test@askrev.com', fullName: 'Test Member', memberId: 'EV10003' },
      });
      mockPrisma.withdrawalRequest.update.mockResolvedValue({
        id: 'wth-100',
        status: 'APPROVED',
      });

      const res = await service.adminApproveWithdrawal('admin-1', 'wth-100', {
        adminNotes: 'KYC verified and approved.',
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('APPROVED');
      expect(mockEmailService.sendWithdrawalStatusEmail).toHaveBeenCalledWith(
        'test@askrev.com',
        'Test Member',
        expect.objectContaining({
          status: 'APPROVED',
          amountINR: 2000,
        })
      );
    });

    it('rejects approval if withdrawal is not PENDING', async () => {
      mockPrisma.withdrawalRequest.findUnique.mockResolvedValue({
        id: 'wth-101',
        status: 'SETTLED',
        user: {},
      });

      await expect(
        service.adminApproveWithdrawal('admin-1', 'wth-101')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('adminRejectWithdrawal', () => {
    it('reverses reservation, refunds member wallet and logs reversal journal', async () => {
      mockPrisma.withdrawalRequest.findUnique.mockResolvedValue({
        id: 'wth-200',
        userId: 'u-3',
        status: 'PENDING',
        amountPaise: 150000n, // ₹1,500
        bankDetails: {},
        user: { email: 'test@askrev.com', fullName: 'Test Member', memberId: 'EV10003' },
      });

      const res = await service.adminRejectWithdrawal('admin-1', 'wth-200', {
        rejectionReason: 'Invalid IFSC Code supplied.',
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('REJECTED');
      expect(res.refundedINR).toBe(1500);

      // Verify wallet refund
      expect(mockPrisma.walletAccount.update).toHaveBeenCalledWith({
        where: { userId: 'u-3' },
        data: {
          availableEarningsPaise: {
            increment: 150000n,
          },
        },
      });

      // Verify reversal journal (Debit COMMISSION_HOLD_RESERVE, Credit MEMBER_EARNINGS_PAYABLE)
      expect(mockPrisma.journalEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: 'MEMBER_WITHDRAWAL_REJECTED',
            lines: {
              create: [
                expect.objectContaining({
                  account: JournalAccount.COMMISSION_HOLD_RESERVE,
                  debitPaise: 150000n,
                }),
                expect.objectContaining({
                  account: JournalAccount.MEMBER_EARNINGS_PAYABLE,
                  creditPaise: 150000n,
                }),
              ],
            },
          }),
        })
      );

      // Verify email
      expect(mockEmailService.sendWithdrawalStatusEmail).toHaveBeenCalledWith(
        'test@askrev.com',
        'Test Member',
        expect.objectContaining({
          status: 'REJECTED',
          reason: 'Invalid IFSC Code supplied.',
        })
      );
    });
  });

  describe('adminSettleWithdrawal', () => {
    it('records UTR, increments totalWithdrawnPaise, posts settlement journal and sends settlement email', async () => {
      mockPrisma.withdrawalRequest.findUnique.mockResolvedValue({
        id: 'wth-300',
        userId: 'u-3',
        status: 'APPROVED',
        amountPaise: 200000n, // ₹2,000 gross
        bankDetails: {
          tdsPaise: '10000', // ₹100 TDS (5%)
          netAmountPaise: '190000', // ₹1,900 net
          destinationMasked: 'Bank: HDFC Bank (A/C: ••••9012, IFSC: HDFC0001234)',
        },
        user: { email: 'test@askrev.com', fullName: 'Test Member', memberId: 'EV10003' },
      });

      const res = await service.adminSettleWithdrawal('admin-1', 'wth-300', {
        utrNumber: 'CMS98765432101',
        settlementDate: '2026-11-26T12:00:00.000Z',
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('SETTLED');
      expect(res.utrNumber).toBe('CMS98765432101');
      expect(res.settledGrossINR).toBe(2000);
      expect(res.settledNetINR).toBe(1900);
      expect(res.tdsDeductedINR).toBe(100);

      // Verify totalWithdrawnPaise updated
      expect(mockPrisma.walletAccount.update).toHaveBeenCalledWith({
        where: { userId: 'u-3' },
        data: {
          totalWithdrawnPaise: {
            increment: 200000n,
          },
        },
      });

      // Verify double-entry journal: Debit COMMISSION_HOLD_RESERVE, Credit CASH_AND_BANK, Credit MEMBER_EARNINGS_PAYABLE (TDS)
      expect(mockPrisma.journalEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: 'MEMBER_WITHDRAWAL_SETTLED',
            lines: {
              create: [
                expect.objectContaining({
                  account: JournalAccount.COMMISSION_HOLD_RESERVE,
                  debitPaise: 200000n,
                }),
                expect.objectContaining({
                  account: JournalAccount.CASH_AND_BANK,
                  creditPaise: 190000n,
                }),
                expect.objectContaining({
                  account: JournalAccount.MEMBER_EARNINGS_PAYABLE,
                  creditPaise: 10000n,
                }),
              ],
            },
          }),
        })
      );

      // Verify email
      expect(mockEmailService.sendBankSettlementConfirmation).toHaveBeenCalledWith(
        'test@askrev.com',
        'Test Member',
        expect.objectContaining({
          amountINR: 2000,
          utrNumber: 'CMS98765432101',
        })
      );
    });
  });

  describe('exportWithdrawalReport', () => {
    it('produces valid CSV formatted output', async () => {
      mockPrisma.withdrawalRequest.findMany.mockResolvedValue([
        {
          id: 'wth-1',
          amountPaise: 200000n,
          status: 'SETTLED',
          createdAt: new Date('2026-11-25T10:00:00Z'),
          adminNotes: null,
          bankDetails: {
            destinationType: 'BANK_ACCOUNT',
            destinationMasked: 'Bank: HDFC Bank',
            utrNumber: 'UTR123',
            settledAt: '2026-11-26',
            tdsPaise: '10000',
            netAmountPaise: '190000',
          },
          user: {
            memberId: 'EV10001',
            fullName: 'First Member',
            email: 'member1@askrev.com',
            mobileNumber: '9876543210',
          },
        },
      ]);

      const csv = await service.exportWithdrawalReport({});
      expect(csv).toContain('Request ID,Member ID,Full Name,Email');
      expect(csv).toContain('"EV10001"');
      expect(csv).toContain('"UTR123"');
      expect(csv).toContain('2000');
    });
  });

  describe('EV Club Fund (Task 5)', () => {
    it('returns fund metrics, accounting policy and 3 utilization programs', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u-1',
        memberId: 'EV10001',
        fullName: 'Member One',
        currentPackage: 'FULL',
      });
      mockPrisma.user.count.mockResolvedValue(3); // 3 directs = qualified
      mockPrisma.legacyMatrixPlacement.findUnique.mockResolvedValue({
        id: 'plc-1',
        userId: 'u-1',
      });
      // Downline query mock
      mockPrisma.legacyMatrixPlacement.findMany
        .mockResolvedValueOnce([{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }]) // Level 1 (3 * 200 = 600)
        .mockResolvedValue([]);

      const fund = await service.getEvClubFundOverview('u-1');
      expect(fund.isQualified).toBe(true);
      expect(fund.activeDirectsCount).toBe(3);
      expect(fund.fundMetrics.evClubProjectedINR).toBe(600);
      expect(fund.fundMetrics.evClubQualifiedINR).toBe(600);
      expect(fund.fundMetrics.evClubCreditedINR).toBe(0);
      expect(fund.utilizationPrograms.length).toBe(3);
      expect(fund.utilizationPrograms[0].id).toBe('EV_PURCHASE_CREDIT');
      expect(fund.utilizationPrograms[1].id).toBe('CHARGER_BUNDLE');
      expect(fund.utilizationPrograms[2].id).toBe('BATTERY_HEALTH_CARE');
    });

    it('returns POLICY_PENDING_APPROVAL when requesting utilization in preview mode', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u-1',
        memberId: 'EV10001',
      });
      mockPrisma.user.count.mockResolvedValue(3);
      mockPrisma.legacyMatrixPlacement.findUnique.mockResolvedValue(null);

      const res = await service.requestClubFundUtilization('u-1', 'EV_PURCHASE_CREDIT', 5000);
      expect(res.success).toBe(false);
      expect(res.status).toBe('POLICY_PENDING_APPROVAL');
      expect(res.programId).toBe('EV_PURCHASE_CREDIT');
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });
  });
});

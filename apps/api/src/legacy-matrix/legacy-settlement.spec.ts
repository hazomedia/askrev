import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LegacyMatrixService } from './legacy-matrix.service';
import { EvBikesService } from '../ev-bikes/ev-bikes.service';
import { WalletService } from '../wallet/wallet.service';
import { JournalAccount } from '@askrev/shared';
import { MembershipPackage } from '@prisma/client';
import { LEGACY_MATRIX_RATES } from './legacy-matrix.constants';

describe('EV Legacy Income & EV Club Fund Settlement Suite', () => {
  let matrixService: LegacyMatrixService;
  let bikesService: EvBikesService;
  let walletService: WalletService;
  let mockPrisma: any;

  beforeEach(() => {
    delete process.env.ENABLE_LEGACY_SETTLEMENT;
    process.env.COMPLIANCE_MODE = 'SIMULATION_ONLY';
    process.env.LEGACY_SETTLEMENT_EFFECTIVE_DATE = '2026-12-01T00:00:00.000Z';

    mockPrisma = {
      $transaction: vi.fn(async (cb) => await cb(mockPrisma)),
      $executeRaw: vi.fn().mockResolvedValue(1),
      $queryRaw: vi.fn().mockResolvedValue([]),
      user: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      legacyMatrixPlacement: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        count: vi.fn(),
      },
      legacyMatrixAuditLog: {
        create: vi.fn().mockResolvedValue({ id: 'audit-log-1' }),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
      },
      walletAccount: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn().mockResolvedValue({}),
        findMany: vi.fn().mockResolvedValue([]),
      },
      journalEntry: {
        findUnique: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockImplementation(async ({ data }) => ({
          id: 'jnl-1',
          ...data,
        })),
      },
      journalLine: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      shoppingVoucher: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn().mockResolvedValue({}),
      },
      voucherTransaction: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'vtx-1' }),
      },
      evBike: {
        findUnique: vi.fn(),
      },
      evBooking: {
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(async ({ data }) => ({
          id: 'booking-1',
          ...data,
          bike: { name: 'Test Bike', modelCode: 'TB-1' },
          voucher: null,
        })),
      },
    };

    matrixService = new LegacyMatrixService(mockPrisma);
    bikesService = new EvBikesService(mockPrisma);
    walletService = new WalletService(mockPrisma);
  });

  // SCENARIO 1: FREE member excluded from matrix
  it('Scenario 1: excludes EV GO / FREE members from Legacy Matrix placement', async () => {
    mockPrisma.legacyMatrixPlacement.findUnique.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'free-user-1',
      memberId: 'EV10099',
      fullName: 'Free Member',
      currentPackage: MembershipPackage.FREE,
      role: 'MEMBER',
    });

    const result = await matrixService.placeMemberInMatrix('free-user-1');

    expect(result.placement).toBeNull();
    expect(result.eligible).toBe(false);
    expect(result.message).toContain('EV GO / FREE members are not eligible');
    expect(mockPrisma.legacyMatrixPlacement.create).not.toHaveBeenCalled();
  });

  // SCENARIO 2: EV PRO and EV ULTRA activation eligibility
  it('Scenario 2: grants permanent placement to EV PRO and EV ULTRA members upon activation', async () => {
    mockPrisma.legacyMatrixPlacement.findUnique.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'pro-user-1',
      memberId: 'EV10050',
      fullName: 'Pro Member',
      currentPackage: MembershipPackage.BASIC,
      role: 'MEMBER',
    });
    mockPrisma.legacyMatrixPlacement.count.mockResolvedValue(0);
    mockPrisma.legacyMatrixPlacement.create.mockResolvedValue({
      id: 'root-plc-1',
      userId: 'pro-user-1',
      matrixSequence: 1,
      depth: 0,
      positionIndex: 0,
    });

    const result = await matrixService.placeMemberInMatrix('pro-user-1');

    expect(result.isNew).toBe(true);
    expect(result.placement).toBeDefined();
    expect(mockPrisma.legacyMatrixPlacement.create).toHaveBeenCalled();
  });

  // SCENARIO 3: Upgrade from PRO to ULTRA retains placement without duplicate income
  it('Scenario 3: retains existing placement on PRO to ULTRA upgrade without duplicate placement', async () => {
    const existingPlacement = {
      id: 'existing-plc-1',
      userId: 'upgraded-user-1',
      matrixSequence: 2,
      depth: 1,
      positionIndex: 1,
      parent: { user: { memberId: 'EV10001', fullName: 'Root User' } },
    };
    mockPrisma.legacyMatrixPlacement.findUnique.mockResolvedValue(existingPlacement);

    const result = await matrixService.placeMemberInMatrix('upgraded-user-1');

    expect(result.isNew).toBe(false);
    expect(result.placement.id).toBe('existing-plc-1');
    expect(result.message).toContain('already has a permanent Legacy Matrix placement');
    expect(mockPrisma.legacyMatrixPlacement.create).not.toHaveBeenCalled();
  });

  // SCENARIO 4: Unqualified member accumulates income without wallet credits
  it('Scenario 4: accumulates income without crediting spendable wallet balances when active directs < 3', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'unqualified-user',
      memberId: 'EV10010',
      directReferrals: [
        { id: 'd1', memberId: 'EV10011' },
        { id: 'd2', memberId: 'EV10012' },
      ], // Only 2 directs (< 3)
      legacyPlacement: { id: 'plc-unqual', depth: 1 },
    });

    const result = await matrixService.evaluateAndReleaseAccumulatedIncome('unqualified-user');

    expect(result.isQualified).toBe(false);
    expect(result.released).toBe(false);
    expect(result.reason).toContain('Requires 3 active directs');
    expect(mockPrisma.walletAccount.update).not.toHaveBeenCalled();
    expect(mockPrisma.journalEntry.create).not.toHaveBeenCalled();
  });

  // SCENARIO 5: 3rd active direct releases accumulated even levels to Earnings Wallet and odd levels to Shopping Wallet
  it('Scenario 5: releases even levels to Earnings Wallet and odd levels to Shopping Wallet upon 3rd active direct', async () => {
    process.env.ENABLE_LEGACY_SETTLEMENT = 'true';

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'qualified-user',
      memberId: 'EV10005',
      directReferrals: [
        { id: 'd1', memberId: 'EV10006' },
        { id: 'd2', memberId: 'EV10007' },
        { id: 'd3', memberId: 'EV10008' },
      ], // 3 directs (Qualified!)
      legacyPlacement: { id: 'plc-qual', depth: 0 },
    });

    // Level 1: 1 placement (odd: EV Club Fund -> Shopping Wallet ₹200 / 20000 paise)
    // Level 2: 1 placement (even: EV Legacy Income -> Earnings Wallet ₹200 / 20000 paise)
    mockPrisma.legacyMatrixPlacement.findMany
      .mockResolvedValueOnce([
        { id: 'child-l1', user: { id: 'u-l1', memberId: 'EV-L1', currentPackage: 'BASIC' } },
      ])
      .mockResolvedValueOnce([
        { id: 'child-l2', user: { id: 'u-l2', memberId: 'EV-L2', currentPackage: 'FULL' } },
      ])
      .mockResolvedValue([]); // Levels 3-8 empty

    // None already settled
    mockPrisma.journalEntry.findUnique.mockResolvedValue(null);

    const result = await matrixService.evaluateAndReleaseAccumulatedIncome('qualified-user');

    expect(result.isQualified).toBe(true);
    expect(result.released).toBe(true);
    expect(result.settledCount).toBe(2);
    expect(result.releasedEarningsINR).toBe(200); // Level 2 (Even) -> Earnings Wallet
    expect(result.releasedShoppingINR).toBe(200); // Level 1 (Odd) -> Shopping Wallet

    // Verify Earnings Wallet credit
    expect(mockPrisma.walletAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'qualified-user' },
        data: expect.objectContaining({
          availableEarningsPaise: { increment: 20000n },
          totalEarnedPaise: { increment: 20000n },
        }),
      })
    );

    // Verify Journal Entries created
    expect(mockPrisma.journalEntry.create).toHaveBeenCalledTimes(2);
  });

  // SCENARIO 6: Existing eligible positions included
  it('Scenario 6: includes historical eligible positions established prior to qualification in release', async () => {
    process.env.ENABLE_LEGACY_SETTLEMENT = 'true';

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'qual-historical-user',
      memberId: 'EV10002',
      directReferrals: [{ id: 'd1' }, { id: 'd2' }, { id: 'd3' }],
      legacyPlacement: { id: 'plc-hist', depth: 0 },
    });

    // Downline established beforehand: 3 on L1, 9 on L2
    const l1Children = Array.from({ length: 3 }, (_, i) => ({
      id: `hist-l1-${i}`,
      user: { id: `u-l1-${i}`, memberId: `EV-H1-${i}`, currentPackage: 'BASIC' },
    }));
    const l2Children = Array.from({ length: 9 }, (_, i) => ({
      id: `hist-l2-${i}`,
      user: { id: `u-l2-${i}`, memberId: `EV-H2-${i}`, currentPackage: 'FULL' },
    }));

    mockPrisma.legacyMatrixPlacement.findMany
      .mockResolvedValueOnce(l1Children)
      .mockResolvedValueOnce(l2Children)
      .mockResolvedValue([]);

    mockPrisma.journalEntry.findUnique.mockResolvedValue(null);

    const result = await matrixService.evaluateAndReleaseAccumulatedIncome('qual-historical-user');

    expect(result.released).toBe(true);
    expect(result.settledCount).toBe(12); // 3 (L1) + 9 (L2)
    expect(result.releasedShoppingINR).toBe(3 * 200); // 3 * ₹200 = ₹600 (L1 odd)
    expect(result.releasedEarningsINR).toBe(9 * 200); // 9 * ₹200 = ₹1800 (L2 even)
  });

  // SCENARIO 7: Correct rates (₹200 L1-4, ₹300 L5-8)
  it('Scenario 7: enforces ₹200 for levels 1-4 and ₹300 for levels 5-8', () => {
    for (const rate of LEGACY_MATRIX_RATES) {
      if (rate.level <= 4) {
        expect(rate.amountINR).toBe(200);
        expect(rate.amountPaise).toBe(20000n);
      } else {
        expect(rate.amountINR).toBe(300);
        expect(rate.amountPaise).toBe(30000n);
      }
      if (rate.level % 2 === 0) {
        expect(rate.destination).toBe('EARNINGS_WALLET');
      } else {
        expect(rate.destination).toBe('EV_CLUB_WALLET');
      }
    }
  });

  // SCENARIO 8: Duplicate settlement idempotency
  it('Scenario 8: enforces idempotency - repeated settlement runs produce 0 duplicate credits', async () => {
    process.env.ENABLE_LEGACY_SETTLEMENT = 'true';

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'idempotent-user',
      memberId: 'EV10003',
      directReferrals: [{ id: 'd1' }, { id: 'd2' }, { id: 'd3' }],
      legacyPlacement: { id: 'plc-idem', depth: 0 },
    });

    mockPrisma.legacyMatrixPlacement.findMany
      .mockResolvedValueOnce([
        { id: 'c-l1', user: { id: 'u1', memberId: 'EV-C1', currentPackage: 'BASIC' } },
      ])
      .mockResolvedValue([]);

    // Already settled! Journal entry exists
    mockPrisma.journalEntry.findUnique.mockResolvedValue({
      id: 'existing-jnl-entry',
      referenceId: 'LEGACY-SETTLE-idempotent-user-c-l1-L1',
    });

    const result = await matrixService.evaluateAndReleaseAccumulatedIncome('idempotent-user');

    expect(result.settledCount).toBe(0);
    expect(result.releasedEarningsINR).toBe(0);
    expect(result.releasedShoppingINR).toBe(0);
    expect(mockPrisma.journalEntry.create).not.toHaveBeenCalled();
    expect(mockPrisma.walletAccount.update).not.toHaveBeenCalled();
  });

  // SCENARIO 9: Combined Shopping Voucher + Shopping Wallet checkout calculation
  it('Scenario 9: calculates combined checkout: Voucher + Shopping Wallet + Net Cash', async () => {
    const bookingAmountINR = 10000;
    const bookingAmountPaise = 1000000n; // ₹10,000

    mockPrisma.evBike.findUnique.mockResolvedValue({
      id: 'bike-1',
      name: 'ASKR Roadster Pro',
      modelCode: 'ARP-01',
      bookingAmountPaise,
      voucherRedeemLimitPaise: 300000n, // Max voucher ₹3,000
    });

    mockPrisma.shoppingVoucher.findUnique.mockResolvedValue({
      id: 'v-1',
      userId: 'user-checkout',
      voucherCode: 'VOUCHER-3000',
      remainingBalancePaise: 300000n, // ₹3,000
      status: 'ACTIVE',
    });

    // Shopping Wallet: ₹2,000 available in 2150_EV_CLUB_FUND_LIABILITY
    mockPrisma.journalLine.findMany.mockResolvedValue([
      {
        account: JournalAccount.EV_CLUB_FUND_LIABILITY,
        creditPaise: 200000n, // ₹2,000 credited
        debitPaise: 0n,
      },
    ]);

    const res = await bikesService.createBooking('user-checkout', {
      bikeId: 'bike-1',
      voucherId: 'v-1',
      voucherAmountINR: 3000,
      shoppingWalletAmountINR: 2000,
    });

    expect(res.booking.bookingAmountINR).toBe(10000);
    expect(res.booking.voucherAppliedINR).toBe(3000);
    expect(res.booking.shoppingWalletAppliedINR).toBe(2000);
    expect(res.booking.netCashPaidINR).toBe(5000); // 10,000 - 3,000 - 2,000 = 5,000
  });

  // SCENARIO 10: Non-withdrawable and non-transferable Shopping Wallet rules
  it('Scenario 10: Shopping Wallet cannot be withdrawn or overdrafted', async () => {
    // 1. Available Shopping Wallet is ₹1,000
    mockPrisma.journalLine.findMany.mockResolvedValue([
      {
        account: JournalAccount.EV_CLUB_FUND_LIABILITY,
        creditPaise: 100000n, // ₹1,000
        debitPaise: 0n,
      },
    ]);

    const walletOverview = await walletService.getShoppingWalletBalance('user-sw');
    expect(walletOverview.isWithdrawable).toBe(false);
    expect(walletOverview.isTransferable).toBe(false);
    expect(walletOverview.availableShoppingWalletINR).toBe(1000);

    // 2. Overdraft rejection at checkout: requesting ₹2,000 when only ₹1,000 is available
    mockPrisma.evBike.findUnique.mockResolvedValue({
      id: 'bike-1',
      name: 'ASKR Roadster Pro',
      bookingAmountPaise: 1000000n,
      voucherRedeemLimitPaise: 0n,
    });

    await expect(
      bikesService.createBooking('user-sw', {
        bikeId: 'bike-1',
        shoppingWalletAmountINR: 2000, // Exceeds ₹1,000
      })
    ).rejects.toThrow('exceeds available balance');
  });

  // SCENARIO 11: Double-entry financial journal balance check (Debits === Credits)
  it('Scenario 11: verifies double-entry journal balance across settlement and checkout operations', async () => {
    process.env.ENABLE_LEGACY_SETTLEMENT = 'true';

    let capturedJournalLines: any[] = [];
    mockPrisma.journalEntry.create.mockImplementation(async ({ data }) => {
      capturedJournalLines = data.lines.create;
      return { id: 'jnl-verified', ...data };
    });

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'qual-user-de',
      memberId: 'EV10001',
      directReferrals: [{ id: 'd1' }, { id: 'd2' }, { id: 'd3' }],
      legacyPlacement: { id: 'plc-de', depth: 0 },
    });
    mockPrisma.legacyMatrixPlacement.findMany
      .mockResolvedValueOnce([
        { id: 'c-l1', user: { id: 'u1', memberId: 'EV-L1', currentPackage: 'BASIC' } },
      ])
      .mockResolvedValue([]);
    mockPrisma.journalEntry.findUnique.mockResolvedValue(null);

    await matrixService.evaluateAndReleaseAccumulatedIncome('qual-user-de');

    // Verify Debits === Credits
    expect(capturedJournalLines.length).toBeGreaterThan(0);
    const totalDebit = capturedJournalLines.reduce((sum, l) => sum + BigInt(l.debitPaise), 0n);
    const totalCredit = capturedJournalLines.reduce((sum, l) => sum + BigInt(l.creditPaise), 0n);

    expect(totalDebit).toBe(totalCredit);
    expect(totalDebit).toBe(20000n); // ₹200
  });

  // System-wide Read-Only Settlement Preview (Task 5)
  it('generates a system-wide read-only settlement preview without writing to the database', async () => {
    mockPrisma.legacyMatrixPlacement.findMany.mockImplementation(async (params) => {
      if (params?.orderBy?.matrixSequence) {
        // Return 2 placed members
        return [
          {
            id: 'p1',
            matrixSequence: 1,
            user: {
              id: 'u1',
              memberId: 'EV10001',
              fullName: 'Qualified Super Admin',
              currentPackage: 'FULL',
              role: 'SUPER_ADMIN',
              directReferrals: [{ id: 'd1' }, { id: 'd2' }, { id: 'd3' }],
            },
          },
          {
            id: 'p2',
            matrixSequence: 2,
            user: {
              id: 'u2',
              memberId: 'EV10002',
              fullName: 'Unqualified Member',
              currentPackage: 'BASIC',
              role: 'MEMBER',
              directReferrals: [],
            },
          },
        ];
      }
      return [];
    });

    mockPrisma.journalEntry.findMany.mockResolvedValue([]);
    mockPrisma.journalLine.findMany.mockResolvedValue([]);

    const preview = await matrixService.getAdminSettlementPreview();

    expect(preview.previewNotice).toContain('READ-ONLY SETTLEMENT PREVIEW');
    expect(preview.summary.totalPlacedMembers).toBe(2);
    expect(preview.summary.totalQualifiedMembers).toBe(1);
    expect(preview.summary.totalUnqualifiedMembers).toBe(1);
    expect(preview.members.length).toBe(2);

    // DB was never mutated
    expect(mockPrisma.walletAccount.update).not.toHaveBeenCalled();
    expect(mockPrisma.journalEntry.create).not.toHaveBeenCalled();
  });
});

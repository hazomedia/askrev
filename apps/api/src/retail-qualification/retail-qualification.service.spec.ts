import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RetailQualificationService } from './retail-qualification.service';

describe('RetailQualificationService (₹60,000 Shopping Qualification)', () => {
  let service: RetailQualificationService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      retailQualificationConfig: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      retailOrderRecord: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      retailQualificationEvent: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
    };

    service = new RetailQualificationService(mockPrisma as any);
  });

  it('should initialize default config with ₹60,000 qualification threshold', async () => {
    mockPrisma.retailQualificationConfig.findUnique.mockResolvedValue(null);
    mockPrisma.retailQualificationConfig.create.mockResolvedValue({
      id: 'cfg-default',
      configKey: 'DEFAULT_RETAIL_QUALIFICATION',
      qualificationThresholdPaise: 6000000n, // ₹60,000
      eligibleCategories: ['SCOOTER', 'BIKE', 'CYCLE', 'JEEP', 'UTILITY'],
      includeVoucherRedemptions: false,
      allowRefundDeductions: true,
      status: 'PENDING_BUSINESS_APPROVAL',
      disclaimer: 'SIMULATION PREVIEW ONLY',
    });

    const config = await service.getConfig();

    expect(config.qualificationThresholdPaise).toBe(6000000n);
    expect(mockPrisma.retailQualificationConfig.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          qualificationThresholdPaise: 6000000n,
        }),
      })
    );
  });

  it('should track completed retail orders and calculate progress towards ₹60,000', async () => {
    mockPrisma.retailQualificationConfig.findUnique.mockResolvedValue({
      id: 'cfg-1',
      configKey: 'DEFAULT_RETAIL_QUALIFICATION',
      qualificationThresholdPaise: 6000000n, // ₹60,000
      eligibleCategories: ['SCOOTER', 'BIKE', 'CYCLE', 'JEEP', 'UTILITY'],
      includeVoucherRedemptions: false,
      allowRefundDeductions: true,
      status: 'PENDING_BUSINESS_APPROVAL',
      evaluationPeriodDays: 365,
    });

    // User has 2 completed orders: ₹25,000 and ₹20,000 = ₹45,000 total (75% progress)
    mockPrisma.retailOrderRecord.findMany.mockResolvedValue([
      {
        id: 'ord-1',
        orderNumber: 'ORD-101',
        orderStatus: 'COMPLETED',
        productCategory: 'BIKE',
        grossAmountPaise: 2500000n,
        netCashPaidPaise: 2500000n,
        voucherAppliedPaise: 0n,
        refundAmountPaise: 0n,
        isEligibleForQualification: true,
        completedAt: new Date(),
      },
      {
        id: 'ord-2',
        orderNumber: 'ORD-102',
        orderStatus: 'COMPLETED',
        productCategory: 'SCOOTER',
        grossAmountPaise: 2000000n,
        netCashPaidPaise: 2000000n,
        voucherAppliedPaise: 0n,
        refundAmountPaise: 0n,
        isEligibleForQualification: true,
        completedAt: new Date(),
      },
    ]);

    const progress = await service.evaluateMemberQualification('user-1');

    expect(progress.thresholdINR).toBe(60000);
    expect(progress.qualifyingSpendINR).toBe(45000);
    expect(progress.progressPercent).toBe(75);
    expect(progress.isThresholdMet).toBe(false);
    expect(progress.qualifyingOrdersCount).toBe(2);
  });

  it('should deduct refunded orders from qualification cumulative amount', async () => {
    mockPrisma.retailQualificationConfig.findUnique.mockResolvedValue({
      id: 'cfg-1',
      configKey: 'DEFAULT_RETAIL_QUALIFICATION',
      qualificationThresholdPaise: 6000000n,
      eligibleCategories: ['BIKE'],
      includeVoucherRedemptions: false,
      allowRefundDeductions: true,
      status: 'PENDING_BUSINESS_APPROVAL',
      evaluationPeriodDays: 365,
    });

    // ₹65,000 order with ₹10,000 refunded -> effective ₹55,000 (not qualified)
    mockPrisma.retailOrderRecord.findMany.mockResolvedValue([
      {
        id: 'ord-3',
        orderNumber: 'ORD-103',
        orderStatus: 'COMPLETED',
        productCategory: 'BIKE',
        grossAmountPaise: 6500000n,
        netCashPaidPaise: 6500000n,
        voucherAppliedPaise: 0n,
        refundAmountPaise: 1000000n, // ₹10,000 refunded
        isEligibleForQualification: true,
        completedAt: new Date(),
      },
    ]);

    const progress = await service.evaluateMemberQualification('user-1');

    expect(progress.qualifyingSpendINR).toBe(55000);
    expect(progress.isThresholdMet).toBe(false);
  });

  it('should mark preview benefits unlocked without releasing live financial payouts', async () => {
    mockPrisma.retailQualificationConfig.findUnique.mockResolvedValue({
      id: 'cfg-1',
      configKey: 'DEFAULT_RETAIL_QUALIFICATION',
      qualificationThresholdPaise: 6000000n,
      eligibleCategories: ['BIKE'],
      includeVoucherRedemptions: false,
      allowRefundDeductions: true,
      status: 'PENDING_BUSINESS_APPROVAL',
      evaluationPeriodDays: 365,
    });

    // ₹70,000 total orders (> ₹60,000 threshold)
    mockPrisma.retailOrderRecord.findMany.mockResolvedValue([
      {
        id: 'ord-4',
        orderNumber: 'ORD-104',
        orderStatus: 'COMPLETED',
        productCategory: 'BIKE',
        grossAmountPaise: 7000000n,
        netCashPaidPaise: 7000000n,
        voucherAppliedPaise: 0n,
        refundAmountPaise: 0n,
        isEligibleForQualification: true,
        completedAt: new Date(),
      },
    ]);

    const progress = await service.evaluateMemberQualification('user-1');

    expect(progress.isThresholdMet).toBe(true);
    expect(progress.progressPercent).toBe(100);
    expect(progress.qualifyingSpendINR).toBe(70000);
    expect(progress.benefitsUnlocked).toContain('PREVIEW_ONLY: Unlocking benefits requires separate corporate and legal approval');
  });
});

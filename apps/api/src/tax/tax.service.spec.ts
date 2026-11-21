import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaxSimulationService } from './tax.service';

describe('TaxSimulationService (Configurable TDS Simulation)', () => {
  let service: TaxSimulationService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      taxSimulationRule: {
        upsert: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      taxSimulationRecord: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
    };

    service = new TaxSimulationService(mockPrisma as any);
  });

  it('should create a configurable tax simulation rule with audit details', async () => {
    mockPrisma.taxSimulationRule.upsert.mockResolvedValue({
      id: 'rule-1',
      ruleIdentifier: 'TDS_DIRECT_COMMISSION_5PCT',
      ruleName: '5% TDS on Direct Commission',
      incomeCategory: 'DIRECT_SPONSOR_COMMISSION',
      taxRatePercent: 5.0,
      thresholdPaise: 0n,
      effectiveFrom: new Date('2026-01-01'),
      effectiveTo: null,
      deductionEvent: 'ON_WALLET_CREDIT',
      version: 1,
      isActive: true,
      disclaimer: 'SIMULATED ESTIMATE ONLY: Not actual tax withheld.',
    });

    const res = await service.createRule({
      ruleIdentifier: 'TDS_DIRECT_COMMISSION_5PCT',
      ruleName: '5% TDS on Direct Commission',
      incomeCategory: 'DIRECT_SPONSOR_COMMISSION',
      taxRatePercent: 5.0,
      thresholdINR: 0,
      effectiveFrom: '2026-01-01T00:00:00Z',
      deductionEvent: 'ON_WALLET_CREDIT',
    });

    expect(res.rule.ruleIdentifier).toBe('TDS_DIRECT_COMMISSION_5PCT');
    expect(res.rule.taxRatePercent).toBe(5.0);
    expect(mockPrisma.taxSimulationRule.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ruleIdentifier: 'TDS_DIRECT_COMMISSION_5PCT' },
      })
    );
  });

  it('should compute tax deduction breakdown with legal disclaimers and estimates', async () => {
    // Active 5% rule
    mockPrisma.taxSimulationRule.findMany.mockResolvedValue([
      {
        id: 'rule-5pct',
        ruleIdentifier: 'TDS_5PCT',
        ruleName: '5% Binary Matching TDS',
        incomeCategory: 'BINARY_MATCHING_REWARD',
        taxRatePercent: 5.0,
        thresholdPaise: 0n,
        effectiveFrom: new Date('2026-01-01'),
        effectiveTo: null,
        isActive: true,
        disclaimer: 'SIMULATED ESTIMATE ONLY: Non-statutory estimate.',
      },
    ]);

    mockPrisma.taxSimulationRecord.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'rec-1', ...data })
    );

    // Compute TDS on ₹30,000 (3,000,000 paise) gross matching
    const result = await service.simulateTaxDeduction({
      userId: 'user-1',
      incomeCategory: 'BINARY_MATCHING_REWARD',
      grossAmountPaise: 3000000n, // ₹30,000
      referenceEventType: 'BINARY_SIMULATION_MATCH',
      referenceEntityId: 'run-2026-11-21',
      idempotencyKey: 'idemp-tax-1',
    });

    expect(result.taxableGrossINR).toBe(30000);
    // 5% of ₹30,000 = ₹1,500
    expect(result.simulatedDeductionINR).toBe(1500);
    // Net = ₹30,000 - ₹1,500 = ₹28,500
    expect(result.simulatedNetINR).toBe(28500);
    expect(result.appliedRatePercent).toBe(5);
    expect(result.disclaimer).toContain('SIMULATED ESTIMATE ONLY');
  });

  it('should handle zero deduction when no rule matches income category', async () => {
    mockPrisma.taxSimulationRule.findMany.mockResolvedValue([]);

    const result = await service.simulateTaxDeduction({
      userId: 'user-1',
      incomeCategory: 'SPECIAL_INCENTIVE',
      grossAmountPaise: 100000n,
      referenceEventType: 'SPECIAL_EVENT',
    });

    expect(result.applied).toBe(false);
    expect(result.simulatedDeductionINR).toBe(0);
    expect(result.simulatedNetINR).toBe(1000);
  });
});

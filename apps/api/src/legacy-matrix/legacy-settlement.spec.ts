import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LegacyMatrixService } from './legacy-matrix.service';

describe('EV Legacy Income: Actual Wallet Credit Readiness (Task 4)', () => {
  let service: LegacyMatrixService;
  let mockPrisma: any;

  beforeEach(() => {
    delete process.env.ENABLE_LEGACY_SETTLEMENT;
    process.env.COMPLIANCE_MODE = 'SIMULATION_ONLY';
    process.env.LEGACY_SETTLEMENT_EFFECTIVE_DATE = '2026-12-01T00:00:00.000Z';

    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      legacyMatrixPlacement: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
    };

    service = new LegacyMatrixService(mockPrisma);
  });

  describe('getProspectiveSettlementPreview', () => {
    it('returns the complete 4-tier breakdown with dual-account allocation', async () => {
      // Mock user with 3 active directs
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        memberId: 'EV10001',
        fullName: 'Qualified Leader',
        currentPackage: 'FULL',
      });
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'd1', currentPackage: 'BASIC' },
        { id: 'd2', currentPackage: 'FULL' },
        { id: 'd3', currentPackage: 'FULL' },
      ]);
      mockPrisma.legacyMatrixPlacement.findUnique.mockResolvedValue({
        id: 'plc-1',
        matrixSequence: 1,
        depth: 0,
        positionIndex: 1,
        parent: null,
        children: [],
      });
      // Mock downline: 3 in L1 (odd: club fund 3*200 = 600), 9 in L2 (even: earnings 9*200 = 1800)
      mockPrisma.legacyMatrixPlacement.findMany
        .mockResolvedValueOnce([{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }]) // Level 1
        .mockResolvedValueOnce([
          { id: 'c4' }, { id: 'c5' }, { id: 'c6' },
          { id: 'c7' }, { id: 'c8' }, { id: 'c9' },
          { id: 'c10' }, { id: 'c11' }, { id: 'c12' },
        ]) // Level 2
        .mockResolvedValue([]); // Levels 3-8 empty

      const preview = await service.getProspectiveSettlementPreview('user-1');

      expect(preview.memberId).toBe('EV10001');
      expect(preview.policyParameters.isQualified).toBe(true);
      expect(preview.policyParameters.activeDirectsCount).toBe(3);

      // 4-Tier Model Verification
      expect(preview.fourTierSummary.tier1_ProjectedINR).toBe(2400); // 600 + 1800
      expect(preview.fourTierSummary.tier2_QualifiedINR).toBe(2400);
      expect(preview.fourTierSummary.tier3_CreditedINR).toBe(0); // Strictly prospective
      expect(preview.fourTierSummary.tier4_WithdrawableINR).toBe(1800); // Level 2 even

      // Dual Account Separation
      expect(preview.dualAccountAllocation.evenLevels_WithdrawableEarningsINR).toBe(1800);
      expect(preview.dualAccountAllocation.oddLevels_EvClubFundINR).toBe(600);
    });

    it('zeros qualified income if direct referrals are under 3', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-2',
        memberId: 'EV10002',
        currentPackage: 'BASIC',
      });
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'd1', currentPackage: 'BASIC' }, // Only 1 direct
      ]);
      mockPrisma.legacyMatrixPlacement.findUnique.mockResolvedValue({
        id: 'plc-2',
        matrixSequence: 5,
        depth: 2,
        positionIndex: 1,
        parent: null,
        children: [],
      });
      mockPrisma.legacyMatrixPlacement.findMany
        .mockResolvedValueOnce([{ id: 'c1' }])
        .mockResolvedValue([]);

      const preview = await service.getProspectiveSettlementPreview('user-2');

      expect(preview.policyParameters.isQualified).toBe(false);
      expect(preview.fourTierSummary.tier1_ProjectedINR).toBe(200);
      expect(preview.fourTierSummary.tier2_QualifiedINR).toBe(0);
      expect(preview.fourTierSummary.tier3_CreditedINR).toBe(0);
      expect(preview.fourTierSummary.tier4_WithdrawableINR).toBe(0);
    });
  });

  describe('getAdminSettlementReadiness', () => {
    it('returns system readiness metrics and audit checks', async () => {
      mockPrisma.legacyMatrixPlacement.count.mockResolvedValue(28);
      mockPrisma.user.count.mockResolvedValue(28);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'u1', memberId: 'EV10001', directReferrals: [{ id: 'd1' }, { id: 'd2' }, { id: 'd3' }] },
      ]);

      const readiness = await service.getAdminSettlementReadiness();

      expect(readiness.systemReadiness.status).toBe('UAT_SIMULATION_READY');
      expect(readiness.systemReadiness.isSettlementEnabled).toBe(false);
      expect(readiness.systemReadiness.historicalBaselineAccountsProtected).toBe(true);
      expect(readiness.systemReadiness.zeroRetroactiveLiabilities).toBe(true);
      expect(readiness.networkMetrics.totalPlacedInMatrix).toBe(28);
      expect(readiness.networkMetrics.totalQualifiedMembers).toBe(1);
      expect(readiness.auditChecks.every((c: any) => c.status === 'PASSED')).toBe(true);
    });
  });

  describe('executeProspectiveSettlement', () => {
    it('strictly blocks execution when ENABLE_LEGACY_SETTLEMENT is not true', async () => {
      process.env.ENABLE_LEGACY_SETTLEMENT = 'false';

      const res = await service.executeProspectiveSettlement('admin-1');

      expect(res.success).toBe(false);
      expect(res.settlementExecuted).toBe(false);
      expect(res.reason).toContain('ENABLE_LEGACY_SETTLEMENT environment variable is false');
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'PROSPECTIVE_SETTLEMENT_SIMULATION_BLOCKED',
          }),
        })
      );
    });

    it('evaluates only post-launch placements when ENABLE_LEGACY_SETTLEMENT is true', async () => {
      process.env.ENABLE_LEGACY_SETTLEMENT = 'true';
      mockPrisma.legacyMatrixPlacement.findMany.mockResolvedValue([
        { id: 'p-new-1', user: { id: 'u-new', memberId: 'EV10029', fullName: 'New Member' } },
      ]);

      const res = await service.executeProspectiveSettlement('admin-1', '2026-12-01T00:00:00.000Z');

      expect(res.success).toBe(true);
      expect(res.settlementExecuted).toBe(true);
      expect(res.prospectivePlacementsFound).toBe(1);
    });
  });
});

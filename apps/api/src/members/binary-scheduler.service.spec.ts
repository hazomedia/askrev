import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BinarySchedulerService } from './binary-scheduler.service';

describe('BinarySchedulerService', () => {
  let service: BinarySchedulerService;
  let mockPrisma: any;
  let mockMembersService: any;

  beforeEach(() => {
    mockPrisma = {
      $queryRaw: vi.fn(),
      user: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'user-1',
            memberId: 'ASKR-001',
            fullName: 'Test Binary Member',
            isFullQualified: true,
            binaryPlacement: {
              id: 'bp-1',
              carryLeftPaise: 20n,
              carryRightPaise: 15n,
              dailyMatchesCount: 0,
              lastMatchDate: '2026-11-20',
              totalMatchesConsumed: 0,
            },
          },
        ]),
      },
      binaryPlacement: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'bp-1',
          leftVolume: 20,
          rightVolume: 15,
        }),
        update: vi.fn().mockResolvedValue({ id: 'bp-1' }),
      },
      binaryMatchSettlement: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'bms-1' }),
      },
      walletTransaction: {
        create: vi.fn().mockResolvedValue({ id: 'tx-1' }),
      },
      wallet: {
        update: vi.fn().mockResolvedValue({ id: 'w-1' }),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: 'al-1' }),
      },
      binarySimulationRun: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
    };

    mockMembersService = {
      settleBinaryMatching: vi.fn().mockResolvedValue({
        success: true,
        matchesSettled: 1,
        rewardINR: 3000,
      }),
    };

    service = new BinarySchedulerService(mockPrisma as any, mockMembersService as any);
  });

  it('should acquire postgres advisory lock and execute daily simulation run', async () => {
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([{ acquired: true }]) // lock
      .mockResolvedValueOnce([{ released: true }]); // unlock

    mockPrisma.binarySimulationRun.findUnique.mockResolvedValue(null);
    mockPrisma.binarySimulationRun.upsert.mockResolvedValue({
      id: 'run-1',
      runDate: '2026-11-21',
      isDryRun: false,
      status: 'PROCESSING',
    });
    mockPrisma.binarySimulationRun.update.mockResolvedValue({
      id: 'run-1',
      runDate: '2026-11-21',
      isDryRun: false,
      status: 'COMPLETED',
      matchedPairs: 10,
    });

    const result = await service.runDailyBinarySimulation({
      targetDate: '2026-11-21',
      isDryRun: false,
      triggeredBy: 'ADMIN_MANUAL',
    });

    expect(result.skipped).toBeFalsy();
    expect(result.success).toBe(true);
    expect(result.nodesSettled).toBe(1);
    expect(mockMembersService.settleBinaryMatching).toHaveBeenCalledWith('user-1', expect.stringContaining('SIM-AUTO-BIN-2026-11-21-user-1'));
  });

  it('should skip run if advisory lock cannot be acquired (concurrent process running)', async () => {
    mockPrisma.$queryRaw.mockResolvedValueOnce([{ acquired: false }]);

    const result = await service.runDailyBinarySimulation({
      targetDate: '2026-11-21',
      isDryRun: false,
    });

    expect(result.skipped).toBe(true);
    expect(result.reason).toContain('Advisory lock held');
    expect(mockMembersService.settleBinaryMatching).not.toHaveBeenCalled();
  });

  it('should skip run if already completed for the business date (idempotency)', async () => {
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([{ acquired: true }])
      .mockResolvedValueOnce([{ released: true }]);

    // Already run for this date
    mockPrisma.binarySimulationRun.findUnique.mockResolvedValue({
      id: 'existing-run',
      runDate: '2026-11-21',
      isDryRun: false,
      status: 'COMPLETED',
    });

    const result = await service.runDailyBinarySimulation({
      targetDate: '2026-11-21',
      isDryRun: false,
    });

    expect(result.skipped).toBe(true);
    expect(result.reason).toContain('already completed');
    expect(mockMembersService.settleBinaryMatching).not.toHaveBeenCalled();
  });

  it('should allow dry run preview without persisting live simulation state', async () => {
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([{ acquired: true }])
      .mockResolvedValueOnce([{ released: true }]);

    mockPrisma.binarySimulationRun.upsert.mockResolvedValue({
      id: 'dry-run-1',
      runDate: '2026-11-21',
      isDryRun: true,
      status: 'PROCESSING',
    });
    mockPrisma.binarySimulationRun.update.mockResolvedValue({
      id: 'dry-run-1',
      runDate: '2026-11-21',
      isDryRun: true,
      status: 'COMPLETED',
    });

    const result = await service.runDailyBinarySimulation({
      targetDate: '2026-11-21',
      isDryRun: true,
      triggeredBy: 'ADMIN_MANUAL',
    });

    expect(result.success).toBe(true);
    expect(result.isDryRun).toBe(true);
  });
});

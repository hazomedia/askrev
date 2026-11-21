import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MembersService } from './members.service';
import { paiseToRupees } from '@askrev/shared';

export interface RunSimulationOptions {
  isDryRun?: boolean;
  targetDate?: string; // YYYY-MM-DD in Asia/Kolkata
  triggeredBy?: string; // 'CRON_AUTOMATED' | 'ADMIN_MANUAL'
}

@Injectable()
export class BinarySchedulerService {
  private readonly logger = new Logger(BinarySchedulerService.name);
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly membersService: MembersService
  ) {}

  /**
   * Daily Automated Binary Simulation Schedule
   * Fires every day at 00:01 Asia/Kolkata (IST)
   */
  @Cron('1 0 * * *', { timeZone: 'Asia/Kolkata' })
  async handleScheduledDailyBinaryRun() {
    this.logger.log('⏰ Automated Binary Matching Scheduler Triggered at 00:01 IST');
    try {
      await this.runDailyBinarySimulation({
        isDryRun: false,
        triggeredBy: 'CRON_AUTOMATED',
      });
    } catch (err: any) {
      this.logger.error(`❌ Automated Binary Simulation Failed: ${err.message}`, err.stack);
    }
  }

  /**
   * Core Distributed-Locked Binary Simulation Run
   * Enforces:
   * 1. Runs strictly under COMPLIANCE_MODE=SIMULATION_ONLY.
   * 2. Uses PostgreSQL advisory lock to ensure single execution across horizontally scaled workers.
   * 3. Single logical processing run per business date (Asia/Kolkata).
   * 4. Idempotency per member, pair, and settlement date.
   * 5. 15 pairs cap per member per IST calendar day.
   * 6. Preserves valid unmatched volume carry-forward.
   * 7. Supports dry-run simulation previews.
   */
  async runDailyBinarySimulation(options: RunSimulationOptions = {}) {
    const complianceMode = process.env.COMPLIANCE_MODE || 'SIMULATION_ONLY';
    if (complianceMode !== 'SIMULATION_ONLY') {
      this.logger.warn(`⚠️ Binary simulation skipped: COMPLIANCE_MODE is '${complianceMode}' (must be SIMULATION_ONLY).`);
      return { skipped: true, reason: 'COMPLIANCE_MODE is not SIMULATION_ONLY' };
    }

    if (this.isProcessing) {
      this.logger.warn('⚠️ Binary simulation is already currently executing on this instance.');
      return { skipped: true, reason: 'Simulation already in progress on this node' };
    }

    const isDryRun = Boolean(options.isDryRun);
    const triggeredBy = options.triggeredBy || 'CRON_AUTOMATED';

    // Business Date in Asia/Kolkata timezone (YYYY-MM-DD)
    const now = new Date();
    const todayStr =
      options.targetDate ||
      new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);

    this.isProcessing = true;
    let lockAcquired = false;
    const ADVISORY_LOCK_KEY = 987654321;

    try {
      // 1. Attempt PostgreSQL Advisory Lock for distributed safety
      try {
        const lockRes: any[] = await this.prisma.$queryRaw`SELECT pg_try_advisory_lock(${ADVISORY_LOCK_KEY}) as acquired`;
        if (lockRes?.[0]?.acquired) {
          lockAcquired = true;
        } else {
          this.logger.warn(`⚠️ Distributed advisory lock already held by another worker. Skipping run for date: ${todayStr}`);
          return { skipped: true, reason: 'Advisory lock held by another worker' };
        }
      } catch (lockErr: any) {
        this.logger.warn(`Advisory lock check fallback to local mutex: ${lockErr.message}`);
      }

      // 2. Check if a non-dry run has already completed for this business date
      if (!isDryRun) {
        const existingRun = await this.prisma.binarySimulationRun.findUnique({
          where: {
            runDate_isDryRun: {
              runDate: todayStr,
              isDryRun: false,
            },
          },
        });

        if (existingRun && existingRun.status === 'COMPLETED') {
          this.logger.log(`ℹ️ Binary matching simulation for ${todayStr} has already completed. Skipping.`);
          return {
            skipped: true,
            reason: `Run for ${todayStr} already completed`,
            run: existingRun,
          };
        }
      }

      // 3. Create or Update BinarySimulationRun record
      const runRecord = await this.prisma.binarySimulationRun.upsert({
        where: {
          runDate_isDryRun: {
            runDate: todayStr,
            isDryRun,
          },
        },
        create: {
          runDate: todayStr,
          status: 'RUNNING',
          executionMode: 'SIMULATION_ONLY',
          isDryRun,
          triggeredBy,
          startedAt: new Date(),
        },
        update: {
          status: 'RUNNING',
          errorMessage: null,
          startedAt: new Date(),
          completedAt: null,
        },
      });

      this.logger.log(`🚀 Commencing Binary Matching Simulation for date: ${todayStr} [DryRun: ${isDryRun}] (Run ID: ${runRecord.id})`);

      // 4. Fetch all eligible Full Qualified members who have an active binary placement
      const eligibleMembers = await this.prisma.user.findMany({
        where: {
          isFullQualified: true,
          binaryPlacement: {
            isNot: null,
          },
        },
        include: {
          binaryPlacement: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      let nodesEvaluated = 0;
      let nodesSettled = 0;
      let pairsSettled = 0;
      let totalRewardPaise = 0n;
      const settlementDetails: any[] = [];

      // 5. Evaluate and settle matching for each eligible member
      for (const member of eligibleMembers) {
        nodesEvaluated++;
        const placement = member.binaryPlacement;
        if (!placement) continue;

        const leftCarry = Number(placement.carryLeftPaise);
        const rightCarry = Number(placement.carryRightPaise);
        const matchesFound = Math.min(leftCarry, rightCarry);

        if (matchesFound <= 0) {
          continue; // Zero qualifying matching pairs
        }

        const idempotencyKey = `SIM-AUTO-BIN-${todayStr}-${member.id}-${placement.totalMatchesConsumed}`;

        if (isDryRun) {
          // Dry-run preview calculation (zero DB mutations)
          const isSameDay = placement.lastMatchDate === todayStr;
          const todaySettled = isSameDay ? (Number(placement.dailyMatchesCount) || 0) : 0;
          const remainingCap = Math.max(0, 15 - todaySettled);
          const payable = Math.min(matchesFound, remainingCap);
          const reward = BigInt(payable) * 300000n; // ₹3,000 per match

          nodesSettled++;
          pairsSettled += payable;
          totalRewardPaise += reward;

          settlementDetails.push({
            memberId: member.memberId,
            fullName: member.fullName,
            matchesFound,
            payableMatches: payable,
            cappedOut: matchesFound - payable,
            simulatedRewardINR: paiseToRupees(reward),
            newCarryLeft: leftCarry - payable,
            newCarryRight: rightCarry - payable,
          });
        } else {
          // Live simulation execution using atomic MembersService
          try {
            const settlement = await this.membersService.settleBinaryMatching(member.id, idempotencyKey);
            if (settlement && settlement.matchesSettled > 0) {
              nodesSettled++;
              pairsSettled += settlement.matchesSettled;
              totalRewardPaise += BigInt(settlement.rewardPaise || '0');
              settlementDetails.push({
                memberId: member.memberId,
                matchesSettled: settlement.matchesSettled,
                rewardINR: settlement.rewardINR,
                carryLeft: settlement.carryLeft,
                carryRight: settlement.carryRight,
              });
            }
          } catch (settleErr: any) {
            this.logger.error(`Error settling binary matching for ${member.memberId}: ${settleErr.message}`);
          }
        }
      }

      // 6. Complete the Simulation Run Record
      const completedRun = await this.prisma.binarySimulationRun.update({
        where: { id: runRecord.id },
        data: {
          status: 'COMPLETED',
          nodesEvaluated,
          nodesSettled,
          pairsSettled,
          totalRewardPaise,
          completedAt: new Date(),
          metadata: {
            settlementDetails: settlementDetails.slice(0, 50),
            totalSettledMembers: settlementDetails.length,
            complianceMode: 'SIMULATION_ONLY',
          },
        },
      });

      // 7. Audit Log Entry
      await this.prisma.auditLog.create({
        data: {
          action: isDryRun ? 'BINARY_SIMULATION_DRY_RUN' : 'BINARY_SIMULATION_RUN_COMPLETED',
          entityType: 'BINARY_SIMULATION_RUN',
          entityId: completedRun.id,
          metadata: {
            runDate: todayStr,
            isDryRun,
            nodesEvaluated,
            nodesSettled,
            pairsSettled,
            totalRewardINR: paiseToRupees(totalRewardPaise),
            triggeredBy,
            complianceMode: 'SIMULATION_ONLY',
          },
        },
      });

      this.logger.log(
        `✅ Binary Simulation Completed for ${todayStr}: ${nodesSettled}/${nodesEvaluated} nodes settled, ${pairsSettled} pairs matched, Total Simulated Reward: ₹${paiseToRupees(totalRewardPaise)}`
      );

      return {
        success: true,
        runId: completedRun.id,
        runDate: todayStr,
        isDryRun,
        nodesEvaluated,
        nodesSettled,
        pairsSettled,
        totalRewardINR: paiseToRupees(totalRewardPaise),
        completedAt: completedRun.completedAt,
        settlementDetails,
      };
    } catch (error: any) {
      this.logger.error(`❌ Binary simulation execution failed: ${error.message}`, error.stack);
      try {
        await this.prisma.binarySimulationRun.updateMany({
          where: { runDate: todayStr, isDryRun, status: 'RUNNING' },
          data: { status: 'FAILED', errorMessage: error.message },
        });
      } catch {}
      throw error;
    } finally {
      this.isProcessing = false;
      if (lockAcquired) {
        try {
          await this.prisma.$queryRaw`SELECT pg_advisory_unlock(${ADVISORY_LOCK_KEY})`;
        } catch {}
      }
    }
  }

  /**
   * Fetches past simulation runs for administrative reporting
   */
  async getSimulationRuns(limit = 30) {
    const runs = await this.prisma.binarySimulationRun.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return runs.map((r) => ({
      ...r,
      totalRewardINR: paiseToRupees(r.totalRewardPaise),
    }));
  }
}

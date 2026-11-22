import { Injectable, Logger, Inject, forwardRef, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MembersService } from './members.service';
import { Prisma } from '@prisma/client';

export interface InstantMatchingProcessResult {
  processed: number;
  settled: number;
  errors: number;
}

@Injectable()
export class InstantBinaryMatchingService implements OnApplicationBootstrap {
  private readonly logger = new Logger(InstantBinaryMatchingService.name);
  private readonly inFlightBeneficiaries = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => MembersService))
    private readonly membersService: MembersService
  ) {}

  /**
   * On server startup, self-heal by evaluating any pending or interrupted outbox tasks.
   */
  async onApplicationBootstrap() {
    try {
      await this.processOutboxImmediate();
    } catch (err: any) {
      this.logger.warn(`Startup outbox processing warning: ${err.message}`);
    }
  }

  /**
   * Transactionally queues matching evaluation tasks in the outbox for affected ancestor nodes.
   * Runs within the caller's active database transaction (tx).
   */
  async queueMatchingEvaluation(
    tx: Prisma.TransactionClient,
    ancestorUserIds: string[],
    triggerReason: string,
    triggerUserId?: string
  ): Promise<string[]> {
    const uniqueIds = Array.from(new Set(ancestorUserIds.filter(Boolean)));
    if (uniqueIds.length === 0) return [];

    const createdIds: string[] = [];
    for (const userId of uniqueIds) {
      const task = await tx.binaryMatchingOutbox.create({
        data: {
          userId,
          triggerReason,
          triggerUserId: triggerUserId || null,
          status: 'PENDING',
          attempts: 0,
        },
      });
      createdIds.push(task.id);
    }

    return createdIds;
  }

  /**
   * Process pending outbox tasks immediately after transaction commit.
   * Evaluates beneficiaries with concurrency protection and carry-forward preservation.
   */
  async processOutboxImmediate(candidateUserIds?: string[]): Promise<InstantMatchingProcessResult> {
    let processed = 0;
    let settled = 0;
    let errors = 0;

    const MAX_BATCHES = 5;
    let batchCount = 0;

    try {
      while (batchCount < MAX_BATCHES) {
        batchCount++;

        const whereClause: Prisma.BinaryMatchingOutboxWhereInput = {
          status: 'PENDING',
        };
        if (candidateUserIds && candidateUserIds.length > 0) {
          whereClause.userId = { in: candidateUserIds };
        }

        const pendingTasks = await this.prisma.binaryMatchingOutbox.findMany({
          where: whereClause,
          orderBy: { createdAt: 'asc' },
          take: 50,
        });

        if (pendingTasks.length === 0) {
          break;
        }

        for (const task of pendingTasks) {
          // Prevent redundant concurrent execution for the same beneficiary within this process
          if (this.inFlightBeneficiaries.has(task.userId)) {
            continue;
          }

          this.inFlightBeneficiaries.add(task.userId);
          try {
            // Atomically mark task as PROCESSING
            await this.prisma.binaryMatchingOutbox.update({
              where: { id: task.id },
              data: {
                status: 'PROCESSING',
                attempts: { increment: 1 },
              },
            });

            // Settle binary matching using MembersService row-locked transaction
            const result = await this.membersService.settleBinaryMatching(task.userId);

            // Mark task as COMPLETED
            await this.prisma.binaryMatchingOutbox.update({
              where: { id: task.id },
              data: {
                status: 'COMPLETED',
                processedAt: new Date(),
                lastError: null,
              },
            });

            processed++;
            if (result && result.matchesSettled > 0) {
              settled += result.matchesSettled;
              this.logger.log(
                `⚡ Instant Binary Match Settled: Member ${result.memberId} settled ${result.matchesSettled} pairs (₹${result.rewardINR}) [Carry: ${result.carryLeft}L / ${result.carryRight}R]`
              );
            }
          } catch (taskErr: any) {
            errors++;
            this.logger.error(
              `Failed instant binary matching task ${task.id} for user ${task.userId}: ${taskErr.message}`,
              taskErr.stack
            );

            const nextStatus = (task.attempts + 1) >= 3 ? 'FAILED' : 'PENDING';
            await this.prisma.binaryMatchingOutbox.update({
              where: { id: task.id },
              data: {
                status: nextStatus,
                lastError: taskErr.message,
              },
            }).catch(() => {});
          } finally {
            this.inFlightBeneficiaries.delete(task.userId);
          }
        }
      }
    } catch (err: any) {
      this.logger.error(`Error in processOutboxImmediate: ${err.message}`, err.stack);
    }

    return { processed, settled, errors };
  }

  /**
   * Directly evaluate a specific beneficiary with transactional row locking
   */
  async processBeneficiaryMatching(beneficiaryUserId: string, triggerReason = 'DIRECT_TRIGGER') {
    return this.membersService.settleBinaryMatching(beneficiaryUserId);
  }

  /**
   * Get outbox statistics for administrative monitoring
   */
  async getOutboxStats() {
    const [pending, processing, completed, failed, recentTasks] = await Promise.all([
      this.prisma.binaryMatchingOutbox.count({ where: { status: 'PENDING' } }),
      this.prisma.binaryMatchingOutbox.count({ where: { status: 'PROCESSING' } }),
      this.prisma.binaryMatchingOutbox.count({ where: { status: 'COMPLETED' } }),
      this.prisma.binaryMatchingOutbox.count({ where: { status: 'FAILED' } }),
      this.prisma.binaryMatchingOutbox.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          user: {
            select: { id: true, memberId: true, fullName: true },
          },
        },
      }),
    ]);

    return {
      counts: {
        pending,
        processing,
        completed,
        failed,
        total: pending + processing + completed + failed,
      },
      recentTasks,
    };
  }

  /**
   * Retry failed outbox tasks
   */
  async retryFailedTasks() {
    const updated = await this.prisma.binaryMatchingOutbox.updateMany({
      where: { status: 'FAILED' },
      data: {
        status: 'PENDING',
        attempts: 0,
        lastError: null,
      },
    });

    // Trigger immediate background retry
    this.processOutboxImmediate().catch(() => {});

    return { retriedCount: updated.count };
  }
}

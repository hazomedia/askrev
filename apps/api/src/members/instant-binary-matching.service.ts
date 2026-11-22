import { Injectable, Logger, Inject, forwardRef, OnApplicationBootstrap, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MembersService } from './members.service';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

export interface InstantMatchingProcessResult {
  processed: number;
  settled: number;
  errors: number;
}

export interface ClaimedOutboxTask {
  id: string;
  userId: string;
  triggerReason: string;
  triggerUserId: string | null;
  status: string;
  attempts: number;
  maxAttempts: number;
  lockedBy: string | null;
  lockedAt: Date | null;
  leaseExpiresAt: Date | null;
  nextRetryAt: Date | null;
  deadLetteredAt: Date | null;
  lastError: string | null;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class InstantBinaryMatchingService implements OnApplicationBootstrap {
  private readonly logger = new Logger(InstantBinaryMatchingService.name);
  public readonly workerId: string;
  public readonly leaseDurationSeconds = 120; // 2-minute durable lease
  public readonly defaultMaxAttempts = 5;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => MembersService))
    private readonly membersService: MembersService
  ) {
    this.workerId = `worker-${process.pid}-${randomUUID().substring(0, 8)}`;
  }

  /**
   * On server startup, self-heal by evaluating any pending or interrupted outbox tasks.
   */
  async onApplicationBootstrap() {
    try {
      await this.runRecoverySweep();
    } catch (err: any) {
      this.logger.warn(`Startup outbox recovery warning: ${err.message}`);
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
          maxAttempts: this.defaultMaxAttempts,
        },
      });
      createdIds.push(task.id);
    }

    return createdIds;
  }

  /**
   * Atomically claims a batch of claimable outbox tasks using PostgreSQL FOR UPDATE SKIP LOCKED.
   * Claims:
   * 1. PENDING tasks where nextRetryAt is null or in the past
   * 2. PROCESSING tasks whose durable lease has expired (worker crash recovery)
   */
  async claimTasks(limit = 50, candidateUserIds?: string[]): Promise<ClaimedOutboxTask[]> {
    if (candidateUserIds && candidateUserIds.length > 0) {
      const uniqueCandidateIds = Array.from(new Set(candidateUserIds.filter(Boolean)));
      return await this.prisma.$queryRaw<ClaimedOutboxTask[]>`
        WITH claimable AS (
          SELECT id
          FROM "BinaryMatchingOutbox"
          WHERE (
            (status = 'PENDING' AND ("nextRetryAt" IS NULL OR "nextRetryAt" <= NOW()))
            OR
            (status = 'PROCESSING' AND "leaseExpiresAt" IS NOT NULL AND "leaseExpiresAt" <= NOW())
          )
          AND attempts < "maxAttempts"
          AND "userId" IN (${Prisma.join(uniqueCandidateIds)})
          ORDER BY "createdAt" ASC
          LIMIT ${limit}
          FOR UPDATE SKIP LOCKED
        )
        UPDATE "BinaryMatchingOutbox" b
        SET status = 'PROCESSING',
            attempts = b.attempts + 1,
            "lockedBy" = ${this.workerId},
            "lockedAt" = NOW(),
            "leaseExpiresAt" = NOW() + (${this.leaseDurationSeconds} * INTERVAL '1 second'),
            "updatedAt" = NOW()
        FROM claimable
        WHERE b.id = claimable.id
        RETURNING b.*;
      `;
    }

    return await this.prisma.$queryRaw<ClaimedOutboxTask[]>`
      WITH claimable AS (
        SELECT id
        FROM "BinaryMatchingOutbox"
        WHERE (
          (status = 'PENDING' AND ("nextRetryAt" IS NULL OR "nextRetryAt" <= NOW()))
          OR
          (status = 'PROCESSING' AND "leaseExpiresAt" IS NOT NULL AND "leaseExpiresAt" <= NOW())
        )
        AND attempts < "maxAttempts"
        ORDER BY "createdAt" ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE "BinaryMatchingOutbox" b
      SET status = 'PROCESSING',
          attempts = b.attempts + 1,
          "lockedBy" = ${this.workerId},
          "lockedAt" = NOW(),
          "leaseExpiresAt" = NOW() + (${this.leaseDurationSeconds} * INTERVAL '1 second'),
          "updatedAt" = NOW()
      FROM claimable
      WHERE b.id = claimable.id
      RETURNING b.*;
    `;
  }

  /**
   * Protected completion update: strictly checks status = 'PROCESSING' AND lockedBy = workerId
   * Prevents overwriting task state if the lease expired and another worker took it over.
   */
  async completeTask(taskId: string): Promise<boolean> {
    const affected = await this.prisma.$executeRaw`
      UPDATE "BinaryMatchingOutbox"
      SET status = 'COMPLETED',
          "processedAt" = NOW(),
          "lastError" = NULL,
          "leaseExpiresAt" = NULL,
          "lockedBy" = NULL,
          "updatedAt" = NOW()
      WHERE id = ${taskId}
        AND status = 'PROCESSING'
        AND "lockedBy" = ${this.workerId}
    `;
    return affected > 0;
  }

  /**
   * Protected failure handling: strictly checks status = 'PROCESSING' AND lockedBy = workerId.
   * If attempts >= maxAttempts, routes task to DEAD_LETTER.
   * Otherwise schedules retry with exponential backoff: 4s, 8s, 16s, 32s (capped at 300s).
   */
  async failTask(
    taskId: string,
    currentAttempts: number,
    maxAttempts: number,
    errorMessage: string
  ): Promise<boolean> {
    const isDeadLetter = currentAttempts >= maxAttempts;
    if (isDeadLetter) {
      const affected = await this.prisma.$executeRaw`
        UPDATE "BinaryMatchingOutbox"
        SET status = 'DEAD_LETTER',
            "deadLetteredAt" = NOW(),
            "lastError" = ${errorMessage},
            "leaseExpiresAt" = NULL,
            "lockedBy" = NULL,
            "updatedAt" = NOW()
        WHERE id = ${taskId}
          AND status = 'PROCESSING'
          AND "lockedBy" = ${this.workerId}
      `;
      if (affected > 0) {
        this.logger.error(
          `💀 Binary matching task ${taskId} moved to DEAD_LETTER after ${currentAttempts}/${maxAttempts} attempts. Error: ${errorMessage}`
        );
      }
      return affected > 0;
    } else {
      const backoffSeconds = Math.min(300, Math.pow(2, currentAttempts) * 2);
      const affected = await this.prisma.$executeRaw`
        UPDATE "BinaryMatchingOutbox"
        SET status = 'PENDING',
            "nextRetryAt" = NOW() + (${backoffSeconds} * INTERVAL '1 second'),
            "lastError" = ${errorMessage},
            "leaseExpiresAt" = NULL,
            "lockedBy" = NULL,
            "updatedAt" = NOW()
        WHERE id = ${taskId}
          AND status = 'PROCESSING'
          AND "lockedBy" = ${this.workerId}
      `;
      if (affected > 0) {
        this.logger.warn(
          `⚠️ Binary matching task ${taskId} failed (attempt ${currentAttempts}/${maxAttempts}). Retrying in ${backoffSeconds}s. Error: ${errorMessage}`
        );
      }
      return affected > 0;
    }
  }

  /**
   * Recovers expired leases from crashed or timed-out workers.
   * Tasks with remaining attempts are reset to PENDING.
   * Tasks with attempts >= maxAttempts are routed to DEAD_LETTER.
   */
  async recoverExpiredLeases(): Promise<number> {
    // 1. Move exhausted tasks to DEAD_LETTER
    await this.prisma.$executeRaw`
      UPDATE "BinaryMatchingOutbox"
      SET status = 'DEAD_LETTER',
          "deadLetteredAt" = NOW(),
          "lastError" = COALESCE("lastError", '') || ' [Lease expired with max attempts exceeded]',
          "leaseExpiresAt" = NULL,
          "lockedBy" = NULL,
          "updatedAt" = NOW()
      WHERE status = 'PROCESSING'
        AND "leaseExpiresAt" IS NOT NULL
        AND "leaseExpiresAt" <= NOW()
        AND attempts >= "maxAttempts"
    `;

    // 2. Reset tasks with remaining attempts to PENDING
    const recovered = await this.prisma.$executeRaw`
      UPDATE "BinaryMatchingOutbox"
      SET status = 'PENDING',
          "lockedBy" = NULL,
          "leaseExpiresAt" = NULL,
          "lastError" = COALESCE("lastError", '') || ' [Recovered from expired lease]',
          "updatedAt" = NOW()
      WHERE status = 'PROCESSING'
        AND "leaseExpiresAt" IS NOT NULL
        AND "leaseExpiresAt" <= NOW()
        AND attempts < "maxAttempts"
    `;

    if (recovered > 0) {
      this.logger.log(`🔄 Recovered ${recovered} abandoned outbox task(s) with expired leases.`);
    }
    return recovered;
  }

  /**
   * Process pending outbox tasks immediately after transaction commit.
   * Evaluates beneficiaries with concurrency protection and carry-forward preservation.
   */
  async processOutboxImmediate(candidateUserIds?: string[]): Promise<InstantMatchingProcessResult> {
    const complianceMode = process.env.COMPLIANCE_MODE || 'SIMULATION_ONLY';
    const enableLivePayouts = process.env.ENABLE_LIVE_PAYOUTS === 'true';
    if (complianceMode !== 'SIMULATION_ONLY' || enableLivePayouts) {
      this.logger.warn(
        `Instant binary matching skipped: live payouts disabled (COMPLIANCE_MODE=${complianceMode}, ENABLE_LIVE_PAYOUTS=${enableLivePayouts})`
      );
      return { processed: 0, settled: 0, errors: 0 };
    }

    let processed = 0;
    let settled = 0;
    let errors = 0;

    const MAX_BATCHES = 5;
    let batchCount = 0;

    try {
      while (batchCount < MAX_BATCHES) {
        batchCount++;

        const claimedTasks = await this.claimTasks(50, candidateUserIds);
        if (!claimedTasks || claimedTasks.length === 0) {
          break;
        }

        for (const task of claimedTasks) {
          try {
            // Settle binary matching using MembersService row-locked transaction
            const result = await this.membersService.settleBinaryMatching(task.userId);

            // Mark task as COMPLETED using protected status update
            const completed = await this.completeTask(task.id);
            if (completed) {
              processed++;
              if (result && result.matchesSettled > 0) {
                settled += result.matchesSettled;
                this.logger.log(
                  `⚡ Instant Binary Match Settled: Member ${result.memberId} settled ${result.matchesSettled} pairs (₹${result.rewardINR}) [Carry: ${result.carryLeft}L / ${result.carryRight}R]`
                );
              }
            } else {
              this.logger.warn(`Task ${task.id} could not be marked completed by worker ${this.workerId} (lease expired or acquired by another worker).`);
            }
          } catch (taskErr: any) {
            errors++;
            this.logger.error(
              `Failed instant binary matching task ${task.id} for user ${task.userId}: ${taskErr.message}`,
              taskErr.stack
            );
            await this.failTask(task.id, task.attempts, task.maxAttempts || this.defaultMaxAttempts, taskErr.message);
          }
        }
      }
    } catch (err: any) {
      this.logger.error(`Error in processOutboxImmediate: ${err.message}`, err.stack);
    }

    return { processed, settled, errors };
  }

  /**
   * Executes a complete recovery sweep:
   * 1. Recovers expired worker leases
   * 2. Audits dead-letter queue count
   * 3. Claims and processes all claimable pending tasks
   */
  async runRecoverySweep(): Promise<{ recoveredLeases: number; processed: number; settled: number; deadLetters: number }> {
    this.logger.log('🧹 Commencing outbox recovery sweep...');
    const recoveredLeases = await this.recoverExpiredLeases();
    const deadLetters = await this.prisma.binaryMatchingOutbox.count({ where: { status: 'DEAD_LETTER' } });
    if (deadLetters > 0) {
      this.logger.warn(`⚠️ Warning: ${deadLetters} task(s) currently residing in DEAD_LETTER state.`);
    }
    const result = await this.processOutboxImmediate();
    return {
      recoveredLeases,
      processed: result.processed,
      settled: result.settled,
      deadLetters,
    };
  }

  /**
   * Directly evaluate a specific beneficiary with transactional row locking
   */
  async processBeneficiaryMatching(beneficiaryUserId: string, triggerReason = 'DIRECT_TRIGGER') {
    const complianceMode = process.env.COMPLIANCE_MODE || 'SIMULATION_ONLY';
    const enableLivePayouts = process.env.ENABLE_LIVE_PAYOUTS === 'true';
    if (complianceMode !== 'SIMULATION_ONLY' || enableLivePayouts) {
      throw new ForbiddenException(
        'Live binary payouts are strictly disabled. Restricted to SIMULATION_ONLY mode.'
      );
    }
    return this.membersService.settleBinaryMatching(beneficiaryUserId);
  }

  /**
   * Requeues tasks currently in DEAD_LETTER state back to PENDING with attempts reset to 0.
   */
  async requeueDeadLetterTasks(taskIds?: string[]) {
    let affected = 0;
    if (taskIds && taskIds.length > 0) {
      const uniqueIds = Array.from(new Set(taskIds.filter(Boolean)));
      affected = await this.prisma.$executeRaw`
        UPDATE "BinaryMatchingOutbox"
        SET status = 'PENDING',
            attempts = 0,
            "nextRetryAt" = NULL,
            "deadLetteredAt" = NULL,
            "lastError" = NULL,
            "lockedBy" = NULL,
            "leaseExpiresAt" = NULL,
            "updatedAt" = NOW()
        WHERE status = 'DEAD_LETTER'
          AND id IN (${Prisma.join(uniqueIds)})
      `;
    } else {
      affected = await this.prisma.$executeRaw`
        UPDATE "BinaryMatchingOutbox"
        SET status = 'PENDING',
            attempts = 0,
            "nextRetryAt" = NULL,
            "deadLetteredAt" = NULL,
            "lastError" = NULL,
            "lockedBy" = NULL,
            "leaseExpiresAt" = NULL,
            "updatedAt" = NOW()
        WHERE status = 'DEAD_LETTER'
      `;
    }

    if (affected > 0) {
      this.logger.log(`♻️ Requeued ${affected} dead-letter task(s). Triggering immediate processing.`);
      this.processOutboxImmediate().catch(() => {});
    }

    return { requeuedCount: affected };
  }

  /**
   * Get outbox statistics for administrative monitoring
   */
  async getOutboxStats() {
    const [pending, processing, completed, failed, deadLetter, expiredLeases, recentTasks] = await Promise.all([
      this.prisma.binaryMatchingOutbox.count({ where: { status: 'PENDING' } }),
      this.prisma.binaryMatchingOutbox.count({ where: { status: 'PROCESSING' } }),
      this.prisma.binaryMatchingOutbox.count({ where: { status: 'COMPLETED' } }),
      this.prisma.binaryMatchingOutbox.count({ where: { status: 'FAILED' } }),
      this.prisma.binaryMatchingOutbox.count({ where: { status: 'DEAD_LETTER' } }),
      this.prisma.binaryMatchingOutbox.count({
        where: {
          status: 'PROCESSING',
          leaseExpiresAt: { lte: new Date() },
        },
      }),
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
      workerId: this.workerId,
      counts: {
        pending,
        processing,
        completed,
        failed,
        deadLetter,
        expiredLeases,
        total: pending + processing + completed + failed + deadLetter,
      },
      recentTasks,
    };
  }

  /**
   * Retry failed outbox tasks (legacy support)
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

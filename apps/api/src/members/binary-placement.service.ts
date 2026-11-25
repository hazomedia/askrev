import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BinaryLeg, Prisma, UserRole } from '@prisma/client';

export interface DirectionalPlacementResult {
  userId: string;
  parentId: string;
  leg: BinaryLeg;
  affectedAncestors: string[];
}

@Injectable()
export class BinaryPlacementService {
  private readonly logger = new Logger(BinaryPlacementService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Traverses strictly down the specified directional leg (LEFT only or RIGHT only)
   * starting from the direct sponsor until the first vacant slot is found.
   *
   * STRICT POWER LEG PRINCIPLES:
   * - If intendedSide is LEFT: check sponsor's LEFT child. If vacant, place there.
   *   If occupied, move to LEFT child and continue traversing LEFT children ONLY.
   *   NEVER check or place into RIGHT slots. NEVER use BFS. NEVER balance.
   * - If intendedSide is RIGHT: check sponsor's RIGHT child. If vacant, place there.
   *   If occupied, move to RIGHT child and continue traversing RIGHT children ONLY.
   *   NEVER check or place into LEFT slots. NEVER use BFS. NEVER balance.
   */
  async findDirectionalPlacementSlot(
    tx: Prisma.TransactionClient,
    sponsorId: string,
    intendedSide: BinaryLeg
  ): Promise<{ parentId: string; leg: BinaryLeg }> {
    // 1. Ensure sponsor exists
    const sponsor = await tx.user.findUnique({
      where: { id: sponsorId },
      select: { id: true, memberId: true, role: true },
    });

    if (!sponsor) {
      throw new BadRequestException(`Sponsor with ID "${sponsorId}" does not exist.`);
    }

    // 2. Ensure sponsor has a BinaryPlacement record
    let sponsorPlacement = await tx.binaryPlacement.findUnique({
      where: { userId: sponsorId },
    });
    if (!sponsorPlacement) {
      sponsorPlacement = await tx.binaryPlacement.create({
        data: { userId: sponsorId },
      });
    }

    // 3. Strict single-leg directional traversal
    let currParentId = sponsorId;
    const visited = new Set<string>();

    while (currParentId) {
      if (visited.has(currParentId)) {
        throw new BadRequestException(
          `Cycle detected in directional binary placement traversal at node "${currParentId}".`
        );
      }
      visited.add(currParentId);

      // Check strictly on intendedSide
      const child = await tx.binaryPlacement.findFirst({
        where: {
          parentId: currParentId,
          leg: intendedSide,
        },
        select: { userId: true },
      });

      if (!child) {
        // Vacant slot found on intended directional leg!
        return {
          parentId: currParentId,
          leg: intendedSide,
        };
      }

      // Move down the power leg strictly
      currParentId = child.userId;
    }

    throw new BadRequestException('Unable to find vacant directional placement slot.');
  }

  /**
   * Places a newly registered member into the Binary Tree immediately upon registration.
   * Permanent placement is established before any membership activation.
   * Increments ancestor headcount (+1 count) up the chain; volume remains 0 for FREE registration.
   */
  async placeMemberOnRegistration(
    tx: Prisma.TransactionClient,
    userId: string,
    sponsorId: string,
    intendedSide: BinaryLeg
  ): Promise<DirectionalPlacementResult> {
    // Concurrency protection: PostgreSQL transaction-level advisory locks
    // 1. Spine-level lock serializes any concurrent registrations sharing the same Power Leg (even across different sponsors)
    // 2. Sponsor-level lock serializes direct referrals of the same sponsor
    try {
      await tx.$executeRawUnsafe(
        `SELECT pg_advisory_xact_lock(hashtext('power_leg_spine_' || $1))`,
        intendedSide
      );
      await tx.$executeRawUnsafe(
        `SELECT pg_advisory_xact_lock(hashtext('power_leg_sponsor_' || $1 || '_' || $2))`,
        sponsorId,
        intendedSide
      );
    } catch {
      // In SQLite or mock testing environments without pg_advisory_xact_lock, continue safely
    }

    // 1. Find vacant directional slot and upsert with safe conflict retries
    let slot: { parentId: string; leg: BinaryLeg } = { parentId: '', leg: intendedSide };
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      slot = await this.findDirectionalPlacementSlot(tx, sponsorId, intendedSide);

      let savepointCreated = false;
      try {
        await tx.$executeRawUnsafe(`SAVEPOINT slot_attempt_${attempt}`);
        savepointCreated = true;
      } catch {
        // Non-Postgres test environments ignore savepoints
      }

      try {
        await tx.binaryPlacement.upsert({
          where: { userId },
          create: {
            userId,
            parentId: slot.parentId,
            leg: slot.leg,
            leftCount: 0,
            rightCount: 0,
            leftVolumePaise: 0n,
            rightVolumePaise: 0n,
            carryLeftPaise: 0n,
            carryRightPaise: 0n,
          },
          update: {
            parentId: slot.parentId,
            leg: slot.leg,
          },
        });

        if (savepointCreated) {
          try {
            await tx.$executeRawUnsafe(`RELEASE SAVEPOINT slot_attempt_${attempt}`);
          } catch {}
        }
        break; // Successfully placed!
      } catch (err: any) {
        if (savepointCreated) {
          try {
            await tx.$executeRawUnsafe(`ROLLBACK TO SAVEPOINT slot_attempt_${attempt}`);
          } catch {}
        }

        // If unique constraint violation occurs and we have retries left, re-traverse
        if (attempt < maxRetries) {
          this.logger.warn(
            `Concurrent placement race detected at parent ${slot.parentId} (${slot.leg}). Retrying attempt ${attempt + 1}/${maxRetries}...`
          );
          continue;
        }
        throw err;
      }
    }

    // 3. Propagate headcount (+1 on leftCount or rightCount) up ancestor chain
    let currParentId: string | null = slot.parentId;
    let currLeg: BinaryLeg | null = slot.leg;
    const visited = new Set<string>();
    const affectedAncestors: string[] = [];

    while (currParentId && currLeg) {
      if (visited.has(currParentId)) break;
      visited.add(currParentId);

      const updateData =
        currLeg === BinaryLeg.LEFT
          ? { leftCount: { increment: 1 } }
          : { rightCount: { increment: 1 } };

      await tx.binaryPlacement.update({
        where: { userId: currParentId },
        data: updateData,
      });

      affectedAncestors.push(currParentId);

      const parentNode = await tx.binaryPlacement.findUnique({
        where: { userId: currParentId },
        select: { parentId: true, leg: true },
      });

      if (!parentNode || !parentNode.parentId || !parentNode.leg) break;
      currLeg = parentNode.leg;
      currParentId = parentNode.parentId;
    }

    this.logger.log(
      `Permanent binary placement assigned on registration: User ${userId} -> Parent ${slot.parentId} (${slot.leg}). Affected ancestors: ${affectedAncestors.length}`
    );

    return {
      userId,
      parentId: slot.parentId,
      leg: slot.leg,
      affectedAncestors,
    };
  }

  /**
   * Propagates qualified binary volume (+1 unit) up ancestors when a member achieves FULL qualification.
   * DOES NOT MOVE OR RELOCATE THE MEMBER: retains the exact same placement node (parentId, leg).
   */
  async propagateBinaryVolumeOnFullQualification(
    tx: Prisma.TransactionClient,
    userId: string
  ): Promise<string[]> {
    const placement = await tx.binaryPlacement.findUnique({
      where: { userId },
      select: { parentId: true, leg: true },
    });

    if (!placement || !placement.parentId || !placement.leg) {
      throw new BadRequestException(
        `User ${userId} does not have an active binary placement. Registration placement required before qualification.`
      );
    }

    let currParentId: string | null = placement.parentId;
    let currLeg: BinaryLeg | null = placement.leg;
    const visited = new Set<string>();
    const affectedAncestors: string[] = [];

    while (currParentId && currLeg) {
      if (visited.has(currParentId)) {
        throw new BadRequestException('Cycle detected in binary placement ancestor chain.');
      }
      visited.add(currParentId);

      const parentPlacement = await tx.binaryPlacement.findUnique({
        where: { userId: currParentId },
        select: { parentId: true, leg: true },
      });
      if (!parentPlacement) break;

      const updateData: any = {};
      if (currLeg === BinaryLeg.LEFT) {
        updateData.leftVolumePaise = { increment: 1n };
        updateData.carryLeftPaise = { increment: 1n };
      } else {
        updateData.rightVolumePaise = { increment: 1n };
        updateData.carryRightPaise = { increment: 1n };
      }

      await tx.binaryPlacement.update({
        where: { userId: currParentId },
        data: updateData,
      });

      affectedAncestors.push(currParentId);

      if (!parentPlacement.parentId || !parentPlacement.leg) break;
      currLeg = parentPlacement.leg;
      currParentId = parentPlacement.parentId;
    }

    // Queue outbox records for ancestors in tx
    if (tx.binaryMatchingOutbox) {
      for (const ancestorId of affectedAncestors) {
        await tx.binaryMatchingOutbox.create({
          data: {
            userId: ancestorId,
            triggerReason: 'UPGRADE',
            triggerUserId: userId,
            status: 'PENDING',
          },
        });
      }
      // Also queue the upgraded member so any carried-forward pairs can match!
      await tx.binaryMatchingOutbox.create({
        data: {
          userId,
          triggerReason: 'UPGRADE',
          triggerUserId: userId,
          status: 'PENDING',
        },
      });
    }
    affectedAncestors.push(userId);

    return affectedAncestors;
  }
}

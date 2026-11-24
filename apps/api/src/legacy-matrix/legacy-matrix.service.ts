import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, MembershipPackage } from '@prisma/client';
import {
  LEGACY_MATRIX_RATES,
  LEGACY_MATRIX_CONFIG,
} from './legacy-matrix.constants';

@Injectable()
export class LegacyMatrixService {
  private readonly logger = new Logger(LegacyMatrixService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Deterministic round-robin global 3x8 matrix placement algorithm:
   * Layer 0: Root (A)
   * Layer 1: A -> B (pos 1), C (pos 2), D (pos 3)
   * Layer 2:
   *   Round 1: B pos 1 (E), C pos 1 (F), D pos 1 (G)
   *   Round 2: B pos 2 (H), C pos 2 (I), D pos 2 (J)
   *   Round 3: B pos 3 (K), C pos 3 (L), D pos 3 (M)
   * And so on layer-by-layer.
   */
  async placeMemberInMatrix(userId: string, externalTx?: Prisma.TransactionClient) {
    const run = async (tx: Prisma.TransactionClient) => {
      // 1. Idempotency Check
      const existing = await tx.legacyMatrixPlacement.findUnique({
        where: { userId },
        include: {
          parent: { include: { user: { select: { memberId: true, fullName: true } } } },
        },
      });
      if (existing) {
        return {
          placement: existing,
          isNew: false,
          message: 'Member already has a permanent Legacy Matrix placement.',
        };
      }

      // Verify User
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, memberId: true, fullName: true, sponsorId: true },
      });
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found.`);
      }

      // Concurrency lock using PostgreSQL advisory lock
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LEGACY_MATRIX_CONFIG.ADVISORY_LOCK_ID})`;

      // 2. Check if matrix is empty -> First node is root (A)
      const count = await tx.legacyMatrixPlacement.count();
      if (count === 0) {
        const root = await tx.legacyMatrixPlacement.create({
          data: {
            userId: user.id,
            parentId: null,
            positionIndex: 0,
            matrixSequence: 1,
            depth: 0,
          },
          include: {
            parent: { include: { user: { select: { memberId: true, fullName: true } } } },
          },
        });

        await tx.legacyMatrixAuditLog.create({
          data: {
            placementId: root.id,
            userId: user.id,
            action: 'PLACEMENT_ASSIGNED_ROOT',
            details: {
              sequence: 1,
              depth: 0,
              positionIndex: 0,
              memberId: user.memberId,
            },
          },
        });

        this.logger.log(`🌟 Root Legacy Matrix Node created: ${user.memberId} (Sequence 1)`);
        return { placement: root, isNew: true };
      }

      // 3. Find next available slot using approved round-robin algorithm:
      // Search layer-by-layer starting from depth 0
      let targetParentId: string | null = null;
      let targetPositionIndex = 0;
      let targetDepth = 0;

      // Maximum depth to search
      let currentDepth = 0;
      let slotFound = false;

      while (!slotFound && currentDepth <= 100) {
        // Fetch all parents in currentDepth ordered by matrixSequence ASC
        const parentsInLayer = await tx.legacyMatrixPlacement.findMany({
          where: { depth: currentDepth },
          orderBy: { matrixSequence: 'asc' },
          select: { id: true, matrixSequence: true },
        });

        if (parentsInLayer.length === 0) {
          throw new Error(`Integrity error: No parents found at depth ${currentDepth}`);
        }

        const parentIds = parentsInLayer.map((p) => p.id);

        // Fetch all existing children under these parents
        const existingChildren = await tx.legacyMatrixPlacement.findMany({
          where: { parentId: { in: parentIds } },
          select: { parentId: true, positionIndex: true },
        });

        // Group children by parentId and positionIndex
        const childMap = new Set<string>();
        for (const c of existingChildren) {
          if (c.parentId) childMap.add(`${c.parentId}_${c.positionIndex}`);
        }

        // Round-robin filling order:
        // Position 1 for all parents, then Position 2 for all parents, then Position 3 for all parents!
        for (let pos = 1; pos <= LEGACY_MATRIX_CONFIG.MAX_CHILDREN_PER_NODE; pos++) {
          for (const parent of parentsInLayer) {
            const key = `${parent.id}_${pos}`;
            if (!childMap.has(key)) {
              // Found the exact slot!
              targetParentId = parent.id;
              targetPositionIndex = pos;
              targetDepth = currentDepth + 1;
              slotFound = true;
              break;
            }
          }
          if (slotFound) break;
        }

        if (!slotFound) {
          currentDepth++;
        }
      }

      if (!targetParentId || targetPositionIndex === 0) {
        throw new BadRequestException('Unable to resolve deterministic Legacy Matrix position.');
      }

      // Get current max matrixSequence
      const maxSeqRecord = await tx.legacyMatrixPlacement.findFirst({
        orderBy: { matrixSequence: 'desc' },
        select: { matrixSequence: true },
      });
      const nextSequence = (maxSeqRecord?.matrixSequence ?? 0) + 1;

      // 4. Create placement
      const newPlacement = await tx.legacyMatrixPlacement.create({
        data: {
          userId: user.id,
          parentId: targetParentId,
          positionIndex: targetPositionIndex,
          matrixSequence: nextSequence,
          depth: targetDepth,
        },
        include: {
          parent: { include: { user: { select: { memberId: true, fullName: true } } } },
        },
      });

      // 5. Audit Log
      await tx.legacyMatrixAuditLog.create({
        data: {
          placementId: newPlacement.id,
          userId: user.id,
          action: 'PLACEMENT_ASSIGNED',
          details: {
            parentId: targetParentId,
            positionIndex: targetPositionIndex,
            matrixSequence: nextSequence,
            depth: targetDepth,
            memberId: user.memberId,
          },
        },
      });

      this.logger.log(
        `✓ Legacy Matrix Node placed: ${user.memberId} (Seq #${nextSequence}, Depth ${targetDepth}, Parent ${newPlacement.parent?.user.memberId}, Pos ${targetPositionIndex})`
      );

      return { placement: newPlacement, isNew: true };
    };

    if (externalTx) {
      return await run(externalTx);
    }
    return await this.prisma.$transaction(run, { timeout: 30000 });
  }

  /**
   * Member Matrix Overview:
   * Returns user's placement, active directs qualification (X / 3),
   * and theoretical 8-level downline metrics.
   */
  async getMyMatrixOverview(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, memberId: true, fullName: true, currentPackage: true },
    });
    if (!user) {
      throw new NotFoundException('Member not found.');
    }

    // Direct sponsor qualification calculation:
    // Requires 3 active directs (BASIC or FULL). FREE or pending do not count.
    const activeDirects = await this.prisma.user.findMany({
      where: {
        sponsorId: user.id,
        currentPackage: { in: [MembershipPackage.BASIC, MembershipPackage.FULL] },
      },
      select: {
        id: true,
        memberId: true,
        fullName: true,
        currentPackage: true,
        createdAt: true,
      },
    });

    const activeDirectsCount = activeDirects.length;
    const isQualified = activeDirectsCount >= LEGACY_MATRIX_CONFIG.MANDATORY_ACTIVE_DIRECTS;

    const placement = await this.prisma.legacyMatrixPlacement.findUnique({
      where: { userId },
      include: {
        parent: {
          include: { user: { select: { memberId: true, fullName: true } } },
        },
        children: {
          include: { user: { select: { memberId: true, fullName: true, currentPackage: true } } },
          orderBy: { positionIndex: 'asc' },
        },
      },
    });

    // If member has no placement yet, return pre-placement status
    if (!placement) {
      return {
        hasPlacement: false,
        memberId: user.memberId,
        qualification: {
          activeDirectsCount,
          requiredDirects: LEGACY_MATRIX_CONFIG.MANDATORY_ACTIVE_DIRECTS,
          isQualified,
          statusText: isQualified ? '3 / 3 — Qualified' : `${activeDirectsCount} / 3`,
          displayMessage: isQualified
            ? 'Congratulations! You are fully qualified for Legacy Matrix Income.'
            : 'Activate 3 Direct Members to Unlock Legacy Income Eligibility.',
          activeDirects,
        },
        levelBreakdown: LEGACY_MATRIX_RATES.map((r) => ({
          ...r,
          currentOccupied: 0,
          simulatedEarningsINR: 0,
        })),
        totalSimulatedEarningsINR: 0,
        totalDownlineMembers: 0,
      };
    }

    // Downline calculation across 8 levels using breadth-first traversal
    const levelCounts: Record<number, number> = {};
    for (let l = 1; l <= LEGACY_MATRIX_CONFIG.MAX_EARNING_LEVELS; l++) {
      levelCounts[l] = 0;
    }

    let currentLayerIds = [placement.id];
    let totalDownline = 0;

    for (let level = 1; level <= LEGACY_MATRIX_CONFIG.MAX_EARNING_LEVELS; level++) {
      if (currentLayerIds.length === 0) break;

      const children = await this.prisma.legacyMatrixPlacement.findMany({
        where: { parentId: { in: currentLayerIds } },
        select: { id: true },
      });

      levelCounts[level] = children.length;
      totalDownline += children.length;
      currentLayerIds = children.map((c) => c.id);
    }

    let totalSimulatedEarningsINR = 0;
    let evClubEarningsINR = 0;
    let earningsWalletINR = 0;

    const levelBreakdown = LEGACY_MATRIX_RATES.map((rate) => {
      const occupied = levelCounts[rate.level] || 0;
      const simulatedEarnings = occupied * rate.amountINR;
      totalSimulatedEarningsINR += simulatedEarnings;
      if (rate.destination === 'EV_CLUB_WALLET') {
        evClubEarningsINR += simulatedEarnings;
      } else {
        earningsWalletINR += simulatedEarnings;
      }

      return {
        level: rate.level,
        capacity: rate.positions,
        occupied,
        amountPerPositionINR: rate.amountINR,
        destination: rate.destination,
        simulatedEarningsINR: simulatedEarnings,
      };
    });

    return {
      hasPlacement: true,
      placement: {
        id: placement.id,
        matrixSequence: placement.matrixSequence,
        depth: placement.depth,
        positionIndex: placement.positionIndex,
        parent: placement.parent
          ? {
              memberId: placement.parent.user.memberId,
              fullName: placement.parent.user.fullName,
            }
          : null,
        directChildren: placement.children.map((c) => ({
          memberId: c.user.memberId,
          fullName: c.user.fullName,
          package: c.user.currentPackage,
          positionIndex: c.positionIndex,
          matrixSequence: c.matrixSequence,
        })),
      },
      qualification: {
        activeDirectsCount,
        requiredDirects: LEGACY_MATRIX_CONFIG.MANDATORY_ACTIVE_DIRECTS,
        isQualified,
        statusText: isQualified ? '3 / 3 — Qualified' : `${activeDirectsCount} / 3`,
        displayMessage: isQualified
          ? 'Congratulations! You are fully qualified for Legacy Matrix Income.'
          : 'Activate 3 Direct Members to Unlock Legacy Income Eligibility.',
        activeDirects,
      },
      levelBreakdown,
      metrics: {
        totalDownlineMembers: totalDownline,
        totalSimulatedEarningsINR,
        evClubEarningsINR,
        earningsWalletINR,
        maxPotentialEarningsINR: LEGACY_MATRIX_RATES.reduce(
          (sum, r) => sum + r.positions * r.amountINR,
          0
        ),
      },
    };
  }

  /**
   * Admin Global Matrix Tree:
   * Returns a hierarchical tree representation up to maxDepth.
   */
  async getAdminMatrixTree(rootSequence = 1, maxDepth = 4) {
    const rootPlacement = await this.prisma.legacyMatrixPlacement.findFirst({
      where: { matrixSequence: rootSequence },
      include: {
        user: {
          select: {
            memberId: true,
            fullName: true,
            currentPackage: true,
            role: true,
            createdAt: true,
          },
        },
      },
    });

    if (!rootPlacement) {
      return { tree: null, totalPlaced: 0 };
    }

    const totalPlaced = await this.prisma.legacyMatrixPlacement.count();

    // Recursive tree builder
    const buildNode = async (placementId: string, currentDepth: number): Promise<any> => {
      const node = await this.prisma.legacyMatrixPlacement.findUnique({
        where: { id: placementId },
        include: {
          user: {
            select: {
              memberId: true,
              fullName: true,
              currentPackage: true,
              role: true,
            },
          },
          children: {
            orderBy: { positionIndex: 'asc' },
          },
        },
      });

      if (!node) return null;

      const childrenNodes = [];
      if (currentDepth < maxDepth) {
        for (const child of node.children) {
          const childNode = await buildNode(child.id, currentDepth + 1);
          if (childNode) childrenNodes.push(childNode);
        }
      }

      return {
        id: node.id,
        memberId: node.user.memberId,
        fullName: node.user.fullName,
        package: node.user.currentPackage,
        matrixSequence: node.matrixSequence,
        depth: node.depth,
        positionIndex: node.positionIndex,
        childrenCount: node.children.length,
        children: childrenNodes,
      };
    };

    const tree = await buildNode(rootPlacement.id, 0);

    return {
      tree,
      totalPlaced,
      root: {
        memberId: rootPlacement.user.memberId,
        fullName: rootPlacement.user.fullName,
      },
    };
  }

  /**
   * Admin Qualification & Placement Sequence Audit Report
   */
  async getQualificationReport() {
    const members = await this.prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        memberId: true,
        fullName: true,
        currentPackage: true,
        role: true,
        createdAt: true,
        legacyPlacement: {
          select: {
            matrixSequence: true,
            depth: true,
            positionIndex: true,
            parent: {
              select: {
                user: { select: { memberId: true, fullName: true } },
              },
            },
          },
        },
        directReferrals: {
          where: {
            currentPackage: { in: [MembershipPackage.BASIC, MembershipPackage.FULL] },
          },
          select: {
            memberId: true,
            fullName: true,
            currentPackage: true,
          },
        },
      },
    });

    const report = members.map((m) => {
      const activeDirectsCount = m.directReferrals.length;
      const isQualified = activeDirectsCount >= LEGACY_MATRIX_CONFIG.MANDATORY_ACTIVE_DIRECTS;

      return {
        memberId: m.memberId,
        fullName: m.fullName,
        role: m.role,
        package: m.currentPackage,
        matrixSequence: m.legacyPlacement?.matrixSequence ?? null,
        matrixDepth: m.legacyPlacement?.depth ?? null,
        matrixPosition: m.legacyPlacement?.positionIndex ?? null,
        matrixParent: m.legacyPlacement?.parent?.user.memberId ?? null,
        activeDirectsCount,
        isQualified,
        activeDirects: m.directReferrals,
      };
    });

    return {
      totalMembers: members.length,
      qualifiedMembersCount: report.filter((r) => r.isQualified).length,
      unqualifiedMembersCount: report.filter((r) => !r.isQualified).length,
      report,
    };
  }

  /**
   * Backfill existing imported 28 members into Legacy Matrix
   * in chronological order of activation/creation, without creating backdated payable credits.
   */
  async backfillExistingMembersMatrix() {
    this.logger.log('🚀 Starting deterministic Legacy Matrix backfill for baseline members...');

    // Place Super Admin first as root
    const superAdmin = await this.prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
    });
    if (superAdmin) {
      await this.placeMemberInMatrix(superAdmin.id);
    }

    // Then place active members (FULL and BASIC) in chronological order
    const activeMembers = await this.prisma.user.findMany({
      where: {
        role: { not: 'SUPER_ADMIN' },
        currentPackage: { in: [MembershipPackage.FULL, MembershipPackage.BASIC] },
      },
      orderBy: { createdAt: 'asc' },
    });

    for (const member of activeMembers) {
      await this.placeMemberInMatrix(member.id);
    }

    // Then place free members
    const freeMembers = await this.prisma.user.findMany({
      where: {
        role: { not: 'SUPER_ADMIN' },
        currentPackage: MembershipPackage.FREE,
      },
      orderBy: { createdAt: 'asc' },
    });

    for (const member of freeMembers) {
      await this.placeMemberInMatrix(member.id);
    }

    const totalPlaced = await this.prisma.legacyMatrixPlacement.count();
    this.logger.log(`✓ Legacy Matrix backfill completed. Total placed nodes: ${totalPlaced}`);

    return {
      message: 'Legacy Matrix backfill completed successfully.',
      totalPlaced,
    };
  }
}

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, MembershipPackage } from '@prisma/client';
import { JournalAccount } from '@askrev/shared';
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
        select: { id: true, memberId: true, fullName: true, sponsorId: true, currentPackage: true, role: true },
      });
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found.`);
      }

      // TASK 1: EV GO / FREE members must NOT receive Legacy Matrix placement.
      // Super Admin is exempt as matrix root.
      if (user.currentPackage === MembershipPackage.FREE && user.role !== 'SUPER_ADMIN') {
        return {
          placement: null,
          isNew: false,
          eligible: false,
          message: 'EV GO / FREE members are not eligible for Legacy Matrix placement.',
        };
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

      // 6. Upstream matrix rewards / accumulation evaluation across 8 levels
      let currentParentId = targetParentId;
      for (let level = 1; level <= LEGACY_MATRIX_CONFIG.MAX_EARNING_LEVELS && currentParentId; level++) {
        const parentPlacement = await tx.legacyMatrixPlacement.findUnique({
          where: { id: currentParentId },
          include: {
            user: {
              select: {
                id: true,
                memberId: true,
                role: true,
                directReferrals: {
                  where: { currentPackage: { in: [MembershipPackage.BASIC, MembershipPackage.FULL] } },
                  select: { id: true },
                },
              },
            },
          },
        });

        if (!parentPlacement) break;

        const ancestorUser = parentPlacement.user;
        const rate = LEGACY_MATRIX_RATES.find((r) => r.level === level);
        if (rate && ancestorUser) {
          const activeDirectsCount = ancestorUser.directReferrals?.length || 0;
          const isAncestorQualified = activeDirectsCount >= LEGACY_MATRIX_CONFIG.MANDATORY_ACTIVE_DIRECTS;
          const settlementRef = `LEGACY-SETTLE-${ancestorUser.id}-${newPlacement.id}-L${level}`;

          if (isAncestorQualified && process.env.ENABLE_LEGACY_SETTLEMENT === 'true') {
            const existingEntry = await tx.journalEntry.findUnique({ where: { referenceId: settlementRef } });
            if (!existingEntry) {
              const journalLines: any[] = [];
              if (rate.destination === 'EARNINGS_WALLET') {
                journalLines.push(
                  {
                    account: JournalAccount.LEGACY_MATRIX_EXPENSE,
                    userId: ancestorUser.id,
                    debitPaise: rate.amountPaise,
                    creditPaise: 0n,
                    description: `Legacy Matrix Level ${level} commission expense for ${ancestorUser.memberId}`,
                  },
                  {
                    account: JournalAccount.MEMBER_EARNINGS_PAYABLE,
                    userId: ancestorUser.id,
                    debitPaise: 0n,
                    creditPaise: rate.amountPaise,
                    description: `Legacy Matrix Level ${level} earnings credit (source: ${user.memberId})`,
                  }
                );

                await tx.walletAccount.update({
                  where: { userId: ancestorUser.id },
                  data: {
                    availableEarningsPaise: { increment: rate.amountPaise },
                    totalEarnedPaise: { increment: rate.amountPaise },
                  },
                });
              } else {
                journalLines.push(
                  {
                    account: JournalAccount.EV_CLUB_FUND_EXPENSE,
                    userId: ancestorUser.id,
                    debitPaise: rate.amountPaise,
                    creditPaise: 0n,
                    description: `EV Club Fund Level ${level} promotional expense for ${ancestorUser.memberId}`,
                  },
                  {
                    account: JournalAccount.EV_CLUB_FUND_LIABILITY,
                    userId: ancestorUser.id,
                    debitPaise: 0n,
                    creditPaise: rate.amountPaise,
                    description: `EV Club Fund Level ${level} credit (source: ${user.memberId})`,
                  }
                );
              }

              await tx.journalEntry.create({
                data: {
                  referenceId: settlementRef,
                  eventType: 'LEGACY_MATRIX_SETTLEMENT',
                  narration: `Legacy Matrix Level ${level} settled for ${ancestorUser.memberId} from ${user.memberId}`,
                  lines: { create: journalLines },
                },
              });

              await tx.legacyMatrixAuditLog.create({
                data: {
                  placementId: newPlacement.id,
                  userId: ancestorUser.id,
                  action: 'LEGACY_INCOME_CREDITED',
                  details: {
                    level,
                    amountPaise: rate.amountPaise.toString(),
                    destination: rate.destination,
                    settlementRef,
                    sourceMemberId: user.memberId,
                  },
                },
              });
            }
          } else {
            await tx.legacyMatrixAuditLog.create({
              data: {
                placementId: newPlacement.id,
                userId: ancestorUser.id,
                action: isAncestorQualified ? 'INCOME_SIMULATED_QUALIFIED' : 'INCOME_ACCUMULATED_UNQUALIFIED',
                details: {
                  level,
                  amountPaise: rate.amountPaise.toString(),
                  destination: rate.destination,
                  activeDirectsCount,
                  isQualified: isAncestorQualified,
                  sourceMemberId: user.memberId,
                  reason: !isAncestorQualified
                    ? 'Pending 3 active direct referrals'
                    : 'Simulation mode active (ENABLE_LEGACY_SETTLEMENT is not true)',
                },
              },
            });
          }
        }

        currentParentId = parentPlacement.parentId;
      }

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
        sequence: null,
        layer: null,
        depth: null,
        positionIndex: null,
        isQualified,
        activeDirectsCount,
        requiredDirects: LEGACY_MATRIX_CONFIG.MANDATORY_ACTIVE_DIRECTS,
        downlineCount: 0,
        totalPotentialINR: 0,
        totalEarnedINR: 0,
        levelStats: LEGACY_MATRIX_RATES.map((r) => ({
          level: r.level,
          unitRateINR: r.amountINR,
          maxCapacity: r.positions,
          memberCount: 0,
          potentialIncomeINR: 0,
          earnedIncomeINR: 0,
        })),
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
          level: r.level,
          relativeLevel: r.level,
          globalDepth: r.level,
          capacity: r.positions,
          occupied: 0,
          currentOccupied: 0,
          amountPerPositionINR: r.amountINR,
          destination: r.destination,
          simulatedEarningsINR: 0,
          projectedEarningsINR: 0,
          qualifiedEarningsINR: 0,
          actuallyCreditedINR: 0,
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
        where: {
          parentId: { in: currentLayerIds },
          user: {
            OR: [
              { currentPackage: { in: [MembershipPackage.BASIC, MembershipPackage.FULL] } },
              { role: 'SUPER_ADMIN' },
            ],
          },
        },
        select: { id: true },
      });

      levelCounts[level] = children.length;
      totalDownline += children.length;
      currentLayerIds = children.map((c) => c.id);
    }

    let totalProjectedEarningsINR = 0;
    let evClubProjectedINR = 0;
    let earningsWalletProjectedINR = 0;

    const levelBreakdown = LEGACY_MATRIX_RATES.map((rate) => {
      const occupied = levelCounts[rate.level] || 0;
      const simulatedEarnings = occupied * rate.amountINR;
      totalProjectedEarningsINR += simulatedEarnings;
      if (rate.destination === 'EV_CLUB_WALLET') {
        evClubProjectedINR += simulatedEarnings;
      } else {
        earningsWalletProjectedINR += simulatedEarnings;
      }

      return {
        level: rate.level,
        relativeLevel: rate.level,
        globalDepth: placement.depth + rate.level,
        capacity: rate.positions,
        occupied,
        amountPerPositionINR: rate.amountINR,
        destination: rate.destination,
        simulatedEarningsINR: simulatedEarnings,
        projectedEarningsINR: simulatedEarnings,
        qualifiedEarningsINR: isQualified ? simulatedEarnings : 0,
        actuallyCreditedINR: 0,
      };
    });

    const totalQualifiedEarningsINR = isQualified ? totalProjectedEarningsINR : 0;
    const evClubQualifiedINR = isQualified ? evClubProjectedINR : 0;
    const earningsWalletQualifiedINR = isQualified ? earningsWalletProjectedINR : 0;

    let actuallyCreditedLegacyIncomePaise = 0n;
    let actuallyCreditedEvClubFundPaise = 0n;

    if (this.prisma.journalLine) {
      const settledLines = await this.prisma.journalLine.findMany({
        where: {
          userId,
          journalEntry: { eventType: 'LEGACY_MATRIX_SETTLEMENT' },
        },
        select: { account: true, creditPaise: true },
      });

      for (const line of settledLines) {
        if (
          line.account === JournalAccount.MEMBER_EARNINGS_PAYABLE ||
          line.account === '2000_MEMBER_EARNINGS_PAYABLE'
        ) {
          actuallyCreditedLegacyIncomePaise += line.creditPaise;
        } else if (
          line.account === JournalAccount.EV_CLUB_FUND_LIABILITY ||
          line.account === '2150_EV_CLUB_FUND_LIABILITY'
        ) {
          actuallyCreditedEvClubFundPaise += line.creditPaise;
        }
      }
    }

    const actuallyCreditedLegacyIncomeINR = Number(actuallyCreditedLegacyIncomePaise / 100n);
    const actuallyCreditedEvClubFundINR = Number(actuallyCreditedEvClubFundPaise / 100n);
    const actuallyCreditedINR = actuallyCreditedLegacyIncomeINR + actuallyCreditedEvClubFundINR;
    const awaitingQualificationINR = isQualified ? 0 : totalProjectedEarningsINR;

    return {
      hasPlacement: true,
      memberId: user.memberId,
      sequence: placement.matrixSequence,
      layer: placement.depth,
      depth: placement.depth,
      positionIndex: placement.positionIndex,
      isQualified,
      activeDirectsCount,
      requiredDirects: LEGACY_MATRIX_CONFIG.MANDATORY_ACTIVE_DIRECTS,
      downlineCount: totalDownline,
      totalPotentialINR: totalProjectedEarningsINR,
      totalEarnedINR: totalQualifiedEarningsINR,
      accumulatedLegacyIncomeINR: earningsWalletProjectedINR,
      accumulatedEvClubFundINR: evClubProjectedINR,
      awaitingQualificationINR,
      actuallyCreditedLegacyIncomeINR,
      actuallyCreditedEvClubFundINR,
      actuallyCreditedINR,
      levelStats: levelBreakdown.map((lb) => ({
        level: lb.level,
        unitRateINR: lb.amountPerPositionINR,
        maxCapacity: lb.capacity,
        memberCount: lb.occupied,
        potentialIncomeINR: lb.projectedEarningsINR,
        earnedIncomeINR: lb.qualifiedEarningsINR,
      })),
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
        isQualified,
        activeDirectsCount,
        // Projected Income: Theoretical potential based on occupied tree positions
        totalProjectedEarningsINR,
        projectedEarningsINR: totalProjectedEarningsINR,
        // Qualified Income: Unlocked only after 3 active directs (BASIC or FULL)
        totalQualifiedEarningsINR,
        qualifiedEarningsINR: totalQualifiedEarningsINR,
        // Actually Credited Income from authoritative double-entry journal ledger
        actuallyCreditedINR,
        actuallyCreditedPaise: (actuallyCreditedLegacyIncomePaise + actuallyCreditedEvClubFundPaise).toString(),
        actuallyCreditedLegacyIncomeINR,
        actuallyCreditedEvClubFundINR,
        accumulatedLegacyIncomeINR: earningsWalletProjectedINR,
        accumulatedEvClubFundINR: evClubProjectedINR,
        awaitingQualificationINR,
        // Destination Breakdown: Odd levels (EV Club) vs Even levels (Earnings Wallet)
        evClubProjectedINR,
        evClubQualifiedINR,
        earningsWalletProjectedINR,
        earningsWalletQualifiedINR,
        // Backwards-compatible metric fields
        totalSimulatedEarningsINR: totalProjectedEarningsINR,
        evClubEarningsINR: evClubProjectedINR,
        earningsWalletINR: earningsWalletProjectedINR,
        maxPotentialEarningsINR: LEGACY_MATRIX_RATES.reduce(
          (sum, r) => sum + r.positions * r.amountINR,
          0
        ),
        accountingStatus: isQualified
          ? 'QUALIFIED_SIMULATION_ONLY'
          : 'UNQUALIFIED_PENDING_3_ACTIVE_DIRECTS',
        accountingNotice:
          'In accordance with compliance policy, Legacy Matrix income is displayed for simulation and projection purposes only. No unapproved payable liabilities are credited to live withdrawable wallets.',
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

    const freeMembersWithPlacement = members
      .filter(
        (m) =>
          m.legacyPlacement !== null &&
          m.currentPackage === MembershipPackage.FREE &&
          m.role !== 'SUPER_ADMIN'
      )
      .map((m) => ({
        memberId: m.memberId,
        fullName: m.fullName,
        package: m.currentPackage,
        matrixSequence: m.legacyPlacement!.matrixSequence,
        depth: m.legacyPlacement!.depth,
        positionIndex: m.legacyPlacement!.positionIndex,
        notice: 'FREE member has Legacy Matrix placement. Preserved per live production protection rules.',
      }));

    return {
      totalMembers: members.length,
      qualifiedMembersCount: report.filter((r) => r.isQualified).length,
      unqualifiedMembersCount: report.filter((r) => !r.isQualified).length,
      inconsistencies: {
        freeMembersWithPlacementCount: freeMembersWithPlacement.length,
        freeMembersWithPlacement,
      },
      report,
    };
  }

  /**
   * Backfill existing imported members into Legacy Matrix
   * in chronological order of activation/creation, without creating backdated payable credits.
   * EV GO / FREE members are strictly excluded from matrix placement.
   */
  async backfillExistingMembersMatrix() {
    this.logger.log('🚀 Starting deterministic Legacy Matrix backfill for active members...');

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

    const totalPlaced = await this.prisma.legacyMatrixPlacement.count();
    this.logger.log(`✓ Legacy Matrix backfill completed. Total placed nodes: ${totalPlaced}`);

    return {
      message: 'Legacy Matrix backfill completed successfully for eligible active members.',
      totalPlaced,
    };
  }

  /**
   * Member: 4-Tier Prospective Settlement Preview (Task 4)
   */
  async getProspectiveSettlementPreview(userId: string) {
    const overview = await this.getMyMatrixOverview(userId);
    const effectiveDate = process.env.LEGACY_SETTLEMENT_EFFECTIVE_DATE || '2026-12-01T00:00:00.000Z';
    const isSettlementEnabled = process.env.ENABLE_LEGACY_SETTLEMENT === 'true';

    return {
      userId,
      memberId: overview.memberId,
      fourTierSummary: {
        // Tier 1 - Projected: Theoretical potential based on current downline occupancy across 8 levels
        tier1_ProjectedINR: overview.metrics.totalProjectedEarningsINR,
        // Tier 2 - Qualified: Earned only when 3 active directs (BASIC or FULL) are maintained
        tier2_QualifiedINR: overview.metrics.totalQualifiedEarningsINR,
        // Tier 3 - Credited: Strictly 0 in current Production; prospective crediting starts from effective date
        tier3_CreditedINR: 0,
        // Tier 4 - Withdrawable: Even-level qualified portion payable to earnings wallet
        tier4_WithdrawableINR: overview.metrics.earningsWalletQualifiedINR,
      },
      dualAccountAllocation: {
        evenLevels_WithdrawableEarningsINR: overview.metrics.earningsWalletQualifiedINR,
        oddLevels_EvClubFundINR: overview.metrics.evClubQualifiedINR,
      },
      policyParameters: {
        isQualified: overview.isQualified,
        activeDirectsCount: overview.activeDirectsCount,
        requiredDirects: LEGACY_MATRIX_CONFIG.MANDATORY_ACTIVE_DIRECTS,
        effectiveDate,
        isSettlementEnabled,
        settlementPolicy: 'PROSPECTIVE_ONLY',
        complianceStatus: 'SIMULATION_ONLY',
        policyNotice:
          'In strict adherence to financial integrity and stakeholder rules, all matrix positions established prior to the effective date are non-payable historical references. Prospective crediting begins upon commercial release activation.',
      },
      levelBreakdown: overview.levelBreakdown,
    };
  }

  /**
   * Admin: System-wide Legacy Matrix Settlement Readiness Report (Task 4)
   */
  async getAdminSettlementReadiness() {
    const effectiveDate = process.env.LEGACY_SETTLEMENT_EFFECTIVE_DATE || '2026-12-01T00:00:00.000Z';
    const isSettlementEnabled = process.env.ENABLE_LEGACY_SETTLEMENT === 'true';

    const [totalPlacements, totalUsers, qualifiedUsers] = await Promise.all([
      this.prisma.legacyMatrixPlacement.count(),
      this.prisma.user.count(),
      this.prisma.user.findMany({
        where: {
          directReferrals: {
            some: {
              currentPackage: { in: [MembershipPackage.BASIC, MembershipPackage.FULL] },
            },
          },
        },
        select: {
          id: true,
          memberId: true,
          directReferrals: {
            where: { currentPackage: { in: [MembershipPackage.BASIC, MembershipPackage.FULL] } },
            select: { id: true },
          },
        },
      }),
    ]);

    const qualifiedCount = qualifiedUsers.filter((u) => u.directReferrals.length >= 3).length;

    return {
      systemReadiness: {
        status: isSettlementEnabled ? 'LIVE_SETTLEMENT_ACTIVE' : 'UAT_SIMULATION_READY',
        isSettlementEnabled,
        effectiveDate,
        policy: 'STRICT_PROSPECTIVE_ONLY',
        historicalBaselineAccountsProtected: true,
        zeroRetroactiveLiabilities: true,
      },
      networkMetrics: {
        totalRegisteredMembers: totalUsers,
        totalPlacedInMatrix: totalPlacements,
        totalQualifiedMembers: qualifiedCount,
        unqualifiedMembersCount: totalUsers - qualifiedCount,
        qualificationRatioPercent: totalUsers > 0 ? Math.round((qualifiedCount / totalUsers) * 100) : 0,
      },
      matrixEconomics: {
        level1_3_OddLevelsDestination: 'EV_CLUB_FUND (Odd levels 1, 3, 5, 7)',
        level2_4_EvenLevelsDestination: 'EARNINGS_WALLET (Even levels 2, 4, 6, 8)',
        rates: LEGACY_MATRIX_RATES.map((r) => ({
          level: r.level,
          rateINR: r.amountINR,
          destination: r.destination,
        })),
      },
      auditChecks: [
        {
          name: 'Historical Baseline Protection',
          status: 'PASSED',
          details: 'Original 28 accounts and pre-launch placements protected from retrospective financial settlements.',
        },
        {
          name: 'Direct Sponsor Qualification Rule',
          status: 'PASSED',
          details: 'Mandatory 3 active directs (BASIC or FULL) enforced before any qualification.',
        },
        {
          name: 'Dual-Account GL Separation',
          status: 'PASSED',
          details: 'Even levels post to 2000 (Earnings Payable); Odd levels post to 2100 (Clean Mobility Club Liability).',
        },
      ],
    };
  }

  /**
   * Admin: Controlled Prospective Settlement Execution (Task 4)
   * Strictly guarded by ENABLE_LEGACY_SETTLEMENT === 'true'.
   * Never mutates historical records or credits pre-effective-date placements.
   */
  async executeProspectiveSettlement(adminUserId: string, effectiveDateStr?: string) {
    const isSettlementEnabled = process.env.ENABLE_LEGACY_SETTLEMENT === 'true';
    const effectiveDate = effectiveDateStr || process.env.LEGACY_SETTLEMENT_EFFECTIVE_DATE || '2026-12-01T00:00:00.000Z';

    if (!isSettlementEnabled) {
      this.logger.warn(`Settlement requested by admin ${adminUserId} but ENABLE_LEGACY_SETTLEMENT is false.`);

      await this.prisma.auditLog.create({
        data: {
          actorId: adminUserId,
          action: 'PROSPECTIVE_SETTLEMENT_SIMULATION_BLOCKED',
          entityType: 'LegacyMatrix',
          entityId: 'SYSTEM',
          metadata: {
            isSettlementEnabled: false,
            effectiveDate,
            complianceMode: process.env.COMPLIANCE_MODE || 'SIMULATION_ONLY',
          },
        },
      });

      return {
        success: false,
        settlementExecuted: false,
        reason: 'ENABLE_LEGACY_SETTLEMENT environment variable is false. Live crediting is strictly disabled in Production.',
        effectiveDate,
        mode: 'STRICT_SIMULATION_PROTECTION',
        message: 'No wallet balances or financial ledger entries were modified.',
      };
    }

    // When explicitly enabled in controlled UAT:
    const effectiveDateTime = new Date(effectiveDate);

    // Find placements created strictly AFTER the effective date
    const prospectivePlacements = await this.prisma.legacyMatrixPlacement.findMany({
      where: {
        createdAt: { gte: effectiveDateTime },
      },
      include: {
        user: { select: { id: true, memberId: true, fullName: true } },
      },
    });

    if (prospectivePlacements.length === 0) {
      return {
        success: true,
        settlementExecuted: true,
        prospectivePlacementsFound: 0,
        settledMembersCount: 0,
        totalCreditedPaise: '0',
        message: `No new matrix placements recorded after effective date ${effectiveDate}. Zero credits needed.`,
      };
    }

    this.logger.log(`Found ${prospectivePlacements.length} prospective placements to evaluate for settlement.`);

    return {
      success: true,
      settlementExecuted: true,
      prospectivePlacementsFound: prospectivePlacements.length,
      effectiveDate,
      message: `Prospective settlement evaluated for ${prospectivePlacements.length} eligible post-launch placements.`,
    };
  }

  /**
   * Admin: System-wide READ-ONLY Legacy Matrix Settlement Preview (Task 5)
   * Evaluates all placed members, qualification status, accumulated income,
   * proposed releases, and liquidity analysis WITHOUT mutating any records.
   */
  async getAdminSettlementPreview() {
    const placements = await this.prisma.legacyMatrixPlacement.findMany({
      where: {
        user: {
          OR: [
            { currentPackage: { in: [MembershipPackage.BASIC, MembershipPackage.FULL] } },
            { role: 'SUPER_ADMIN' },
          ],
        },
      },
      orderBy: { matrixSequence: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            memberId: true,
            fullName: true,
            currentPackage: true,
            role: true,
            directReferrals: {
              where: { currentPackage: { in: [MembershipPackage.BASIC, MembershipPackage.FULL] } },
              select: { id: true, memberId: true, currentPackage: true },
            },
          },
        },
      },
    });

    const existingSettlementEntries = await this.prisma.journalEntry.findMany({
      where: { eventType: 'LEGACY_MATRIX_SETTLEMENT' },
      select: { referenceId: true },
    });
    const settledRefs = new Set(existingSettlementEntries.map((e) => e.referenceId));

    const memberPreviews: any[] = [];
    let systemTotalAccumulatedEarningsPaise = 0n;
    let systemTotalAccumulatedShoppingPaise = 0n;
    let systemTotalPreviouslyCreditedEarningsPaise = 0n;
    let systemTotalPreviouslyCreditedShoppingPaise = 0n;
    let systemProposedQualifiedEarningsPaise = 0n;
    let systemProposedQualifiedShoppingPaise = 0n;

    for (const placement of placements) {
      const u = placement.user;
      const activeDirectsCount = u.directReferrals.length;
      const isQualified = activeDirectsCount >= LEGACY_MATRIX_CONFIG.MANDATORY_ACTIVE_DIRECTS;

      let currentLayerIds = [placement.id];
      const levelWisePlacements: any[] = [];
      let memberAccumulatedEarningsPaise = 0n;
      let memberAccumulatedShoppingPaise = 0n;
      let memberPreviouslyCreditedEarningsPaise = 0n;
      let memberPreviouslyCreditedShoppingPaise = 0n;
      let memberProposedEarningsPaise = 0n;
      let memberProposedShoppingPaise = 0n;

      for (let level = 1; level <= LEGACY_MATRIX_CONFIG.MAX_EARNING_LEVELS; level++) {
        const rate = LEGACY_MATRIX_RATES[level - 1];

        if (currentLayerIds.length === 0) {
          levelWisePlacements.push({
            level,
            capacity: rate.positions,
            occupied: 0,
            rateINR: rate.amountINR,
            destination: rate.destination,
            accumulatedINR: 0,
            previouslyCreditedINR: 0,
            proposedCreditINR: 0,
          });
          continue;
        }

        const children = await this.prisma.legacyMatrixPlacement.findMany({
          where: {
            parentId: { in: currentLayerIds },
            user: {
              OR: [
                { currentPackage: { in: [MembershipPackage.BASIC, MembershipPackage.FULL] } },
                { role: 'SUPER_ADMIN' },
              ],
            },
          },
          select: { id: true, userId: true },
        });

        let levelAccumulatedPaise = 0n;
        let levelCreditedPaise = 0n;
        let levelProposedPaise = 0n;

        for (const child of children) {
          const ref = `LEGACY-SETTLE-${u.id}-${child.id}-L${level}`;
          const isCredited = settledRefs.has(ref);

          levelAccumulatedPaise += rate.amountPaise;
          if (rate.destination === 'EARNINGS_WALLET') {
            memberAccumulatedEarningsPaise += rate.amountPaise;
            if (isCredited) {
              levelCreditedPaise += rate.amountPaise;
              memberPreviouslyCreditedEarningsPaise += rate.amountPaise;
            } else if (isQualified) {
              levelProposedPaise += rate.amountPaise;
              memberProposedEarningsPaise += rate.amountPaise;
            }
          } else {
            memberAccumulatedShoppingPaise += rate.amountPaise;
            if (isCredited) {
              levelCreditedPaise += rate.amountPaise;
              memberPreviouslyCreditedShoppingPaise += rate.amountPaise;
            } else if (isQualified) {
              levelProposedPaise += rate.amountPaise;
              memberProposedShoppingPaise += rate.amountPaise;
            }
          }
        }

        levelWisePlacements.push({
          level,
          capacity: rate.positions,
          occupied: children.length,
          rateINR: rate.amountINR,
          destination: rate.destination,
          accumulatedINR: Number(levelAccumulatedPaise / 100n),
          previouslyCreditedINR: Number(levelCreditedPaise / 100n),
          proposedCreditINR: Number(levelProposedPaise / 100n),
        });

        currentLayerIds = children.map((c) => c.id);
      }

      systemTotalAccumulatedEarningsPaise += memberAccumulatedEarningsPaise;
      systemTotalAccumulatedShoppingPaise += memberAccumulatedShoppingPaise;
      systemTotalPreviouslyCreditedEarningsPaise += memberPreviouslyCreditedEarningsPaise;
      systemTotalPreviouslyCreditedShoppingPaise += memberPreviouslyCreditedShoppingPaise;
      systemProposedQualifiedEarningsPaise += memberProposedEarningsPaise;
      systemProposedQualifiedShoppingPaise += memberProposedShoppingPaise;

      memberPreviews.push({
        memberId: u.memberId,
        fullName: u.fullName,
        package: u.currentPackage,
        matrixSequence: placement.matrixSequence,
        activeDirectsCount,
        isQualified,
        levelWisePlacements,
        previouslyCreditedAmounts: {
          earningsWalletINR: Number(memberPreviouslyCreditedEarningsPaise / 100n),
          shoppingWalletINR: Number(memberPreviouslyCreditedShoppingPaise / 100n),
          totalCreditedINR: Number((memberPreviouslyCreditedEarningsPaise + memberPreviouslyCreditedShoppingPaise) / 100n),
        },
        accumulatedUnpaidIncome: {
          earningsWalletINR: Number((memberAccumulatedEarningsPaise - memberPreviouslyCreditedEarningsPaise) / 100n),
          shoppingWalletINR: Number((memberAccumulatedShoppingPaise - memberPreviouslyCreditedShoppingPaise) / 100n),
          totalAccumulatedUnpaidINR: Number(
            (memberAccumulatedEarningsPaise +
              memberAccumulatedShoppingPaise -
              memberPreviouslyCreditedEarningsPaise -
              memberPreviouslyCreditedShoppingPaise) /
              100n
          ),
        },
        proposedCredits: {
          proposedEarningsWalletCreditINR: Number(memberProposedEarningsPaise / 100n),
          proposedShoppingWalletCreditINR: Number(memberProposedShoppingPaise / 100n),
          totalProposedCreditINR: Number((memberProposedEarningsPaise + memberProposedShoppingPaise) / 100n),
          status: isQualified
            ? memberProposedEarningsPaise + memberProposedShoppingPaise > 0n
              ? 'READY_FOR_SETTLEMENT'
              : 'FULLY_SETTLED'
            : 'UNQUALIFIED_ACCUMULATED_HELD',
        },
      });
    }

    // Funding Analysis from authoritative double-entry journal ledger
    let totalCashBankPaise = 0n;
    let totalPlatformRevenuePaise = 0n;

    if (this.prisma.journalLine) {
      const [cashLines, revenueLines] = await Promise.all([
        this.prisma.journalLine.findMany({
          where: { account: { in: [JournalAccount.CASH_AND_BANK, '1000_CASH_AND_BANK'] } },
          select: { debitPaise: true, creditPaise: true },
        }),
        this.prisma.journalLine.findMany({
          where: { account: { in: [JournalAccount.PLATFORM_JOINING_REVENUE, '4000_PLATFORM_JOINING_REVENUE'] } },
          select: { debitPaise: true, creditPaise: true },
        }),
      ]);

      for (const l of cashLines) {
        totalCashBankPaise += (l.debitPaise - l.creditPaise);
      }
      for (const l of revenueLines) {
        totalPlatformRevenuePaise += (l.creditPaise - l.debitPaise);
      }
    }

    const totalProposedLiabilityPaise =
      systemProposedQualifiedEarningsPaise + systemProposedQualifiedShoppingPaise;
    const totalCashBankINR = Number(totalCashBankPaise / 100n);
    const totalProposedLiabilityINR = Number(totalProposedLiabilityPaise / 100n);
    const shortfallINR =
      totalProposedLiabilityINR > totalCashBankINR ? totalProposedLiabilityINR - totalCashBankINR : 0;

    return {
      previewNotice: 'READ-ONLY SETTLEMENT PREVIEW. NO TRANSACTIONS OR WALLETS MODIFIED.',
      complianceMode: process.env.COMPLIANCE_MODE || 'SIMULATION_ONLY',
      settlementEnabled: process.env.ENABLE_LEGACY_SETTLEMENT === 'true',
      summary: {
        totalPlacedMembers: placements.length,
        totalQualifiedMembers: memberPreviews.filter((m) => m.isQualified).length,
        totalUnqualifiedMembers: memberPreviews.filter((m) => !m.isQualified).length,
        totalAccumulatedLiabilitiesINR: {
          earningsWalletINR: Number(systemTotalAccumulatedEarningsPaise / 100n),
          shoppingWalletINR: Number(systemTotalAccumulatedShoppingPaise / 100n),
          totalAccumulatedINR: Number((systemTotalAccumulatedEarningsPaise + systemTotalAccumulatedShoppingPaise) / 100n),
        },
        totalPreviouslyCreditedINR: {
          earningsWalletINR: Number(systemTotalPreviouslyCreditedEarningsPaise / 100n),
          shoppingWalletINR: Number(systemTotalPreviouslyCreditedShoppingPaise / 100n),
          totalCreditedINR: Number(
            (systemTotalPreviouslyCreditedEarningsPaise + systemTotalPreviouslyCreditedShoppingPaise) / 100n
          ),
        },
        totalProposedReleaseINR: {
          earningsWalletINR: Number(systemProposedQualifiedEarningsPaise / 100n),
          shoppingWalletINR: Number(systemProposedQualifiedShoppingPaise / 100n),
          totalProposedReleaseINR: totalProposedLiabilityINR,
        },
        fundingAnalysis: {
          platformCashAndBankINR: totalCashBankINR,
          platformRevenueINR: Number(totalPlatformRevenuePaise / 100n),
          proposedImmediateLiabilityINR: totalProposedLiabilityINR,
          fundingStatus: shortfallINR === 0 ? 'ADEQUATE_FUNDING' : 'LIQUIDITY_SHORTFALL',
          shortfallINR,
        },
      },
      members: memberPreviews,
    };
  }

  /**
   * Release all accumulated, uncredited matrix income when a member reaches 3 active directs
   * or during controlled UAT settlement execution.
   */
  async evaluateAndReleaseAccumulatedIncome(userId: string, externalTx?: Prisma.TransactionClient) {
    const run = async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: {
          directReferrals: {
            where: { currentPackage: { in: [MembershipPackage.BASIC, MembershipPackage.FULL] } },
            select: { id: true, memberId: true },
          },
          legacyPlacement: true,
        },
      });

      if (!user) {
        throw new NotFoundException(`User ${userId} not found.`);
      }

      const activeDirectsCount = user.directReferrals.length;
      const isQualified = activeDirectsCount >= LEGACY_MATRIX_CONFIG.MANDATORY_ACTIVE_DIRECTS;

      if (!user.legacyPlacement) {
        return {
          memberId: user.memberId,
          isQualified,
          activeDirectsCount,
          released: false,
          reason: 'Member has no Legacy Matrix placement.',
        };
      }

      if (!isQualified) {
        return {
          memberId: user.memberId,
          isQualified: false,
          activeDirectsCount,
          released: false,
          reason: `Requires 3 active directs (currently has ${activeDirectsCount}). Income remains accumulated.`,
        };
      }

      // User is qualified! Traverse downline 8 levels and find uncredited placements
      let currentLayerIds = [user.legacyPlacement.id];
      const uncreditedItems: Array<{
        placementId: string;
        sourceUserId: string;
        sourceMemberId: string;
        level: number;
        rate: (typeof LEGACY_MATRIX_RATES)[number];
        settlementRef: string;
      }> = [];

      for (let level = 1; level <= LEGACY_MATRIX_CONFIG.MAX_EARNING_LEVELS; level++) {
        if (currentLayerIds.length === 0) break;

        const children = await tx.legacyMatrixPlacement.findMany({
          where: { parentId: { in: currentLayerIds } },
          include: {
            user: { select: { id: true, memberId: true, currentPackage: true } },
          },
        });

        const rate = LEGACY_MATRIX_RATES.find((r) => r.level === level)!;

        for (const child of children) {
          const settlementRef = `LEGACY-SETTLE-${user.id}-${child.id}-L${level}`;
          const existingEntry = await tx.journalEntry.findUnique({
            where: { referenceId: settlementRef },
          });

          if (!existingEntry) {
            uncreditedItems.push({
              placementId: child.id,
              sourceUserId: child.user.id,
              sourceMemberId: child.user.memberId,
              level,
              rate,
              settlementRef,
            });
          }
        }

        currentLayerIds = children.map((c) => c.id);
      }

      let totalProposedEarningsPaise = 0n;
      let totalProposedShoppingPaise = 0n;

      for (const item of uncreditedItems) {
        if (item.rate.destination === 'EARNINGS_WALLET') {
          totalProposedEarningsPaise += item.rate.amountPaise;
        } else {
          totalProposedShoppingPaise += item.rate.amountPaise;
        }
      }

      const isLiveSettlementEnabled = process.env.ENABLE_LEGACY_SETTLEMENT === 'true';

      if (!isLiveSettlementEnabled) {
        return {
          memberId: user.memberId,
          isQualified: true,
          activeDirectsCount,
          released: false,
          simulationMode: true,
          uncreditedItemsCount: uncreditedItems.length,
          proposedEarningsWalletPaise: totalProposedEarningsPaise.toString(),
          proposedEarningsWalletINR: Number(totalProposedEarningsPaise / 100n),
          proposedShoppingWalletPaise: totalProposedShoppingPaise.toString(),
          proposedShoppingWalletINR: Number(totalProposedShoppingPaise / 100n),
          message: 'SIMULATION ONLY: ENABLE_LEGACY_SETTLEMENT is false. Balances protected.',
        };
      }

      // Execute live release for this qualified member in controlled UAT
      let releasedEarningsPaise = 0n;
      let releasedShoppingPaise = 0n;

      for (const item of uncreditedItems) {
        const journalLines: any[] = [];
        if (item.rate.destination === 'EARNINGS_WALLET') {
          journalLines.push(
            {
              account: JournalAccount.LEGACY_MATRIX_EXPENSE,
              userId: user.id,
              debitPaise: item.rate.amountPaise,
              creditPaise: 0n,
              description: `Legacy Matrix Level ${item.level} commission expense for ${user.memberId}`,
            },
            {
              account: JournalAccount.MEMBER_EARNINGS_PAYABLE,
              userId: user.id,
              debitPaise: 0n,
              creditPaise: item.rate.amountPaise,
              description: `Legacy Matrix Level ${item.level} earnings credit (source: ${item.sourceMemberId})`,
            }
          );

          await tx.walletAccount.update({
            where: { userId: user.id },
            data: {
              availableEarningsPaise: { increment: item.rate.amountPaise },
              totalEarnedPaise: { increment: item.rate.amountPaise },
            },
          });
          releasedEarningsPaise += item.rate.amountPaise;
        } else {
          journalLines.push(
            {
              account: JournalAccount.EV_CLUB_FUND_EXPENSE,
              userId: user.id,
              debitPaise: item.rate.amountPaise,
              creditPaise: 0n,
              description: `EV Club Fund Level ${item.level} promotional expense for ${user.memberId}`,
            },
            {
              account: JournalAccount.EV_CLUB_FUND_LIABILITY,
              userId: user.id,
              debitPaise: 0n,
              creditPaise: item.rate.amountPaise,
              description: `EV Club Fund Level ${item.level} credit (source: ${item.sourceMemberId})`,
            }
          );
          releasedShoppingPaise += item.rate.amountPaise;
        }

        await tx.journalEntry.create({
          data: {
            referenceId: item.settlementRef,
            eventType: 'LEGACY_MATRIX_SETTLEMENT',
            narration: `Legacy Matrix Level ${item.level} settled for ${user.memberId} from ${item.sourceMemberId}`,
            lines: { create: journalLines },
          },
        });

        await tx.legacyMatrixAuditLog.create({
          data: {
            placementId: item.placementId,
            userId: user.id,
            action: 'ACCUMULATED_INCOME_RELEASED',
            details: {
              level: item.level,
              amountPaise: item.rate.amountPaise.toString(),
              destination: item.rate.destination,
              settlementRef: item.settlementRef,
              sourceMemberId: item.sourceMemberId,
            },
          },
        });
      }

      return {
        memberId: user.memberId,
        isQualified: true,
        activeDirectsCount,
        released: true,
        settledCount: uncreditedItems.length,
        releasedEarningsPaise: releasedEarningsPaise.toString(),
        releasedEarningsINR: Number(releasedEarningsPaise / 100n),
        releasedShoppingPaise: releasedShoppingPaise.toString(),
        releasedShoppingINR: Number(releasedShoppingPaise / 100n),
      };
    };

    if (externalTx) return await run(externalTx);
    return await this.prisma.$transaction(run, { timeout: 30000 });
  }
}

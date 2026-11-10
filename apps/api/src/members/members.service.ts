import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MembershipPackage, paiseToRupees, FINANCIAL_RULES } from '@askrev/shared';
import { BinaryLeg, Prisma } from '@prisma/client';
import {
  PlaceBinaryNodeDto,
  QueryBinaryHistoryDto,
  RunBinaryMatchDto,
} from './dto/binary-placement.dto';

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get direct referrals of a member with detailed qualification metrics
   */
  async getDirectReferrals(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, memberId: true, fullName: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const directs = await this.prisma.user.findMany({
      where: { sponsorId: userId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        memberId: true,
        fullName: true,
        email: true,
        phone: true,
        currentPackage: true,
        isFullQualified: true,
        qualificationMethod: true,
        qualificationDate: true,
        createdAt: true,
      },
    });

    const totalActivatedDirects = directs.filter(
      (d) => d.currentPackage === MembershipPackage.BASIC || d.currentPackage === MembershipPackage.FULL
    ).length;

    const totalFullQualifiedDirects = directs.filter((d) => d.isFullQualified).length;

    return {
      sponsor: user,
      metrics: {
        totalDirects: directs.length,
        totalActivatedDirects,
        totalFullQualifiedDirects,
      },
      directs,
    };
  }

  // =========================================================================
  // PHASE 3C: BINARY PLACEMENT & VOLUME ENGINE
  // =========================================================================

  /**
   * Place a member into the binary tree under a parent and leg (LEFT or RIGHT).
   * Validates:
   * - No duplicate placements
   * - No self-placement
   * - No cyclic tree loops
   * - Parent leg vacancy
   * - Propagates counts and qualified volumes up the ancestor tree
   */
  async placeBinaryNode(actorId: string, dto: PlaceBinaryNodeDto) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Self-placement check
      if (dto.userId === dto.parentId) {
        throw new BadRequestException('Self-placement is strictly prohibited.');
      }

      // 2. Validate member existence
      const targetUser = await tx.user.findUnique({
        where: { id: dto.userId },
        include: { binaryPlacement: true },
      });
      if (!targetUser) {
        throw new NotFoundException('Member to place was not found.');
      }

      // Check if member is already placed under a parent
      if (targetUser.binaryPlacement && targetUser.binaryPlacement.parentId) {
        throw new BadRequestException(
          `Member ${targetUser.memberId} is already placed in the binary tree under parent ${targetUser.binaryPlacement.parentId}. Duplicate placement is not permitted.`
        );
      }

      // 3. Validate parent existence
      const parentUser = await tx.user.findUnique({
        where: { id: dto.parentId },
        include: { binaryPlacement: true },
      });
      if (!parentUser) {
        throw new NotFoundException('Specified parent node was not found.');
      }

      // 4. Verify parent leg vacancy
      const existingChildOnLeg = await tx.binaryPlacement.findFirst({
        where: {
          parentId: dto.parentId,
          leg: dto.leg,
        },
        include: { user: { select: { memberId: true, fullName: true } } },
      });

      if (existingChildOnLeg) {
        throw new BadRequestException(
          `Parent node ${parentUser.memberId} already has a child on the ${dto.leg} leg (${existingChildOnLeg.user.memberId}).`
        );
      }

      // 5. Cycle Detection: Traverse ancestors from parent upwards
      let currentAncestorId: string | null = dto.parentId;
      const visited = new Set<string>();

      while (currentAncestorId) {
        if (currentAncestorId === dto.userId) {
          throw new BadRequestException(
            'Cyclic tree relationship detected: A member cannot be placed under their own binary descendant.'
          );
        }
        if (visited.has(currentAncestorId)) {
          throw new BadRequestException('Pre-existing cyclic loop detected in ancestor tree.');
        }
        visited.add(currentAncestorId);

        const ancestorPlacement: { parentId: string | null } | null = await tx.binaryPlacement.findUnique({
          where: { userId: currentAncestorId },
          select: { parentId: true },
        });

        currentAncestorId = ancestorPlacement?.parentId || null;
      }

      // 6. Upsert Target Member's BinaryPlacement
      const placement = await tx.binaryPlacement.upsert({
        where: { userId: dto.userId },
        create: {
          userId: dto.userId,
          parentId: dto.parentId,
          leg: dto.leg,
        },
        update: {
          parentId: dto.parentId,
          leg: dto.leg,
        },
      });

      // 7. Propagate Counts & Qualified Volume up the Ancestor Tree
      let currParentId: string | null = dto.parentId;
      let currLeg: BinaryLeg | null = dto.leg;
      const isQualified = targetUser.isFullQualified;

      while (currParentId && currLeg) {
        const updateData: any = {};
        if (currLeg === BinaryLeg.LEFT) {
          updateData.leftCount = { increment: 1 };
          if (isQualified) {
            updateData.leftVolumePaise = { increment: 1n };
            updateData.carryLeftPaise = { increment: 1n };
          }
        } else {
          updateData.rightCount = { increment: 1 };
          if (isQualified) {
            updateData.rightVolumePaise = { increment: 1n };
            updateData.carryRightPaise = { increment: 1n };
          }
        }

        await tx.binaryPlacement.update({
          where: { userId: currParentId },
          data: updateData,
        });

        const parentNode: { parentId: string | null; leg: BinaryLeg | null } | null = await tx.binaryPlacement.findUnique({
          where: { userId: currParentId },
          select: { parentId: true, leg: true },
        });

        if (!parentNode || !parentNode.parentId || !parentNode.leg) break;
        currLeg = parentNode.leg;
        currParentId = parentNode.parentId;
      }

      // 8. Record Administrative Audit Log
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'BINARY_NODE_PLACED',
          entityType: 'BINARY_PLACEMENT',
          entityId: placement.id,
          metadata: {
            placedMemberId: targetUser.memberId,
            parentMemberId: parentUser.memberId,
            leg: dto.leg,
            isFullQualified: isQualified,
          },
        },
      });

      return {
        message: `Member ${targetUser.memberId} successfully placed on ${dto.leg} leg of parent ${parentUser.memberId}`,
        placement,
      };
    });
  }

  // =========================================================================
  // PHASE 3C: BINARY MATCHING ENGINE SETTLEMENT
  // =========================================================================

  /**
   * Settle Binary Matching for a beneficiary member.
   * Enforces:
   * - Full Qualification mandatory
   * - 1:2 or 2:1 ratio greedy matching
   * - ₹3,000 per match (300,000 paise)
   * - Daily cap: 15 matches (max ₹45,000 daily)
   * - Volume preservation (carry-forward not flushed when daily cap is hit)
   * - Balanced double-entry journal (5200_BINARY_MATCHING_EXPENSE <-> 2000_MEMBER_EARNINGS_PAYABLE)
   * - Idempotency & row-level locking concurrency protection
   */
  async settleBinaryMatching(beneficiaryUserId: string, idempotencyKey?: string) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Idempotency Check
      if (idempotencyKey) {
        const existingEvent = await tx.binaryMatchEvent.findUnique({
          where: { idempotencyKey },
        });
        if (existingEvent) {
          return {
            message: 'Idempotent replay: Binary matching already settled.',
            event: existingEvent,
            matchesSettled: existingEvent.matchesSettled,
            rewardINR: paiseToRupees(existingEvent.rewardPaise),
            isQualified: true,
          };
        }
      }

      // 2. Fetch Beneficiary User & Verify Existence
      const user = await tx.user.findUnique({
        where: { id: beneficiaryUserId },
        include: { binaryPlacement: true, wallet: true },
      });

      if (!user) {
        throw new NotFoundException('Member not found.');
      }

      // Row-level lock to prevent concurrent matching race conditions
      await tx.$queryRaw`
        SELECT id FROM "BinaryPlacement" WHERE "userId" = ${beneficiaryUserId} FOR UPDATE
      `;
      await tx.$queryRaw`
        SELECT id FROM "WalletAccount" WHERE "userId" = ${beneficiaryUserId} FOR UPDATE
      `;

      const placement = await tx.binaryPlacement.findUnique({
        where: { userId: beneficiaryUserId },
      });

      if (!placement) {
        throw new BadRequestException('Binary placement node not found for member.');
      }

      // Rule: Matching reward recipient must be Full Qualified!
      if (!user.isFullQualified) {
        return {
          success: false,
          isQualified: false,
          matchesSettled: 0,
          rewardINR: 0,
          reason: 'Beneficiary member is not Full Qualified. Full Qualification is mandatory for binary matching rewards.',
          carryLeft: Number(placement.carryLeftPaise),
          carryRight: Number(placement.carryRightPaise),
        };
      }

      // 3. Compute Date in Asia/Kolkata Timezone for Daily Capping
      const now = new Date();
      const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now); // 'YYYY-MM-DD'

      const isSameDay = placement.lastMatchDate === todayStr;
      const todaySettledMatches = isSameDay ? placement.dailyMatchesCount : 0;

      // 4. Evaluate Matching with 1:2 or 2:1 Ratio Greedy Loop
      const totalLeft = Number(placement.carryLeftPaise);
      const totalRight = Number(placement.carryRightPaise);

      let matchesFound = 0;
      let leftUsed = 0;
      let rightUsed = 0;

      while (true) {
        const remLeft = totalLeft - leftUsed;
        const remRight = totalRight - rightUsed;

        // Try 2 Left : 1 Right (if left has more or equal)
        if (remLeft >= 2 && remRight >= 1 && remLeft >= remRight) {
          matchesFound++;
          leftUsed += 2;
          rightUsed += 1;
          continue;
        }

        // Try 1 Left : 2 Right
        if (remLeft >= 1 && remRight >= 2) {
          matchesFound++;
          leftUsed += 1;
          rightUsed += 2;
          continue;
        }

        break;
      }

      // 5. Apply Daily Cap: Max 15 matches (₹45,000) per calendar day
      const remainingCapSlots = Math.max(0, FINANCIAL_RULES.BINARY_DAILY_MAX_MATCHES - todaySettledMatches);
      const payableMatches = Math.min(matchesFound, remainingCapSlots);
      const cappedOutMatches = matchesFound - payableMatches;

      // Calculate volume consumed strictly for payable matches
      let payableLeftUsed = 0;
      let payableRightUsed = 0;

      if (payableMatches === matchesFound) {
        payableLeftUsed = leftUsed;
        payableRightUsed = rightUsed;
      } else {
        // Greedily simulate payable matches only
        let pLeft = 0;
        let pRight = 0;
        for (let m = 0; m < payableMatches; m++) {
          const rL = totalLeft - pLeft;
          const rR = totalRight - pRight;
          if (rL >= 2 && rR >= 1 && rL >= rR) {
            pLeft += 2;
            pRight += 1;
          } else if (rL >= 1 && rR >= 2) {
            pLeft += 1;
            pRight += 2;
          }
        }
        payableLeftUsed = pLeft;
        payableRightUsed = pRight;
      }

      // Unmatched volume is preserved in carry-forward! (Zero silent volume loss)
      const newCarryLeft = totalLeft - payableLeftUsed;
      const newCarryRight = totalRight - payableRightUsed;
      const rewardPaise = BigInt(payableMatches) * FINANCIAL_RULES.BINARY_MATCH_REWARD_PAISE;

      let journalEntryId: string | null = null;

      // 6. Record Double-Entry Journal & Credit Wallet if payable matches > 0
      if (payableMatches > 0) {
        // Ensure wallet exists
        if (!user.wallet) {
          await tx.walletAccount.create({ data: { userId: beneficiaryUserId } });
        }

        await tx.walletAccount.update({
          where: { userId: beneficiaryUserId },
          data: {
            availableEarningsPaise: { increment: rewardPaise },
            totalEarnedPaise: { increment: rewardPaise },
          },
        });

        // Double-entry Journal: Binary Matching Reward
        const jnlRef = `JNL-BIN-MATCH-${beneficiaryUserId}-${Date.now().toString().slice(-8)}`;
        const journal = await tx.journalEntry.create({
          data: {
            referenceId: jnlRef,
            eventType: 'BINARY_MATCHING_REWARD',
            narration: `Simulated binary matching reward for ${user.fullName} (${user.memberId}): ${payableMatches} matches @ ₹3,000`,
            lines: {
              create: [
                {
                  account: '5200_BINARY_MATCHING_EXPENSE',
                  userId: null,
                  debitPaise: rewardPaise,
                  creditPaise: 0n,
                  description: `Binary matching expense for ${payableMatches} matches`,
                },
                {
                  account: '2000_MEMBER_EARNINGS_PAYABLE',
                  userId: beneficiaryUserId,
                  debitPaise: 0n,
                  creditPaise: rewardPaise,
                  description: `Earnings payable credited to ${user.fullName} for binary matching`,
                },
              ],
            },
          },
        });
        journalEntryId = journal.id;
      }

      // 7. Update BinaryPlacement State
      const updatedPlacement = await tx.binaryPlacement.update({
        where: { userId: beneficiaryUserId },
        data: {
          carryLeftPaise: BigInt(newCarryLeft),
          carryRightPaise: BigInt(newCarryRight),
          matchedVolumeLeftPaise: { increment: BigInt(payableLeftUsed) },
          matchedVolumeRightPaise: { increment: BigInt(payableRightUsed) },
          totalMatchesConsumed: { increment: payableMatches },
          totalRewardEarnedPaise: { increment: rewardPaise },
          lastMatchDate: todayStr,
          dailyMatchesCount: isSameDay ? { increment: payableMatches } : payableMatches,
        },
      });

      // 8. Record Immutable BinaryMatchEvent History
      const matchEvent = await tx.binaryMatchEvent.create({
        data: {
          userId: beneficiaryUserId,
          matchDate: todayStr,
          matchesEvaluated: matchesFound,
          matchesSettled: payableMatches,
          cappedOutMatches,
          leftUnitsUsed: payableLeftUsed,
          rightUnitsUsed: payableRightUsed,
          previousCarryLeft: totalLeft,
          previousCarryRight: totalRight,
          newCarryLeft,
          newCarryRight,
          rewardPaise,
          journalEntryId,
          idempotencyKey: idempotencyKey || null,
          isSimulated: true,
        },
      });

      // 9. Record Audit Log
      await tx.auditLog.create({
        data: {
          actorId: beneficiaryUserId,
          action: 'BINARY_MATCH_SETTLED',
          entityType: 'BINARY_PLACEMENT',
          entityId: updatedPlacement.id,
          metadata: {
            memberId: user.memberId,
            matchDate: todayStr,
            matchesFound,
            payableMatches,
            cappedOutMatches,
            rewardINR: paiseToRupees(rewardPaise),
            carryLeft: newCarryLeft,
            carryRight: newCarryRight,
            complianceMode: 'SIMULATION_ONLY',
          },
        },
      });

      return {
        success: true,
        isQualified: true,
        memberId: user.memberId,
        matchDate: todayStr,
        matchesEvaluated: matchesFound,
        matchesSettled: payableMatches,
        cappedOutMatches,
        rewardPaise: rewardPaise.toString(),
        rewardINR: paiseToRupees(rewardPaise),
        carryLeft: newCarryLeft,
        carryRight: newCarryRight,
        todayMatchesAlreadySettled: isSameDay ? todaySettledMatches + payableMatches : payableMatches,
        dailyCapRemaining: Math.max(0, FINANCIAL_RULES.BINARY_DAILY_MAX_MATCHES - (isSameDay ? todaySettledMatches + payableMatches : payableMatches)),
        event: matchEvent,
      };
    });
  }

  /**
   * Get Binary Matching settlement history for a member
   */
  async getBinaryMatchHistory(userId: string) {
    const events = await this.prisma.binaryMatchEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return events.map((e) => ({
      ...e,
      rewardINR: paiseToRupees(e.rewardPaise),
    }));
  }

  /**
   * Get Admin Binary Matching System Report
   */
  async getAdminBinaryReport() {
    const totalEvents = await this.prisma.binaryMatchEvent.count();
    const allEvents = await this.prisma.binaryMatchEvent.findMany();

    let totalRewardPaise = 0n;
    let totalSettledMatches = 0;
    let totalCappedMatches = 0;

    for (const ev of allEvents) {
      totalRewardPaise += ev.rewardPaise;
      totalSettledMatches += ev.matchesSettled;
      totalCappedMatches += ev.cappedOutMatches;
    }

    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    const todayEvents = allEvents.filter((e) => e.matchDate === todayStr);

    let todayRewardPaise = 0n;
    let todaySettledMatches = 0;
    for (const ev of todayEvents) {
      todayRewardPaise += ev.rewardPaise;
      todaySettledMatches += ev.matchesSettled;
    }

    return {
      matchingRules: {
        ratio: '1:2 or 2:1',
        rewardPerMatchINR: 3000,
        dailyMaxMatches: 15,
        dailyCapRewardINR: 45000,
        qualificationRequired: 'FULL_QUALIFIED',
      },
      systemTotals: {
        totalSettlements: totalEvents,
        totalSettledMatches,
        totalCappedMatches,
        totalRewardDisbursedINR: paiseToRupees(totalRewardPaise),
      },
      todayActivity: {
        matchDate: todayStr,
        settlementsToday: todayEvents.length,
        matchesSettledToday: todaySettledMatches,
        rewardTodayINR: paiseToRupees(todayRewardPaise),
      },
      complianceStatus: {
        complianceMode: process.env.COMPLIANCE_MODE || 'SIMULATION_ONLY',
        matchingLiabilitySeparated: true,
        unmatchedVolumePolicy: 'CARRY_FORWARD_PRESERVED_PENDING_APPROVAL',
      },
    };
  }

  /**
   * Get Binary Tree Placement info for a user
   */
  async getBinaryTree(userId: string) {
    const placement = await this.prisma.binaryPlacement.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            memberId: true,
            fullName: true,
            currentPackage: true,
            isFullQualified: true,
          },
        },
      },
    });

    if (!placement) {
      throw new NotFoundException('Binary placement node not found');
    }

    // Fetch left and right direct children in binary tree
    const children = await this.prisma.binaryPlacement.findMany({
      where: { parentId: userId },
      include: {
        user: {
          select: {
            id: true,
            memberId: true,
            fullName: true,
            currentPackage: true,
            isFullQualified: true,
          },
        },
      },
    });

    const leftChild = children.find((c) => c.leg === 'LEFT') || null;
    const rightChild = children.find((c) => c.leg === 'RIGHT') || null;

    return {
      node: {
        ...placement,
        leftVolumeINR: paiseToRupees(placement.leftVolumePaise),
        rightVolumeINR: paiseToRupees(placement.rightVolumePaise),
        carryLeftINR: paiseToRupees(placement.carryLeftPaise),
        carryRightINR: paiseToRupees(placement.carryRightPaise),
        totalRewardEarnedINR: paiseToRupees(placement.totalRewardEarnedPaise),
      },
      leftChild,
      rightChild,
      matchingStatus: {
        ratio: '1:2 or 2:1',
        proposedRewardINR: 3000,
        dailyCapINR: 45000,
        maxDailyMatches: 15,
        status: 'SIMULATION_ONLY',
        carryForwardRule: 'UNMATCHED_VOLUME_CARRIED_FORWARD',
      },
    };
  }

  /**
   * Admin listing of all members
   */
  async getAllMembers(query?: { search?: string; role?: string; package?: string }) {
    const where: any = {};

    if (query?.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { memberId: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query?.role) {
      where.role = query.role;
    }

    if (query?.package) {
      where.currentPackage = query.package;
    }

    const members = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        wallet: true,
        sponsor: {
          select: { memberId: true, fullName: true },
        },
        _count: {
          select: { directReferrals: true },
        },
      },
    });

    return members.map((m) => ({
      id: m.id,
      memberId: m.memberId,
      fullName: m.fullName,
      email: m.email,
      phone: m.phone,
      role: m.role,
      currentPackage: m.currentPackage,
      isFullQualified: m.isFullQualified,
      sponsorMemberId: m.sponsor?.memberId,
      sponsorName: m.sponsor?.fullName,
      directReferralCount: m._count.directReferrals,
      wallet: m.wallet
        ? {
            availableEarningsINR: paiseToRupees(m.wallet.availableEarningsPaise),
            heldCommissionsINR: paiseToRupees(m.wallet.heldCommissionsPaise),
            pendingRecoveryINR: paiseToRupees(m.wallet.pendingRecoveryPaise),
            shoppingVoucherINR: paiseToRupees(m.wallet.shoppingVoucherBalancePaise),
          }
        : null,
      createdAt: m.createdAt,
    }));
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MembershipPackage, paiseToRupees } from '@askrev/shared';

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
      },
      leftChild,
      rightChild,
      matchingStatus: {
        ratio: '1:2 or 2:1',
        proposedRewardINR: 3000,
        dailyCapINR: 45000,
        maxDailyMatches: 15,
        status: 'PENDING_APPROVAL_SIMULATION_ONLY',
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

import { Controller, Get, Post, Body, Query, Param, UseGuards, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { MembersService } from './members.service';
import { BinarySchedulerService } from './binary-scheduler.service';
import { InstantBinaryMatchingService } from './instant-binary-matching.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@askrev/shared';
import {
  PlaceBinaryNodeDto,
  QueryBinaryHistoryDto,
  RunBinaryMatchDto,
} from './dto/binary-placement.dto';

@Controller('members')
@UseGuards(JwtAuthGuard)
export class MembersController {
  constructor(
    private readonly membersService: MembersService,
    private readonly binaryScheduler: BinarySchedulerService,
    private readonly instantMatchingService: InstantBinaryMatchingService
  ) {}

  @Get('direct-team')
  async getDirectTeam(@CurrentUser() user: any) {
    return this.membersService.getDirectReferrals(user.id);
  }

  @Get('binary-tree')
  async getBinaryTree(
    @CurrentUser() user: any,
    @Query('userId') queryUserId?: string,
    @Query('memberId') queryMemberId?: string
  ) {
    const isAdmin =
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.ADMIN_OPERATIONS ||
      user.role === UserRole.FINANCE_MANAGER;

    let targetUserId = user.id;
    if (queryUserId) {
      const found = await this.membersService.findUserById(queryUserId);
      if (!found) {
        throw new NotFoundException('Requested member was not found.');
      }
      targetUserId = found.id;
    } else if (queryMemberId) {
      const found = await this.membersService.findUserByMemberId(queryMemberId);
      if (!found) {
        throw new NotFoundException(`Member ${queryMemberId} was not found.`);
      }
      targetUserId = found.id;
    }

    if (!isAdmin && targetUserId !== user.id) {
      const inSubtree = await this.membersService.isUserInBinarySubtree(user.id, targetUserId);
      if (!inSubtree) {
        throw new ForbiddenException(
          'Access denied: You may only view your own binary tree and downline subtree.'
        );
      }
    }

    return this.membersService.getBinaryTree(targetUserId);
  }

  // =========================================================================
  // PHASE 3C: BINARY PLACEMENT & MATCHING ENDPOINTS
  // =========================================================================

  @Post('binary/place')
  async placeBinaryNode(
    @CurrentUser() user: any,
    @Body() dto: PlaceBinaryNodeDto
  ) {
    return this.membersService.placeBinaryNode(user.id, dto);
  }

  @Post('binary/run-matching')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_OPERATIONS, UserRole.FINANCE_MANAGER)
  async runBinaryMatching(
    @CurrentUser() user: any,
    @Body() dto: RunBinaryMatchDto
  ) {
    const complianceMode = process.env.COMPLIANCE_MODE || 'SIMULATION_ONLY';
    const enableLivePayouts = process.env.ENABLE_LIVE_PAYOUTS === 'true';
    if (complianceMode !== 'SIMULATION_ONLY' || enableLivePayouts) {
      throw new ForbiddenException(
        'Live binary payouts are strictly disabled. Matching calculations are restricted to SIMULATION_ONLY mode.'
      );
    }

    // CORRECTIVE AUDIT (Requirement 6): Regular members cannot initiate binary matching settlements,
    // even for their own account. Settlement execution is strictly restricted to authorized administrators.
    if (!dto.userId) {
      throw new BadRequestException('Target member userId is required for administrative binary matching settlement.');
    }

    return this.membersService.settleBinaryMatching(dto.userId, dto.idempotencyKey);
  }

  @Get('binary/history')
  async getBinaryHistory(
    @CurrentUser() user: any,
    @Query() query: QueryBinaryHistoryDto
  ) {
    const isAdmin =
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.ADMIN_OPERATIONS ||
      user.role === UserRole.FINANCE_MANAGER;

    const targetUserId = isAdmin && query.userId ? query.userId : user.id;
    return this.membersService.getBinaryMatchHistory(targetUserId);
  }

  @Get('admin/binary-report')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_OPERATIONS, UserRole.FINANCE_MANAGER)
  async getAdminBinaryReport() {
    return this.membersService.getAdminBinaryReport();
  }

  @Get('admin/binary-placement-candidates')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_OPERATIONS, UserRole.FINANCE_MANAGER)
  async getBinaryPlacementCandidates() {
    return this.membersService.getBinaryPlacementCandidates();
  }

  // =========================================================================
  // ADMIN MEMBERS LIST
  // =========================================================================

  @Get('admin/list')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_OPERATIONS, UserRole.FINANCE_MANAGER)
  async getAdminMembersList(@Query() query: any) {
    return this.membersService.getAllMembers(query);
  }

  @Get('admin/details/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_OPERATIONS, UserRole.FINANCE_MANAGER)
  async getMemberDetails(@Param('id') id: string) {
    return this.membersService.getMemberDetails(id);
  }

  // =========================================================================
  // ADMIN AUTOMATED BINARY SIMULATION RUNS
  // =========================================================================

  @Get('admin/binary-simulation-runs')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_OPERATIONS, UserRole.FINANCE_MANAGER)
  async getBinarySimulationRuns(@Query('limit') limit?: number) {
    return this.binaryScheduler.getSimulationRuns(limit ? Number(limit) : 30);
  }

  @Post('admin/binary-simulation-run')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_OPERATIONS, UserRole.FINANCE_MANAGER)
  async triggerBinarySimulationRun(
    @Body() body: { isDryRun?: boolean; targetDate?: string }
  ) {
    return this.binaryScheduler.runDailyBinarySimulation({
      isDryRun: body?.isDryRun ?? false,
      targetDate: body?.targetDate,
      triggeredBy: 'ADMIN_MANUAL',
    });
  }

  // =========================================================================
  // ADMIN INSTANT BINARY MATCHING OUTBOX
  // =========================================================================

  @Get('admin/binary-outbox')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_OPERATIONS, UserRole.FINANCE_MANAGER)
  async getBinaryOutboxStats() {
    return this.instantMatchingService.getOutboxStats();
  }

  @Post('admin/binary-outbox/retry-failed')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_OPERATIONS, UserRole.FINANCE_MANAGER)
  async retryFailedOutboxTasks() {
    return this.instantMatchingService.retryFailedTasks();
  }

  @Post('admin/binary-outbox/requeue-dead-letter')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_OPERATIONS, UserRole.FINANCE_MANAGER)
  async requeueDeadLetterTasks(@Body() body?: { taskIds?: string[] }) {
    return this.instantMatchingService.requeueDeadLetterTasks(body?.taskIds);
  }
}


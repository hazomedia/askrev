import { Controller, Get, Post, Body, Query, Param, UseGuards, ForbiddenException, BadRequestException } from '@nestjs/common';
import { MembersService } from './members.service';
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
  constructor(private readonly membersService: MembersService) {}

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
    if (isAdmin) {
      if (queryUserId) {
        targetUserId = queryUserId;
      } else if (queryMemberId) {
        const found = await this.membersService.findUserByMemberId(queryMemberId);
        if (found) targetUserId = found.id;
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
}


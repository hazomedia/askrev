import { Controller, Get, Post, Body, Query, UseGuards, ForbiddenException } from '@nestjs/common';
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
  async getBinaryTree(@CurrentUser() user: any) {
    return this.membersService.getBinaryTree(user.id);
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
  async runBinaryMatching(
    @CurrentUser() user: any,
    @Body() dto: RunBinaryMatchDto
  ) {
    const isAdmin =
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.ADMIN_OPERATIONS ||
      user.role === UserRole.FINANCE_MANAGER;

    if (!isAdmin && dto.userId && dto.userId !== user.id) {
      throw new ForbiddenException(
        'Unprivileged members cannot trigger matching settlements for other members.'
      );
    }

    const targetUserId = isAdmin && dto.userId ? dto.userId : user.id;
    return this.membersService.settleBinaryMatching(targetUserId, dto.idempotencyKey);
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
}


import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { MembersService } from './members.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@askrev/shared';

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

  @Get('admin/list')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_OPERATIONS, UserRole.FINANCE_MANAGER)
  async getAdminMembersList(@Query() query: any) {
    return this.membersService.getAllMembers(query);
  }
}

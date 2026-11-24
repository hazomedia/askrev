import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LegacyMatrixService } from './legacy-matrix.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@askrev/shared';

@Controller('legacy-matrix')
export class LegacyMatrixController {
  constructor(private readonly legacyMatrixService: LegacyMatrixService) {}

  /**
   * Member Dashboard: Get authenticated member's 3x8 Matrix Overview and 8-level breakdown
   */
  @UseGuards(JwtAuthGuard)
  @Get('my-matrix')
  async getMyMatrix(@CurrentUser() user: any) {
    return await this.legacyMatrixService.getMyMatrixOverview(user.id);
  }

  /**
   * Member Dashboard: Get Active Direct Sponsor Qualification status (X / 3)
   */
  @UseGuards(JwtAuthGuard)
  @Get('qualification')
  async getQualification(@CurrentUser() user: any) {
    const overview = await this.legacyMatrixService.getMyMatrixOverview(user.id);
    return overview.qualification;
  }

  /**
   * Admin Portal: Global 3x8 Matrix Tree Visualization
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_OPERATIONS)
  @Get('admin/tree')
  async getAdminTree(
    @Query('rootSequence') rootSeq?: string,
    @Query('maxDepth') maxDepth?: string
  ) {
    const rootSequence = rootSeq ? parseInt(rootSeq, 10) : 1;
    const depth = maxDepth ? parseInt(maxDepth, 10) : 4;
    return await this.legacyMatrixService.getAdminMatrixTree(rootSequence, depth);
  }

  /**
   * Admin Portal: Three-Active-Direct Qualification and Sequence Audit Report
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_OPERATIONS)
  @Get('admin/report')
  async getAdminReport() {
    return await this.legacyMatrixService.getQualificationReport();
  }

  /**
   * Admin Portal: Trigger deterministic matrix backfill for baseline members
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Post('admin/backfill')
  async triggerBackfill() {
    return await this.legacyMatrixService.backfillExistingMembersMatrix();
  }
}

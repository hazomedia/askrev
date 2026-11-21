import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { TaxSimulationService, CreateTaxRuleDto } from './tax.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@askrev/shared';

@Controller('tax')
@UseGuards(JwtAuthGuard)
export class TaxController {
  constructor(private readonly taxService: TaxSimulationService) {}

  @Get('my-records')
  async getMyRecords(@CurrentUser() user: any) {
    return this.taxService.getUserTaxRecords(user.id);
  }

  @Get('admin/rules')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_OPERATIONS, UserRole.FINANCE_MANAGER)
  async getRules() {
    return this.taxService.getRules();
  }

  @Post('admin/rules')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_OPERATIONS, UserRole.FINANCE_MANAGER)
  async createRule(@Body() dto: CreateTaxRuleDto) {
    return this.taxService.createRule(dto);
  }

  @Get('admin/report')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_OPERATIONS, UserRole.FINANCE_MANAGER)
  async getAdminReport() {
    return this.taxService.getAdminTaxReport();
  }
}

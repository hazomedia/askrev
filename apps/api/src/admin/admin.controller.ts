import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@askrev/shared';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_OPERATIONS, UserRole.FINANCE_MANAGER)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  async getOverview() {
    return this.adminService.getOverviewStats();
  }

  @Get('audit-logs')
  async getAuditLogs() {
    return this.adminService.getAuditLogs();
  }

  @Get('financial-reconciliation')
  async getFinancialReconciliation() {
    return this.adminService.getFinancialReconciliation();
  }

  @Get('voucher-transactions')
  async getVoucherTransactions() {
    return this.adminService.getVoucherTransactionsAdmin();
  }

  @Get('suspicious-activity')
  async getSuspiciousActivity() {
    return this.adminService.detectSuspiciousActivity();
  }
}

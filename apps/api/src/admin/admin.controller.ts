import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@askrev/shared';
import { InitiateSupportSessionDto, ExitSupportSessionDto } from './dto/support.dto';

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
  async getAuditLogs(@Query() query: any) {
    return this.adminService.getAuditLogs(query);
  }

  @Get('financial-reconciliation')
  async getFinancialReconciliation() {
    return this.adminService.getFinancialReconciliation();
  }

  @Get('wallets')
  async getWalletsAdmin(@Query() query: any) {
    return this.adminService.getWalletsAdmin(query);
  }

  @Get('ledger')
  async getLedgerAdmin(@Query() query: any) {
    return this.adminService.getLedgerAdmin(query);
  }

  @Get('voucher-transactions')
  async getVoucherTransactions() {
    return this.adminService.getVoucherTransactionsAdmin();
  }

  @Get('suspicious-activity')
  async getSuspiciousActivity() {
    return this.adminService.detectSuspiciousActivity();
  }

  /**
   * TASK 3: Admin "View as Member" Support Session Initiation
   */
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_OPERATIONS)
  @Post('support/initiate-session')
  @HttpCode(HttpStatus.OK)
  async initiateSupportSession(
    @CurrentUser() adminUser: any,
    @Body() dto: InitiateSupportSessionDto
  ) {
    return this.adminService.initiateSupportSession(adminUser, dto);
  }

  /**
   * TASK 3: Terminate Admin Support Session
   */
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN_OPERATIONS,
    UserRole.FINANCE_MANAGER,
    UserRole.MEMBER,
    UserRole.FREE_USER
  )
  @Post('support/exit-session')
  @HttpCode(HttpStatus.OK)
  async exitSupportSession(
    @CurrentUser() user: any,
    @Body() dto: ExitSupportSessionDto
  ) {
    return this.adminService.exitSupportSession(user, dto);
  }

  /**
   * TASK 3: Support Access History Report
   */
  @Get('support/audit-logs')
  async getSupportAuditLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.adminService.getSupportAuditLogs(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50
    );
  }
}

import { Controller, Get, Post, Body, Param, Query, Res, UseGuards, ForbiddenException } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@askrev/shared';
import {
  RequestWithdrawalDto,
  AdminApproveWithdrawalDto,
  AdminRejectWithdrawalDto,
  AdminSettleWithdrawalDto,
  WithdrawalQueryDto,
} from './dto/withdrawal.dto';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('my-wallet')
  async getMyWallet(@CurrentUser() user: any) {
    return this.walletService.getWalletOverview(user.id);
  }

  @Get('transactions')
  async getMyTransactions(@CurrentUser() user: any) {
    return this.walletService.getWalletTransactions(user.id);
  }

  @Get('sponsor-commissions')
  async getMySponsorCommissions(@CurrentUser() user: any) {
    return this.walletService.getSponsorCommissionHistory(user.id);
  }

  @Get('eligibility')
  async getWithdrawalEligibility(@CurrentUser() user: any) {
    return this.walletService.getWithdrawalEligibility(user.id);
  }

  @Get('my-withdrawals')
  async getMyWithdrawals(@CurrentUser() user: any) {
    return this.walletService.getMyWithdrawals(user.id);
  }

  @Post('request-withdrawal')
  async requestWithdrawal(@CurrentUser() user: any, @Body() dto?: RequestWithdrawalDto) {
    if (user.isSupportMode || user.supportSessionId || user.role === 'SUPPORT_READ_ONLY') {
      throw new ForbiddenException('Withdrawal requests are strictly prohibited during Admin View Mode.');
    }
    return this.walletService.requestWithdrawal(user.id, dto);
  }

  @Get('club-fund')
  async getEvClubFund(@CurrentUser() user: any) {
    return this.walletService.getEvClubFundOverview(user.id);
  }

  @Post('club-fund/utilize')
  async requestClubFundUtilization(
    @CurrentUser() user: any,
    @Body() body: { programId: string; amountINR: number }
  ) {
    return this.walletService.requestClubFundUtilization(user.id, body.programId, body.amountINR);
  }

  @Get('admin/reconciliation')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_OPERATIONS, UserRole.FINANCE_MANAGER)
  async getAdminReconciliation() {
    return this.walletService.getAdminWalletReconciliation();
  }

  @Get('admin/withdrawals')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_OPERATIONS, UserRole.FINANCE_MANAGER)
  async getAdminWithdrawals(@Query() query: WithdrawalQueryDto) {
    return this.walletService.getAdminWithdrawals(query);
  }

  @Post('admin/withdrawals/:id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_MANAGER)
  async adminApproveWithdrawal(
    @CurrentUser() admin: any,
    @Param('id') id: string,
    @Body() dto?: AdminApproveWithdrawalDto
  ) {
    return this.walletService.adminApproveWithdrawal(admin.id, id, dto);
  }

  @Post('admin/withdrawals/:id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_MANAGER)
  async adminRejectWithdrawal(
    @CurrentUser() admin: any,
    @Param('id') id: string,
    @Body() dto: AdminRejectWithdrawalDto
  ) {
    return this.walletService.adminRejectWithdrawal(admin.id, id, dto);
  }

  @Post('admin/withdrawals/:id/settle')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_MANAGER)
  async adminSettleWithdrawal(
    @CurrentUser() admin: any,
    @Param('id') id: string,
    @Body() dto: AdminSettleWithdrawalDto
  ) {
    return this.walletService.adminSettleWithdrawal(admin.id, id, dto);
  }

  @Get('admin/withdrawals/export')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_MANAGER)
  async exportWithdrawalReport(@Query() query: WithdrawalQueryDto) {
    const csv = await this.walletService.exportWithdrawalReport(query);
    return {
      csv,
      filename: `askr_ev_withdrawals_${new Date().toISOString().slice(0, 10)}.csv`,
    };
  }
}


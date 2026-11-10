import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@askrev/shared';

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

  @Post('request-withdrawal')
  async requestWithdrawal() {
    return this.walletService.requestWithdrawal();
  }

  @Get('admin/reconciliation')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_OPERATIONS, UserRole.FINANCE_MANAGER)
  async getAdminReconciliation() {
    return this.walletService.getAdminWalletReconciliation();
  }
}


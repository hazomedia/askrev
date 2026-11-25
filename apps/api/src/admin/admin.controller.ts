import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@askrev/shared';
import {
  InitiateSupportSessionDto,
  ExchangeSupportSessionDto,
  ExitSupportSessionDto,
} from './dto/support.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_OPERATIONS, UserRole.FINANCE_MANAGER)
  @Get('overview')
  async getOverview() {
    return this.adminService.getOverviewStats();
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_OPERATIONS, UserRole.FINANCE_MANAGER)
  @Get('audit-logs')
  async getAuditLogs(@Query() query: any) {
    return this.adminService.getAuditLogs(query);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_OPERATIONS, UserRole.FINANCE_MANAGER)
  @Get('financial-reconciliation')
  async getFinancialReconciliation() {
    return this.adminService.getFinancialReconciliation();
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_OPERATIONS, UserRole.FINANCE_MANAGER)
  @Get('wallets')
  async getWalletsAdmin(@Query() query: any) {
    return this.adminService.getWalletsAdmin(query);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_OPERATIONS, UserRole.FINANCE_MANAGER)
  @Get('ledger')
  async getLedgerAdmin(@Query() query: any) {
    return this.adminService.getLedgerAdmin(query);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_OPERATIONS, UserRole.FINANCE_MANAGER)
  @Get('voucher-transactions')
  async getVoucherTransactions() {
    return this.adminService.getVoucherTransactionsAdmin();
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_OPERATIONS, UserRole.FINANCE_MANAGER)
  @Get('suspicious-activity')
  async getSuspiciousActivity() {
    return this.adminService.detectSuspiciousActivity();
  }

  /**
   * SECURITY CORRECTIONS 1 & 2:
   * Restrict View as Member strictly to SUPER_ADMIN.
   * Requires verified member consent and recent administrator password reauthentication.
   */
  @Roles(UserRole.SUPER_ADMIN)
  @Post('support/initiate-session')
  @HttpCode(HttpStatus.OK)
  async initiateSupportSession(
    @CurrentUser() adminUser: any,
    @Body() dto: InitiateSupportSessionDto,
    @Req() req: Request
  ) {
    const ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';
    return this.adminService.initiateSupportSession(adminUser, dto, ip);
  }

  /**
   * SECURITY CORRECTION 9:
   * Single-use secure authorization exchange for ephemeral support session.
   * Sets isolated HttpOnly cookie askrev_support_token.
   */
  @Post('support/exchange')
  @HttpCode(HttpStatus.OK)
  async exchangeSupportSession(
    @Body() dto: ExchangeSupportSessionDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.adminService.exchangeSupportSession(dto);

    // Set dedicated isolated HttpOnly support cookie
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('askrev_support_token', result.supportToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60 * 1000, // 15 minutes
      domain: isProd ? '.askrevdrive.com' : undefined,
    });

    return {
      success: true,
      isSupportMode: true,
      targetUser: result.targetUser,
      adminEmail: result.adminEmail,
      reason: result.reason,
      expiresAt: result.expiresAt,
    };
  }

  /**
   * SECURITY CORRECTIONS 5 & 6:
   * Terminate active support session immediately server-side and clear cookies.
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
    @Body() dto: ExitSupportSessionDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const tokenFromCookie = req.cookies?.['askrev_support_token'];
    const result = await this.adminService.exitSupportSession(user, dto, tokenFromCookie);

    // Clear support session cookie
    const isProd = process.env.NODE_ENV === 'production';
    res.clearCookie('askrev_support_token', {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      domain: isProd ? '.askrevdrive.com' : undefined,
    });

    return result;
  }

  /**
   * Support Access History Report
   */
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_OPERATIONS)
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

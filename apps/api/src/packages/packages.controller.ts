import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PackagesService } from './packages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@askrev/shared';
import {
  CreateMembershipRequestDto,
  QueryMembershipRequestsDto,
  ReviewMembershipRequestDto,
  UpdatePaymentConfigDto,
} from './dto/membership-request.dto';

@Controller('packages')
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Get()
  getAllPackages() {
    return this.packagesService.getAllPackages();
  }

  @Get('upgrade-options')
  getUpgradeOptions() {
    return this.packagesService.getUpgradeOptions();
  }

  // =========================================================================
  // MEMBER REQUEST ENDPOINTS
  // =========================================================================

  @UseGuards(JwtAuthGuard)
  @Post('request')
  async createMembershipRequest(
    @CurrentUser() user: any,
    @Body() dto: CreateMembershipRequestDto
  ) {
    return this.packagesService.createMembershipRequest(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-requests')
  async getMyRequests(@CurrentUser() user: any) {
    return this.packagesService.getMyMembershipRequests(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-holds')
  async getMyHolds(@CurrentUser() user: any) {
    return this.packagesService.getMyCommissionHolds(user.id);
  }

  // =========================================================================
  // ADMIN REVIEW ENDPOINTS
  // =========================================================================

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_OPERATIONS, UserRole.FINANCE_MANAGER)
  @Get('admin/requests')
  async getAdminRequests(@Query() query: QueryMembershipRequestsDto) {
    return this.packagesService.getAdminMembershipRequests(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_OPERATIONS, UserRole.FINANCE_MANAGER)
  @Post('admin/requests/:id/approve')
  async approveRequest(
    @CurrentUser() admin: any,
    @Param('id') id: string,
    @Body() dto: ReviewMembershipRequestDto
  ) {
    return this.packagesService.approveMembershipRequest(id, admin.id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_OPERATIONS, UserRole.FINANCE_MANAGER)
  @Post('admin/requests/:id/reject')
  async rejectRequest(
    @CurrentUser() admin: any,
    @Param('id') id: string,
    @Body() dto: ReviewMembershipRequestDto
  ) {
    return this.packagesService.rejectMembershipRequest(id, admin.id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_OPERATIONS, UserRole.FINANCE_MANAGER)
  @Get('admin/commission-holds')
  async getAdminCommissionHolds() {
    return this.packagesService.getAdminCommissionHolds();
  }

  // =========================================================================
  // MERCHANT PAYMENT CONFIGURATION ENDPOINTS
  // =========================================================================

  @UseGuards(JwtAuthGuard)
  @Get('payment-config')
  async getPaymentConfig() {
    return this.packagesService.getPaymentConfig();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_MANAGER)
  @Get('admin/payment-config')
  async getAdminPaymentConfig() {
    return this.packagesService.getAdminPaymentConfig();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.FINANCE_MANAGER)
  @Put('admin/payment-config')
  async updateAdminPaymentConfig(
    @CurrentUser() admin: any,
    @Body() dto: UpdatePaymentConfigDto
  ) {
    return this.packagesService.updateAdminPaymentConfig(admin.id, dto);
  }
}

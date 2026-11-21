import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import {
  RetailQualificationService,
  CreateRetailOrderDto,
  RefundRetailOrderDto,
  UpdateRetailConfigDto,
} from './retail-qualification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@askrev/shared';

@Controller('retail-qualification')
@UseGuards(JwtAuthGuard)
export class RetailQualificationController {
  constructor(private readonly retailService: RetailQualificationService) {}

  @Get('my-progress')
  async getMyProgress(@CurrentUser() user: any) {
    return this.retailService.evaluateMemberQualification(user.id);
  }

  @Get('my-orders')
  async getMyOrders(@CurrentUser() user: any) {
    return this.retailService.getMemberOrders(user.id);
  }

  @Get('config')
  async getConfig() {
    return this.retailService.getConfig();
  }

  @Post('admin/config')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_OPERATIONS, UserRole.FINANCE_MANAGER)
  async updateConfig(@Body() dto: UpdateRetailConfigDto) {
    return this.retailService.updateConfig(dto);
  }

  @Post('admin/orders')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_OPERATIONS, UserRole.FINANCE_MANAGER)
  async recordOrder(@Body() dto: CreateRetailOrderDto) {
    return this.retailService.recordRetailOrder(dto);
  }

  @Post('admin/refunds')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_OPERATIONS, UserRole.FINANCE_MANAGER)
  async recordRefund(@Body() dto: RefundRetailOrderDto) {
    return this.retailService.recordOrderRefund(dto);
  }
}

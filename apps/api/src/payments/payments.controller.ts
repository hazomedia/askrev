import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Headers,
  Req,
  Ip,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@askrev/shared';
import {
  UpdateUpiSettingsDto,
  UpdateGatewayConfigDto,
  TestGatewayConnectionDto,
  CreateGatewayOrderDto,
} from './dto/payment-settings.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // =========================================================================
  // MEMBER / CHECKOUT ENDPOINTS
  // =========================================================================

  @Get('methods')
  async getPaymentMethods() {
    return this.paymentsService.getPublicPaymentMethods();
  }

  @UseGuards(JwtAuthGuard)
  @Post('create-order')
  async createOnlineOrder(@CurrentUser() user: any, @Body() dto: CreateGatewayOrderDto) {
    return this.paymentsService.createOnlineBookingOrder(user.id, dto);
  }

  // =========================================================================
  // SUPER ADMIN PAYMENT SETTINGS
  // =========================================================================

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Get('admin/settings')
  async getAdminSettings() {
    return this.paymentsService.getAdminPaymentSettings();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Put('admin/upi')
  async updateUpiSettings(@CurrentUser() admin: any, @Body() dto: UpdateUpiSettingsDto) {
    return this.paymentsService.updateUpiSettings(admin.id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Put('admin/gateway')
  async updateGatewayConfig(@CurrentUser() admin: any, @Body() dto: UpdateGatewayConfigDto) {
    return this.paymentsService.updateGatewayConfig(admin.id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Post('admin/test-connection')
  async testGatewayConnection(@CurrentUser() admin: any, @Body() dto: TestGatewayConnectionDto) {
    return this.paymentsService.testGatewayConnection(admin.id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Get('admin/logs')
  async getGatewayLogs(@Query('limit') limit?: string, @Query('provider') provider?: string) {
    return this.paymentsService.getGatewayLogs(limit ? parseInt(limit, 10) : 50, provider);
  }

  // =========================================================================
  // GATEWAY WEBHOOK ENDPOINT
  // =========================================================================

  @Post('webhook/:provider')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('provider') provider: string,
    @Req() req: any,
    @Headers() headers: Record<string, string>,
    @Ip() ip: string
  ) {
    const signature =
      headers['x-razorpay-signature'] ||
      headers['x-webhook-signature'] ||
      headers['x-verify'] ||
      headers['signature'] ||
      '';

    const rawBody = req.rawBody || JSON.stringify(req.body);

    return this.paymentsService.handleGatewayWebhook(provider, rawBody, signature, headers, ip);
  }
}

import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async checkHealth() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({
        status: 'degraded',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      });
    }

    return {
      status: 'ok',
      service: 'askrev-api',
      database: 'connected',
      complianceMode: process.env.COMPLIANCE_MODE || 'SIMULATION_ONLY',
      livePayoutsEnabled: process.env.ENABLE_LIVE_PAYOUTS === 'true',
      liveMatchingEnabled: process.env.ENABLE_LIVE_MATCHING === 'true',
      voucherCashConversionEnabled: process.env.ENABLE_DIRECT_VOUCHER_CASH_CONVERSION === 'true',
      timestamp: new Date().toISOString(),
    };
  }
}


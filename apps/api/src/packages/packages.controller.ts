import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { PackagesService } from './packages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { QualificationMethod } from '@askrev/shared';

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

  @UseGuards(JwtAuthGuard)
  @Post('upgrade')
  async upgradePackage(
    @CurrentUser() user: any,
    @Body() body: { method: QualificationMethod; paymentReference?: string }
  ) {
    return this.packagesService.upgradeUserPackage(user.id, body.method, body.paymentReference);
  }
}

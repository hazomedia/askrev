import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminService } from './admin.service';
import { FinancialSettingsService } from './financial-settings.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AdminController],
  providers: [AdminService, FinancialSettingsService],
  exports: [AdminService, FinancialSettingsService],
})
export class AdminModule {}

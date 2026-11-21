import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MembersModule } from './members/members.module';
import { PackagesModule } from './packages/packages.module';
import { SimulationModule } from './simulation/simulation.module';
import { VouchersModule } from './vouchers/vouchers.module';
import { EvBikesModule } from './ev-bikes/ev-bikes.module';
import { AdminModule } from './admin/admin.module';
import { WalletModule } from './wallet/wallet.module';
import { ProductsModule } from './products/products.module';
import { HeroSliderModule } from './hero-slider/hero-slider.module';
import { MediaModule } from './media/media.module';
import { TaxModule } from './tax/tax.module';
import { RetailQualificationModule } from './retail-qualification/retail-qualification.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    MembersModule,
    PackagesModule,
    SimulationModule,
    VouchersModule,
    EvBikesModule,
    AdminModule,
    WalletModule,
    ProductsModule,
    HeroSliderModule,
    MediaModule,
    TaxModule,
    RetailQualificationModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

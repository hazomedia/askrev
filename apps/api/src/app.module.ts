import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MembersModule } from './members/members.module';
import { PackagesModule } from './packages/packages.module';
import { SimulationModule } from './simulation/simulation.module';
import { VouchersModule } from './vouchers/vouchers.module';
import { EvBikesModule } from './ev-bikes/ev-bikes.module';
import { AdminModule } from './admin/admin.module';
import { WalletModule } from './wallet/wallet.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    MembersModule,
    PackagesModule,
    SimulationModule,
    VouchersModule,
    EvBikesModule,
    AdminModule,
    WalletModule,
  ],
})
export class AppModule {}

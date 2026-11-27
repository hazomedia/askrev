import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { AuthModule } from '../auth/auth.module';
import { LegacyMatrixModule } from '../legacy-matrix/legacy-matrix.module';

@Module({
  imports: [PrismaModule, CommonModule, AuthModule, LegacyMatrixModule],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}

import { Module } from '@nestjs/common';
import { LegacyMatrixService } from './legacy-matrix.service';
import { LegacyMatrixController } from './legacy-matrix.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LegacyMatrixController],
  providers: [LegacyMatrixService],
  exports: [LegacyMatrixService],
})
export class LegacyMatrixModule {}

import { Module } from '@nestjs/common';
import { TaxSimulationService } from './tax.service';
import { TaxController } from './tax.controller';

@Module({
  controllers: [TaxController],
  providers: [TaxSimulationService],
  exports: [TaxSimulationService],
})
export class TaxModule {}

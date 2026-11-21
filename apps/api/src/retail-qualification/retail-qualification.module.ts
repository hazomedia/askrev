import { Module } from '@nestjs/common';
import { RetailQualificationService } from './retail-qualification.service';
import { RetailQualificationController } from './retail-qualification.controller';

@Module({
  controllers: [RetailQualificationController],
  providers: [RetailQualificationService],
  exports: [RetailQualificationService],
})
export class RetailQualificationModule {}

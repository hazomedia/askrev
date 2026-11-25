import { Module } from '@nestjs/common';
import { MembersService } from './members.service';
import { MembersController } from './members.controller';
import { BinarySchedulerService } from './binary-scheduler.service';
import { InstantBinaryMatchingService } from './instant-binary-matching.service';
import { BinaryPlacementService } from './binary-placement.service';

@Module({
  controllers: [MembersController],
  providers: [
    MembersService,
    BinarySchedulerService,
    InstantBinaryMatchingService,
    BinaryPlacementService,
  ],
  exports: [
    MembersService,
    BinarySchedulerService,
    InstantBinaryMatchingService,
    BinaryPlacementService,
  ],
})
export class MembersModule {}

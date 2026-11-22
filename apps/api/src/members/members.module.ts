import { Module } from '@nestjs/common';
import { MembersService } from './members.service';
import { MembersController } from './members.controller';
import { BinarySchedulerService } from './binary-scheduler.service';
import { InstantBinaryMatchingService } from './instant-binary-matching.service';

@Module({
  controllers: [MembersController],
  providers: [MembersService, BinarySchedulerService, InstantBinaryMatchingService],
  exports: [MembersService, BinarySchedulerService, InstantBinaryMatchingService],
})
export class MembersModule {}

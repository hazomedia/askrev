import { Module } from '@nestjs/common';
import { MembersService } from './members.service';
import { MembersController } from './members.controller';
import { BinarySchedulerService } from './binary-scheduler.service';

@Module({
  controllers: [MembersController],
  providers: [MembersService, BinarySchedulerService],
  exports: [MembersService, BinarySchedulerService],
})
export class MembersModule {}

import { Module, forwardRef } from '@nestjs/common';
import { PackagesService } from './packages.service';
import { PackagesController } from './packages.controller';
import { MembersModule } from '../members/members.module';

@Module({
  imports: [forwardRef(() => MembersModule)],
  controllers: [PackagesController],
  providers: [PackagesService],
  exports: [PackagesService],
})
export class PackagesModule {}

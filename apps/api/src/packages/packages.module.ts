import { Module, forwardRef } from '@nestjs/common';
import { PackagesService } from './packages.service';
import { PackagesController } from './packages.controller';
import { MembersModule } from '../members/members.module';
import { LegacyMatrixModule } from '../legacy-matrix/legacy-matrix.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    forwardRef(() => MembersModule),
    LegacyMatrixModule,
    AuthModule,
  ],
  controllers: [PackagesController],
  providers: [PackagesService],
  exports: [PackagesService],
})
export class PackagesModule {}

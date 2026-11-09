import { Module } from '@nestjs/common';
import { EvBikesService } from './ev-bikes.service';
import { EvBikesController } from './ev-bikes.controller';

@Module({
  controllers: [EvBikesController],
  providers: [EvBikesService],
  exports: [EvBikesService],
})
export class EvBikesModule {}

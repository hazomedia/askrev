import { Module } from '@nestjs/common';
import { CommissionSimulatorService } from './commission-simulator.service';
import { SimulationController } from './simulation.controller';

@Module({
  controllers: [SimulationController],
  providers: [CommissionSimulatorService],
  exports: [CommissionSimulatorService],
})
export class SimulationModule {}

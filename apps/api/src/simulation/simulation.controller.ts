import { Controller, Get, Post, Body } from '@nestjs/common';
import { CommissionSimulatorService, SimulationInput } from './commission-simulator.service';
import { BinaryMatchInput } from '@askrev/shared';

@Controller('simulation')
export class SimulationController {
  constructor(private readonly simulationService: CommissionSimulatorService) {}

  /**
   * Run the Master Prompt canonical scenario (A sponsors B, C, D, E then D upgrades first, E upgrades second)
   */
  @Get('canonical-scenario')
  runCanonicalScenario() {
    return this.simulationService.runPresetScenarioAtoE();
  }

  /**
   * Run custom commission simulation
   */
  @Post('run-directs')
  runCustomSimulation(@Body() input: SimulationInput) {
    return this.simulationService.simulateSponsorChain(input);
  }

  /**
   * Run Binary Matching simulation
   */
  @Post('binary-matching')
  runBinaryMatching(@Body() input: BinaryMatchInput) {
    return this.simulationService.simulateBinaryMatching(input);
  }
}

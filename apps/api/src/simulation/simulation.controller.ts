import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { CommissionSimulatorService } from './commission-simulator.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SimulationInputDto, BinaryMatchInputDto } from './dto/simulation.dto';

@Controller('simulation')
@UseGuards(JwtAuthGuard)
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
  runCustomSimulation(@Body() input: SimulationInputDto) {
    return this.simulationService.simulateSponsorChain(input as any);
  }

  /**
   * Run Binary Matching simulation
   */
  @Post('binary-matching')
  runBinaryMatching(@Body() input: BinaryMatchInputDto) {
    return this.simulationService.simulateBinaryMatching(input);
  }
}


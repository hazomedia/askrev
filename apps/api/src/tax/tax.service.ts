import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paiseToRupees, rupeesToPaise } from '@askrev/shared';

export interface CreateTaxRuleDto {
  ruleIdentifier: string;
  ruleName: string;
  incomeCategory: string; // 'DIRECT_SPONSOR_COMMISSION' | 'BINARY_MATCHING_REWARD' | 'ALL'
  taxRatePercent: number; // e.g. 5.0
  thresholdINR?: number; // e.g. 15000 (Section 194H)
  effectiveFrom: string; // ISO date
  effectiveTo?: string; // ISO date
  deductionEvent?: string; // 'ON_WALLET_CREDIT' | 'ON_WITHDRAWAL_REQUEST'
  disclaimer?: string;
}

export interface SimulateDeductionParams {
  userId: string;
  incomeCategory: string;
  grossAmountPaise: bigint;
  referenceEventType: string;
  referenceEntityId?: string;
  idempotencyKey?: string;
}

@Injectable()
export class TaxSimulationService {
  private readonly logger = new Logger(TaxSimulationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all configured tax simulation rules
   */
  async getRules() {
    const rules = await this.prisma.taxSimulationRule.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return rules.map((r) => ({
      ...r,
      thresholdINR: paiseToRupees(r.thresholdPaise),
    }));
  }

  /**
   * Create or update a configuration-driven tax simulation rule (Admin)
   */
  async createRule(dto: CreateTaxRuleDto) {
    if (dto.taxRatePercent < 0 || dto.taxRatePercent > 100) {
      throw new BadRequestException('Tax rate percent must be between 0% and 100%.');
    }

    const thresholdPaise = dto.thresholdINR ? rupeesToPaise(dto.thresholdINR) : 0n;

    const rule = await this.prisma.taxSimulationRule.upsert({
      where: { ruleIdentifier: dto.ruleIdentifier.trim().toUpperCase() },
      create: {
        ruleIdentifier: dto.ruleIdentifier.trim().toUpperCase(),
        ruleName: dto.ruleName.trim(),
        incomeCategory: dto.incomeCategory.trim().toUpperCase(),
        taxRatePercent: Number(dto.taxRatePercent),
        thresholdPaise,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        deductionEvent: dto.deductionEvent || 'ON_WALLET_CREDIT',
        disclaimer:
          dto.disclaimer ||
          'SIMULATED ESTIMATE ONLY: Not actual tax withheld or legal tax remittance. Tax applicability and rates require separate professional approval.',
      },
      update: {
        ruleName: dto.ruleName.trim(),
        incomeCategory: dto.incomeCategory.trim().toUpperCase(),
        taxRatePercent: Number(dto.taxRatePercent),
        thresholdPaise,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        deductionEvent: dto.deductionEvent || 'ON_WALLET_CREDIT',
        version: { increment: 1 },
      },
    });

    return {
      message: 'Tax simulation rule configured successfully',
      rule: {
        ...rule,
        thresholdINR: paiseToRupees(rule.thresholdPaise),
      },
    };
  }

  /**
   * Core simulation engine: evaluates configured effective-dated tax rules
   * and records a simulation estimate without creating legal tax liabilities.
   */
  async simulateTaxDeduction(params: SimulateDeductionParams) {
    // 1. Idempotency Check
    if (params.idempotencyKey) {
      const existing = await this.prisma.taxSimulationRecord.findUnique({
        where: { idempotencyKey: params.idempotencyKey },
        include: { rule: true },
      });
      if (existing) {
        return {
          idempotentReplay: true,
          recordId: existing.id,
          ruleIdentifier: existing.rule.ruleIdentifier,
          taxableGrossINR: paiseToRupees(existing.taxableGrossPaise),
          simulatedDeductionINR: paiseToRupees(existing.simulatedDeductionPaise),
          simulatedNetINR: paiseToRupees(existing.simulatedNetPaise),
          appliedRatePercent: existing.appliedRatePercent,
          disclaimer: existing.rule.disclaimer,
        };
      }
    }

    const now = new Date();

    // 2. Find active rule matching income category and current effective date
    const rules = await this.prisma.taxSimulationRule.findMany({
      where: {
        isActive: true,
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
      },
    });

    const activeRule = rules.find(
      (r) => r.incomeCategory === 'ALL' || r.incomeCategory === params.incomeCategory
    );

    if (!activeRule) {
      return {
        applied: false,
        reason: 'No active tax simulation rule found for this category and date',
        taxableGrossINR: paiseToRupees(params.grossAmountPaise),
        simulatedDeductionINR: 0,
        simulatedNetINR: paiseToRupees(params.grossAmountPaise),
      };
    }

    // 3. Compute simulated deduction in integer paise
    const rateBasisPoints = BigInt(Math.round(activeRule.taxRatePercent * 100)); // e.g. 5.0% -> 500
    const deductionPaise = (params.grossAmountPaise * rateBasisPoints) / 10000n;
    const netPaise = params.grossAmountPaise - deductionPaise;

    // 4. Record simulation calculation
    const record = await this.prisma.taxSimulationRecord.create({
      data: {
        userId: params.userId,
        ruleId: activeRule.id,
        referenceEventType: params.referenceEventType,
        referenceEntityId: params.referenceEntityId || null,
        taxableGrossPaise: params.grossAmountPaise,
        simulatedDeductionPaise: deductionPaise,
        simulatedNetPaise: netPaise,
        appliedRatePercent: activeRule.taxRatePercent,
        isSimulated: true,
        idempotencyKey: params.idempotencyKey || null,
      },
    });

    return {
      applied: true,
      recordId: record.id,
      ruleIdentifier: activeRule.ruleIdentifier,
      appliedRatePercent: activeRule.taxRatePercent,
      taxableGrossINR: paiseToRupees(params.grossAmountPaise),
      simulatedDeductionINR: paiseToRupees(deductionPaise),
      simulatedNetINR: paiseToRupees(netPaise),
      disclaimer: activeRule.disclaimer,
    };
  }

  /**
   * Member tax simulation history
   */
  async getUserTaxRecords(userId: string) {
    const records = await this.prisma.taxSimulationRecord.findMany({
      where: { userId },
      include: { rule: { select: { ruleIdentifier: true, ruleName: true, disclaimer: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return records.map((r) => ({
      id: r.id,
      ruleIdentifier: r.rule.ruleIdentifier,
      ruleName: r.rule.ruleName,
      referenceEventType: r.referenceEventType,
      taxableGrossINR: paiseToRupees(r.taxableGrossPaise),
      simulatedDeductionINR: paiseToRupees(r.simulatedDeductionPaise),
      simulatedNetINR: paiseToRupees(r.simulatedNetPaise),
      appliedRatePercent: r.appliedRatePercent,
      disclaimer: r.rule.disclaimer,
      createdAt: r.createdAt,
    }));
  }

  /**
   * System-wide Admin Tax Simulation Summary
   */
  async getAdminTaxReport() {
    const records = await this.prisma.taxSimulationRecord.findMany({
      include: { rule: { select: { ruleIdentifier: true, ruleName: true } } },
    });

    let totalGrossPaise = 0n;
    let totalDeductionPaise = 0n;
    let totalNetPaise = 0n;

    for (const r of records) {
      totalGrossPaise += r.taxableGrossPaise;
      totalDeductionPaise += r.simulatedDeductionPaise;
      totalNetPaise += r.simulatedNetPaise;
    }

    return {
      totalSimulatedRecords: records.length,
      totalGrossINR: paiseToRupees(totalGrossPaise),
      totalSimulatedDeductionsINR: paiseToRupees(totalDeductionPaise),
      totalNetINR: paiseToRupees(totalNetPaise),
      complianceNotice:
        'Tax applicability and rates require separate professional approval before any live implementation. All deductions here are estimates only.',
    };
  }
}

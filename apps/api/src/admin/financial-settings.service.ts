import { Injectable, Logger, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, paiseToRupees } from '@askrev/shared';
import { UpdateFinancialSettingsDto } from './dto/financial-settings.dto';

export { UpdateFinancialSettingsDto };

@Injectable()
export class FinancialSettingsService {
  private readonly logger = new Logger(FinancialSettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetch current Financial Settings with emergency environment protection overrides.
   */
  async getFinancialSettings() {
    let settings = await this.prisma.financialSettings.findUnique({
      where: { id: 'GLOBAL' },
    });

    if (!settings) {
      settings = await this.prisma.financialSettings.create({
        data: {
          id: 'GLOBAL',
          version: 1,
          crownBonusEnabled: true,
          royalMatchEnabled: true,
          legacyIncomeEnabled: false,
          evClubFundEnabled: false,
          voucherUtilizationEnabled: true,
          shoppingWalletUtilizationEnabled: false,
          withdrawalRequestsEnabled: false,
          payoutExecutionEnabled: false,
          minWithdrawalPaise: 100000n, // ₹1,000
          adminChargePercent: 10.0,
          withdrawalSource: 'EARNINGS_WALLET_ONLY',
          payoutMode: 'MANUAL_BANK_TRANSFER',
          tdsEnabled: false,
          tdsRatePercent: 5.0,
          tdsCalculationBasis: 'NET_INCOME',
          tdsThresholdPaise: 0n,
          bankVerificationRequired: true,
          paymentProcessingWindowHours: 48,
          withdrawalDisabledReason: 'Withdrawal requests are currently disabled awaiting commercial authorization.',
          updatedBy: 'SYSTEM_INIT',
          changeReason: 'Initial Production Financial Settings Baseline',
          auditHistory: [],
        },
      });
    }

    // Emergency environment overrides (fail-closed)
    const isSimulationMode = (process.env.COMPLIANCE_MODE || 'SIMULATION_ONLY') === 'SIMULATION_ONLY';
    const isLegacySettlementEnvEnabled = process.env.ENABLE_LEGACY_SETTLEMENT === 'true';
    const isLivePayoutsEnvEnabled = process.env.ENABLE_LIVE_PAYOUTS === 'true';
    const isManualWithdrawalsEnvEnabled = process.env.ENABLE_MANUAL_WITHDRAWALS === 'true';

    // Effective operational flags (DB setting overridden by env fail-closed controls)
    const effectiveOperational = {
      crownBonusLive: settings.crownBonusEnabled,
      royalMatchLive: settings.royalMatchEnabled,
      legacyIncomeLive: settings.legacyIncomeEnabled && isLegacySettlementEnvEnabled && !isSimulationMode,
      evClubFundLive: settings.evClubFundEnabled && isLegacySettlementEnvEnabled && !isSimulationMode,
      voucherUtilizationLive: settings.voucherUtilizationEnabled,
      shoppingWalletUtilizationLive: settings.shoppingWalletUtilizationEnabled,
      withdrawalRequestsLive: settings.withdrawalRequestsEnabled && isManualWithdrawalsEnvEnabled && !isSimulationMode,
      payoutExecutionLive: settings.payoutExecutionEnabled && isLivePayoutsEnvEnabled && !isSimulationMode,
    };

    const emergencyOverrides = {
      isSimulationMode,
      complianceMode: process.env.COMPLIANCE_MODE || 'SIMULATION_ONLY',
      isLegacySettlementEnvEnabled,
      isLivePayoutsEnvEnabled,
      isManualWithdrawalsEnvEnabled,
      emergencyBypassActive: false,
    };

    return {
      persistedSettings: {
        id: settings.id,
        version: settings.version,
        crownBonusEnabled: settings.crownBonusEnabled,
        royalMatchEnabled: settings.royalMatchEnabled,
        legacyIncomeEnabled: settings.legacyIncomeEnabled,
        evClubFundEnabled: settings.evClubFundEnabled,
        voucherUtilizationEnabled: settings.voucherUtilizationEnabled,
        shoppingWalletUtilizationEnabled: settings.shoppingWalletUtilizationEnabled,
        withdrawalRequestsEnabled: settings.withdrawalRequestsEnabled,
        payoutExecutionEnabled: settings.payoutExecutionEnabled,

        minWithdrawalINR: paiseToRupees(settings.minWithdrawalPaise),
        maxWithdrawalINR: settings.maxWithdrawalPaise ? paiseToRupees(settings.maxWithdrawalPaise) : null,
        dailyMemberLimitINR: settings.dailyMemberLimitPaise ? paiseToRupees(settings.dailyMemberLimitPaise) : null,
        monthlyMemberLimitINR: settings.monthlyMemberLimitPaise ? paiseToRupees(settings.monthlyMemberLimitPaise) : null,
        platformDailyPayoutLimitINR: settings.platformDailyPayoutLimitPaise ? paiseToRupees(settings.platformDailyPayoutLimitPaise) : null,
        adminChargePercent: Number(settings.adminChargePercent),
        withdrawalSource: settings.withdrawalSource,
        payoutMode: settings.payoutMode,

        tdsEnabled: settings.tdsEnabled,
        tdsRatePercent: Number(settings.tdsRatePercent),
        tdsPercent: Number(settings.tdsRatePercent),
        tdsCalculationBasis: settings.tdsCalculationBasis,
        panVerificationRequired: settings.panVerificationRequired,
        bankVerificationRequired: settings.bankVerificationRequired,
        paymentProcessingWindowHours: settings.paymentProcessingWindowHours,
        withdrawalDisabledReason: settings.withdrawalDisabledReason,

        effectiveDate: settings.effectiveDate,
        updatedBy: settings.updatedBy,
        changeReason: settings.changeReason,
        auditHistory: settings.auditHistory || [],
        updatedAt: settings.updatedAt,
      },
      settings: {
        id: settings.id,
        version: settings.version,
        crownBonusEnabled: settings.crownBonusEnabled,
        royalMatchEnabled: settings.royalMatchEnabled,
        legacyIncomeEnabled: settings.legacyIncomeEnabled,
        evClubFundEnabled: settings.evClubFundEnabled,
        voucherUtilizationEnabled: settings.voucherUtilizationEnabled,
        shoppingWalletUtilizationEnabled: settings.shoppingWalletUtilizationEnabled,
        withdrawalRequestsEnabled: settings.withdrawalRequestsEnabled,
        payoutExecutionEnabled: settings.payoutExecutionEnabled,

        minWithdrawalINR: paiseToRupees(settings.minWithdrawalPaise),
        maxWithdrawalINR: settings.maxWithdrawalPaise ? paiseToRupees(settings.maxWithdrawalPaise) : null,
        dailyMemberLimitINR: settings.dailyMemberLimitPaise ? paiseToRupees(settings.dailyMemberLimitPaise) : null,
        monthlyMemberLimitINR: settings.monthlyMemberLimitPaise ? paiseToRupees(settings.monthlyMemberLimitPaise) : null,
        platformDailyPayoutLimitINR: settings.platformDailyPayoutLimitPaise ? paiseToRupees(settings.platformDailyPayoutLimitPaise) : null,
        adminChargePercent: Number(settings.adminChargePercent),
        withdrawalSource: settings.withdrawalSource,
        payoutMode: settings.payoutMode,

        tdsEnabled: settings.tdsEnabled,
        tdsRatePercent: Number(settings.tdsRatePercent),
        tdsPercent: Number(settings.tdsRatePercent),
        tdsCalculationBasis: settings.tdsCalculationBasis,
        panVerificationRequired: settings.panVerificationRequired,
        bankVerificationRequired: settings.bankVerificationRequired,
        paymentProcessingWindowHours: settings.paymentProcessingWindowHours,
        withdrawalDisabledReason: settings.withdrawalDisabledReason,

        effectiveDate: settings.effectiveDate,
        updatedBy: settings.updatedBy,
        changeReason: settings.changeReason,
        auditHistory: settings.auditHistory || [],
        updatedAt: settings.updatedAt,
      },
      effectiveOperational,
      emergencyOverrides,
      effectiveEnvironment: {
        COMPLIANCE_MODE: emergencyOverrides.complianceMode,
        ENABLE_LEGACY_SETTLEMENT: emergencyOverrides.isLegacySettlementEnvEnabled,
        ENABLE_LIVE_PAYOUTS: emergencyOverrides.isLivePayoutsEnvEnabled,
        ENABLE_MANUAL_WITHDRAWALS: emergencyOverrides.isManualWithdrawalsEnvEnabled,
      },
    };
  }

  /**
   * Update Financial Settings. Only SUPER_ADMIN is authorized.
   */
  async updateFinancialSettings(adminUserId: string, dto: UpdateFinancialSettingsDto) {
    if (!dto.changeReason || dto.changeReason.trim().length < 5) {
      throw new BadRequestException('A descriptive change reason (at least 5 characters) is required for financial configuration changes.');
    }

    const admin = await this.prisma.user.findUnique({
      where: { id: adminUserId },
      select: { id: true, memberId: true, role: true, email: true },
    });

    if (!admin || admin.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only SUPER_ADMIN users are authorized to modify platform financial settings.');
    }

    const current = await this.prisma.financialSettings.findUnique({
      where: { id: 'GLOBAL' },
    });

    if (!current) {
      throw new NotFoundException('Global financial settings not found.');
    }

    // Input Validation
    if (dto.adminChargePercent !== undefined && (dto.adminChargePercent < 0 || dto.adminChargePercent > 50)) {
      throw new BadRequestException('Admin charge percentage must be between 0% and 50%.');
    }
    if (dto.minWithdrawalINR !== undefined && dto.minWithdrawalINR < 100) {
      throw new BadRequestException('Minimum withdrawal amount must be at least ₹100.');
    }
    const effectiveTdsRate = dto.tdsRatePercent !== undefined ? dto.tdsRatePercent : dto.tdsPercent;
    if (effectiveTdsRate !== undefined && (effectiveTdsRate < 0 || effectiveTdsRate > 30)) {
      throw new BadRequestException('TDS rate percentage must be between 0% and 30%.');
    }

    // Build Audit Snapshot
    const priorSnapshot = {
      version: current.version,
      updatedAt: current.updatedAt,
      updatedBy: current.updatedBy,
      changeReason: current.changeReason,
      flags: {
        crownBonusEnabled: current.crownBonusEnabled,
        royalMatchEnabled: current.royalMatchEnabled,
        legacyIncomeEnabled: current.legacyIncomeEnabled,
        evClubFundEnabled: current.evClubFundEnabled,
        voucherUtilizationEnabled: current.voucherUtilizationEnabled,
        shoppingWalletUtilizationEnabled: current.shoppingWalletUtilizationEnabled,
        withdrawalRequestsEnabled: current.withdrawalRequestsEnabled,
        payoutExecutionEnabled: current.payoutExecutionEnabled,
        minWithdrawalINR: paiseToRupees(current.minWithdrawalPaise),
        adminChargePercent: Number(current.adminChargePercent),
      },
    };

    const existingHistory = Array.isArray(current.auditHistory) ? (current.auditHistory as any[]) : [];
    const updatedHistory = [priorSnapshot, ...existingHistory].slice(0, 50); // Keep last 50 revisions

    const newVersion = current.version + 1;
    const now = new Date();

    const updateData: any = {
      version: newVersion,
      updatedBy: `${admin.memberId} (${admin.email})`,
      changeReason: dto.changeReason.trim(),
      effectiveDate: now,
      auditHistory: updatedHistory,
    };

    if (dto.crownBonusEnabled !== undefined) updateData.crownBonusEnabled = dto.crownBonusEnabled;
    if (dto.royalMatchEnabled !== undefined) updateData.royalMatchEnabled = dto.royalMatchEnabled;
    if (dto.legacyIncomeEnabled !== undefined) updateData.legacyIncomeEnabled = dto.legacyIncomeEnabled;
    if (dto.evClubFundEnabled !== undefined) updateData.evClubFundEnabled = dto.evClubFundEnabled;
    if (dto.voucherUtilizationEnabled !== undefined) updateData.voucherUtilizationEnabled = dto.voucherUtilizationEnabled;
    if (dto.shoppingWalletUtilizationEnabled !== undefined) updateData.shoppingWalletUtilizationEnabled = dto.shoppingWalletUtilizationEnabled;
    if (dto.withdrawalRequestsEnabled !== undefined) updateData.withdrawalRequestsEnabled = dto.withdrawalRequestsEnabled;
    if (dto.payoutExecutionEnabled !== undefined) updateData.payoutExecutionEnabled = dto.payoutExecutionEnabled;

    if (dto.minWithdrawalINR !== undefined) updateData.minWithdrawalPaise = BigInt(Math.round(dto.minWithdrawalINR * 100));
    if (dto.maxWithdrawalINR !== undefined) {
      updateData.maxWithdrawalPaise = dto.maxWithdrawalINR !== null ? BigInt(Math.round(dto.maxWithdrawalINR * 100)) : null;
    }
    if (dto.dailyMemberLimitINR !== undefined) {
      updateData.dailyMemberLimitPaise = dto.dailyMemberLimitINR !== null ? BigInt(Math.round(dto.dailyMemberLimitINR * 100)) : null;
    }
    if (dto.monthlyMemberLimitINR !== undefined) {
      updateData.monthlyMemberLimitPaise = dto.monthlyMemberLimitINR !== null ? BigInt(Math.round(dto.monthlyMemberLimitINR * 100)) : null;
    }
    if (dto.platformDailyPayoutLimitINR !== undefined) {
      updateData.platformDailyPayoutLimitPaise = dto.platformDailyPayoutLimitINR !== null ? BigInt(Math.round(dto.platformDailyPayoutLimitINR * 100)) : null;
    }
    if (dto.adminChargePercent !== undefined) updateData.adminChargePercent = dto.adminChargePercent;

    if (dto.tdsEnabled !== undefined) updateData.tdsEnabled = dto.tdsEnabled;
    if (effectiveTdsRate !== undefined) updateData.tdsRatePercent = effectiveTdsRate;
    if (dto.tdsCalculationBasis !== undefined) updateData.tdsCalculationBasis = dto.tdsCalculationBasis;
    if (dto.panVerificationRequired !== undefined) updateData.panVerificationRequired = dto.panVerificationRequired;
    if (dto.bankVerificationRequired !== undefined) updateData.bankVerificationRequired = dto.bankVerificationRequired;
    if (dto.paymentProcessingWindowHours !== undefined) updateData.paymentProcessingWindowHours = dto.paymentProcessingWindowHours;
    if (dto.withdrawalDisabledReason !== undefined) updateData.withdrawalDisabledReason = dto.withdrawalDisabledReason;

    const updated = await this.prisma.financialSettings.update({
      where: { id: 'GLOBAL' },
      data: updateData,
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: 'FINANCIAL_SETTINGS_UPDATED',
        entityType: 'FinancialSettings',
        entityId: 'GLOBAL',
        metadata: {
          version: newVersion,
          changedBy: admin.memberId,
          reason: dto.changeReason,
          changes: Object.keys(dto).filter((k) => k !== 'changeReason'),
        },
      },
    });

    this.logger.log(`✓ Financial settings updated to v${newVersion} by Super Admin ${admin.memberId}: ${dto.changeReason}`);

    return this.getFinancialSettings();
  }
}

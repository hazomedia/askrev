import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
  MinLength,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateFinancialSettingsDto {
  @IsOptional()
  @IsBoolean()
  crownBonusEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  royalMatchEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  legacyIncomeEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  evClubFundEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  voucherUtilizationEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  shoppingWalletUtilizationEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  withdrawalRequestsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  payoutExecutionEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(100, { message: 'Minimum withdrawal amount must be at least ₹100.' })
  minWithdrawalINR?: number;

  @IsOptional()
  @Type(() => Number)
  maxWithdrawalINR?: number | null;

  @IsOptional()
  @Type(() => Number)
  dailyMemberLimitINR?: number | null;

  @IsOptional()
  @Type(() => Number)
  monthlyMemberLimitINR?: number | null;

  @IsOptional()
  @Type(() => Number)
  platformDailyPayoutLimitINR?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Admin charge cannot be negative.' })
  @Max(50, { message: 'Admin charge cannot exceed 50%.' })
  adminChargePercent?: number;

  @IsOptional()
  @IsBoolean()
  tdsEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'TDS rate cannot be negative.' })
  @Max(30, { message: 'TDS rate cannot exceed 30%.' })
  tdsRatePercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'TDS percent cannot be negative.' })
  @Max(30, { message: 'TDS percent cannot exceed 30%.' })
  tdsPercent?: number;

  @IsOptional()
  @IsString()
  tdsCalculationBasis?: string;

  @IsOptional()
  @IsBoolean()
  panVerificationRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  bankVerificationRequired?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  paymentProcessingWindowHours?: number;

  @IsOptional()
  @IsString()
  withdrawalDisabledReason?: string | null;

  @IsString({ message: 'A descriptive change reason is required.' })
  @IsNotEmpty({ message: 'Change reason cannot be empty.' })
  @MinLength(5, {
    message: 'Change reason must be at least 5 characters explaining the modification for audit compliance.',
  })
  changeReason: string;
}

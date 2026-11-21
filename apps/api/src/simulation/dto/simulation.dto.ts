import { IsString, IsArray, IsOptional, IsBoolean, IsNumber, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MembershipPackage, QualificationMethod, BinaryMatchInput } from '@askrev/shared';

export class SimulatedDirectReferralDto {
  @IsString()
  memberId: string;

  @IsString()
  name: string;

  @IsEnum(MembershipPackage)
  initialPackage: MembershipPackage;

  @IsOptional()
  @IsBoolean()
  upgradesToFull?: boolean;

  @IsOptional()
  @IsNumber()
  upgradeOrder?: number;

  @IsOptional()
  @IsEnum(QualificationMethod)
  qualificationMethod?: QualificationMethod;

  @IsOptional()
  @IsBoolean()
  refunded?: boolean;
}

export class SimulationInputDto {
  @IsString()
  sponsorMemberId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SimulatedDirectReferralDto)
  directReferrals: SimulatedDirectReferralDto[];

  @IsOptional()
  initialHoldReservePaise?: bigint;

  @IsOptional()
  initialAvailableEarningsPaise?: bigint;
}

export class BinaryMatchInputDto implements BinaryMatchInput {
  @Type(() => Number)
  @IsNumber()
  leftUnits: number;

  @Type(() => Number)
  @IsNumber()
  rightUnits: number;

  @Type(() => Number)
  @IsNumber()
  previousCarryLeft: number;

  @Type(() => Number)
  @IsNumber()
  previousCarryRight: number;

  @IsBoolean()
  isBeneficiaryQualified: boolean;

  @Type(() => Number)
  @IsNumber()
  todayMatchesAlreadySettled: number;
}

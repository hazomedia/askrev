import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum PayoutDestinationType {
  BANK_ACCOUNT = 'BANK_ACCOUNT',
  UPI = 'UPI',
}

export class RequestWithdrawalDto {
  @IsEnum(PayoutDestinationType)
  @IsNotEmpty()
  destinationType: PayoutDestinationType;

  // Bank Account fields
  @IsString()
  @IsOptional()
  accountHolderName?: string;

  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  accountNumber?: string;

  @IsString()
  @IsOptional()
  confirmAccountNumber?: string;

  @IsString()
  @IsOptional()
  ifscCode?: string;

  // UPI fields
  @IsString()
  @IsOptional()
  upiId?: string;
}

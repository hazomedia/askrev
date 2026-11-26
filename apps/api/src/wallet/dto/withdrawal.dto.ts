import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export enum PayoutDestinationType {
  BANK_ACCOUNT = 'BANK_ACCOUNT',
  UPI = 'UPI',
}

export class RequestWithdrawalDto {
  @IsEnum(PayoutDestinationType)
  @IsNotEmpty()
  destinationType: PayoutDestinationType;

  @IsNumber()
  @Min(1000, { message: 'Minimum withdrawal amount is ₹1,000.' })
  @IsOptional()
  amountINR?: number;

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

  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}

export class AdminApproveWithdrawalDto {
  @IsString()
  @IsOptional()
  adminNotes?: string;
}

export class AdminRejectWithdrawalDto {
  @IsString()
  @IsNotEmpty({ message: 'Rejection reason is required.' })
  rejectionReason: string;

  @IsString()
  @IsOptional()
  adminNotes?: string;
}

export class AdminSettleWithdrawalDto {
  @IsString()
  @IsNotEmpty({ message: 'Bank reference / UTR number is required for manual settlement.' })
  utrNumber: string;

  @IsString()
  @IsOptional()
  settlementDate?: string;

  @IsString()
  @IsOptional()
  adminNotes?: string;
}

export class WithdrawalQueryDto {
  @IsString()
  @IsOptional()
  status?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;

  @IsString()
  @IsOptional()
  search?: string;
}

import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { MembershipRequestType, MembershipRequestStatus } from '@askrev/shared';

export class CreateMembershipRequestDto {
  @IsEnum(MembershipRequestType)
  @IsNotEmpty()
  requestType: MembershipRequestType;

  @IsString()
  @IsOptional()
  paymentMode?: string;

  @IsString()
  @IsOptional()
  @Matches(/^([0-9]{12}|[A-Za-z0-9]{12,22})$/, {
    message: 'Payment reference / UTR must be a 12-digit numeric or 12-22 alphanumeric transaction reference.',
  })
  paymentReference?: string;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class ReviewMembershipRequestDto {
  @IsString()
  @IsOptional()
  adminNotes?: string;
}

export class QueryMembershipRequestsDto {
  @IsEnum(MembershipRequestStatus)
  @IsOptional()
  status?: MembershipRequestStatus;

  @IsEnum(MembershipRequestType)
  @IsOptional()
  requestType?: MembershipRequestType;
}

export class UpdatePaymentConfigDto {
  @IsString()
  @IsOptional()
  @Matches(/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/, {
    message: 'Merchant UPI VPA must be a valid UPI ID (e.g. merchant@bank)',
  })
  merchantUpiVpa?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  merchantName?: string;

  @IsBoolean()
  @IsOptional()
  isVerified?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;
}

import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { MembershipRequestType } from '@askrev/shared';

export class UpdateUpiSettingsDto {
  @IsBoolean()
  @IsOptional()
  upiEnabled?: boolean;

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

  @IsBoolean()
  @IsOptional()
  manualReviewRequired?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateGatewayConfigDto {
  @IsString()
  @IsNotEmpty()
  provider: string; // 'RAZORPAY', 'CASHFREE', 'PHONEPE'

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  isSandbox?: boolean;

  @IsString()
  @IsOptional()
  merchantId?: string;

  @IsString()
  @IsOptional()
  secretKey?: string;

  @IsString()
  @IsOptional()
  webhookSecret?: string;

  @IsString()
  @IsOptional()
  webhookUrl?: string;
}

export class TestGatewayConnectionDto {
  @IsString()
  @IsNotEmpty()
  provider: string;

  @IsString()
  @IsOptional()
  merchantId?: string;

  @IsString()
  @IsOptional()
  secretKey?: string;

  @IsBoolean()
  @IsOptional()
  isSandbox?: boolean;
}

export class CreateGatewayOrderDto {
  @IsEnum(MembershipRequestType)
  @IsNotEmpty()
  requestType: MembershipRequestType;

  @IsString()
  @IsNotEmpty()
  provider: string;
}

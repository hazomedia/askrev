import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
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

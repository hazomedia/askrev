import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { BinaryLeg } from '@askrev/shared';

export class PlaceBinaryNodeDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  parentId: string;

  @IsEnum(BinaryLeg)
  @IsNotEmpty()
  leg: BinaryLeg;
}

export class RunBinaryMatchDto {
  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}

export class QueryBinaryHistoryDto {
  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;
}


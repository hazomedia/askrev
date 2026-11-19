import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { HeroSlideStatus } from '@askrev/shared';

export class CreateHeroSlideDto {
  @IsString()
  @IsNotEmpty()
  internalName: string;

  @IsString()
  @IsNotEmpty()
  heading: string;

  @IsString()
  @IsOptional()
  subheading?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  eyebrowText?: string;

  @IsString()
  @IsNotEmpty()
  desktopImageUrl: string;

  @IsString()
  @IsOptional()
  mobileImageUrl?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  desktopFocalX?: number = 50.0;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  desktopFocalY?: number = 50.0;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  mobileFocalX?: number = 50.0;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  mobileFocalY?: number = 50.0;

  @IsString()
  @IsOptional()
  desktopAltText?: string;

  @IsString()
  @IsOptional()
  mobileAltText?: string;

  @IsString()
  @IsOptional()
  primaryCtaLabel?: string;

  @IsString()
  @IsOptional()
  primaryCtaUrl?: string;

  @IsString()
  @IsOptional()
  primaryCtaStyle?: 'PRIMARY' | 'SECONDARY' | 'OUTLINE' = 'PRIMARY';

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  primaryCtaEnabled?: boolean = true;

  @IsString()
  @IsOptional()
  secondaryCtaLabel?: string;

  @IsString()
  @IsOptional()
  secondaryCtaUrl?: string;

  @IsString()
  @IsOptional()
  secondaryCtaStyle?: 'PRIMARY' | 'SECONDARY' | 'OUTLINE' = 'SECONDARY';

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  secondaryCtaEnabled?: boolean = false;

  @IsString()
  @IsOptional()
  linkedProductId?: string;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  showPrice?: boolean = false;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  showRange?: boolean = false;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  showTopSpeed?: boolean = false;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  showBattery?: boolean = false;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  showSpecifications?: boolean = false;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  sortOrder?: number = 0;

  @IsEnum(HeroSlideStatus)
  @IsOptional()
  status?: HeroSlideStatus = HeroSlideStatus.DRAFT;

  @IsString()
  @IsOptional()
  publishStartAt?: string;

  @IsString()
  @IsOptional()
  publishEndAt?: string;
}

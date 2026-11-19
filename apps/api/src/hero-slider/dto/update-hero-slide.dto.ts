import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { HeroSlideStatus } from '@askrev/shared';
import { CreateHeroSlideDto } from './create-hero-slide.dto';

export class UpdateHeroSlideDto implements Partial<CreateHeroSlideDto> {
  @IsString()
  @IsOptional()
  internalName?: string;

  @IsString()
  @IsOptional()
  heading?: string;

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
  @IsOptional()
  desktopImageUrl?: string;

  @IsString()
  @IsOptional()
  mobileImageUrl?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  desktopFocalX?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  desktopFocalY?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  mobileFocalX?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  mobileFocalY?: number;

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
  primaryCtaStyle?: 'PRIMARY' | 'SECONDARY' | 'OUTLINE';

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  primaryCtaEnabled?: boolean;

  @IsString()
  @IsOptional()
  secondaryCtaLabel?: string;

  @IsString()
  @IsOptional()
  secondaryCtaUrl?: string;

  @IsString()
  @IsOptional()
  secondaryCtaStyle?: 'PRIMARY' | 'SECONDARY' | 'OUTLINE';

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  secondaryCtaEnabled?: boolean;

  @IsString()
  @IsOptional()
  linkedProductId?: string;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  showPrice?: boolean;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  showRange?: boolean;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  showTopSpeed?: boolean;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  showBattery?: boolean;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  showSpecifications?: boolean;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  sortOrder?: number;

  @IsEnum(HeroSlideStatus)
  @IsOptional()
  status?: HeroSlideStatus;

  @IsString()
  @IsOptional()
  publishStartAt?: string;

  @IsString()
  @IsOptional()
  publishEndAt?: string;
}

import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  IsDateString,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { BannerStatus } from '@prisma/client';

export class UpdateSlideDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  subtitle?: string;

  @IsString()
  @IsOptional()
  badgeText?: string;

  @IsString()
  @IsOptional()
  buttonText?: string;

  @IsString()
  @IsOptional()
  desktopImageUrl?: string;

  @IsString()
  @IsOptional()
  mobileImageUrl?: string;

  @IsString()
  @IsOptional()
  @Matches(/^(\/[a-zA-Z0-9_\-\/?#=&%]*|#.*|)$/, {
    message: 'Destination link must be a safe internal relative route starting with / or anchor',
  })
  linkUrl?: string;

  @IsString()
  @IsOptional()
  altText?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  displayOrder?: number;

  @IsEnum(BannerStatus)
  @IsOptional()
  status?: BannerStatus;

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @IsDateString()
  @IsOptional()
  startDate?: string | null;

  @IsDateString()
  @IsOptional()
  endDate?: string | null;

  @IsInt()
  @IsOptional()
  @Min(1000)
  @Max(30000)
  autoplayInterval?: number;
}

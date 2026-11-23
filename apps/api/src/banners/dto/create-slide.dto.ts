import {
  IsString,
  IsNotEmpty,
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

export class CreateSlideDto {
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
  @IsNotEmpty({ message: 'Desktop image URL is required' })
  desktopImageUrl: string;

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
  displayOrder?: number = 0;

  @IsEnum(BannerStatus)
  @IsOptional()
  status?: BannerStatus = BannerStatus.PUBLISHED;

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean = true;

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
  autoplayInterval?: number = 5000;
}

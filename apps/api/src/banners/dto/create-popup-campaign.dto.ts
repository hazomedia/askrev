import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  Matches,
  IsDateString,
} from 'class-validator';
import { PopupFrequency, BannerStatus } from '@prisma/client';

export class CreatePopupCampaignDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  heading: string;

  @IsString()
  @IsOptional()
  subheading?: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsOptional()
  buttonText?: string = 'EXPLORE DASHBOARD';

  @IsString()
  @IsOptional()
  @Matches(/^\/[a-zA-Z0-9_\-\/?#=&%]*$/, {
    message: 'Button destination must be a safe relative internal route starting with /',
  })
  buttonLink?: string = '/dashboard';

  @IsString()
  @IsOptional()
  footerText?: string = 'SMART MOBILITY • CONNECTED FUTURE';

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsEnum(PopupFrequency)
  @IsOptional()
  frequency?: PopupFrequency = PopupFrequency.ONCE_PER_CAMPAIGN;

  @IsEnum(BannerStatus)
  @IsOptional()
  status?: BannerStatus = BannerStatus.DRAFT;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}

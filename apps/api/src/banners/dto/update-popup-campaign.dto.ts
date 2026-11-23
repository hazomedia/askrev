import {
  IsString,
  IsOptional,
  IsEnum,
  Matches,
  IsDateString,
} from 'class-validator';
import { PopupFrequency, BannerStatus } from '@prisma/client';
import { CreatePopupCampaignDto } from './create-popup-campaign.dto';

export class UpdatePopupCampaignDto implements Partial<CreatePopupCampaignDto> {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  heading?: string;

  @IsString()
  @IsOptional()
  subheading?: string;

  @IsString()
  @IsOptional()
  message?: string;

  @IsString()
  @IsOptional()
  buttonText?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\/[a-zA-Z0-9_\-\/?#=&%]*$/, {
    message: 'Button destination must be a safe relative internal route starting with /',
  })
  buttonLink?: string;

  @IsString()
  @IsOptional()
  footerText?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsEnum(PopupFrequency)
  @IsOptional()
  frequency?: PopupFrequency;

  @IsEnum(BannerStatus)
  @IsOptional()
  status?: BannerStatus;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}

import { IsString, IsOptional, IsBoolean, Matches } from 'class-validator';

export class UpdateTopBannerDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  badgeText?: string;

  @IsString()
  desktopImageUrl: string;

  @IsString()
  @IsOptional()
  mobileImageUrl?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\/[a-zA-Z0-9_\-\/?#=&%]*$/, {
    message: 'Destination link must be a safe relative internal route starting with /',
  })
  linkUrl?: string;

  @IsString()
  @IsOptional()
  altText?: string;

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;
}

import { IsString, IsOptional, IsBoolean, IsInt, Min, Max, Matches } from 'class-validator';

export class UpdateTopBannerDto {
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
  desktopImageUrl: string;

  @IsString()
  @IsOptional()
  mobileImageUrl?: string;

  @IsString()
  @IsOptional()
  @Matches(/^(\/[a-zA-Z0-9_\-\/?#=&%]*|#.*|)$/, {
    message: 'Destination link must be a safe relative internal route starting with /',
  })
  linkUrl?: string;

  @IsString()
  @IsOptional()
  altText?: string;

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @IsInt()
  @IsOptional()
  @Min(1000)
  @Max(30000)
  autoplayInterval?: number;
}

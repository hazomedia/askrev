import { IsOptional, IsEnum, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { HeroSlideStatus } from '@askrev/shared';

export class PublicHeroSliderQueryDto {
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  preview?: boolean;
}

export class AdminHeroSliderQueryDto {
  @IsEnum(HeroSlideStatus)
  @IsOptional()
  status?: HeroSlideStatus;

  @IsString()
  @IsOptional()
  search?: string;
}

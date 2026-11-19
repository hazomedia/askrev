import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class ReorderHeroSlidesDto {
  @IsArray()
  @IsNotEmpty()
  @IsString({ each: true })
  slideIds: string[];
}

import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';

export class ReorderSlidesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  slideIds: string[];
}

import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMenuCategoryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;
}

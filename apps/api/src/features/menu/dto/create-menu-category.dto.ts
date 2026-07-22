import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateMenuCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;
}

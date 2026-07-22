import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../core/pagination';

export class FindRestaurantsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  search?: string;
}

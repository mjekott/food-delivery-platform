import { OrderStatus } from '@food-delivery/types';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../core/pagination';

export class FindOrdersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  /** When true, excludes finished orders (DELIVERED / CANCELLED). */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  active?: boolean;
}

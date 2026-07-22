import { OrderStatus } from '@food-delivery/types';
import { IsEnum } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;
}

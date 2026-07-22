import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateOrderItemDto {
  @IsUUID()
  menuItemId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateOrderDto {
  @IsUUID()
  restaurantId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  deliveryAddress!: string;

  @IsOptional()
  @IsLatitude()
  deliveryLat?: number;

  @IsOptional()
  @IsLongitude()
  deliveryLng?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}

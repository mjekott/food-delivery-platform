import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class PayOrderDto {
  /** Where Paystack redirects after payment (e.g. the app's deep link). */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  callbackUrl?: string;
}

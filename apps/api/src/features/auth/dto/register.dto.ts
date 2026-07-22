import { UserRole } from '@food-delivery/types';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

// Roles a user may self-register as — ADMIN is intentionally excluded.
const REGISTRABLE_ROLES = [
  UserRole.CUSTOMER,
  UserRole.RESTAURANT_OWNER,
  UserRole.DRIVER,
] as const;

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsIn(REGISTRABLE_ROLES)
  role?: (typeof REGISTRABLE_ROLES)[number];
}

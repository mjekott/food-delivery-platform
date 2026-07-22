import {
  UserRole,
  type AuthResponse,
  type AuthUser,
  type JwtPayload,
} from '@food-delivery/types';
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../../core/database/database.service';
import { users, type User } from '../../core/database/schema/users';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly database: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.database.db.query.users.findFirst({
      where: eq(users.email, dto.email),
    });

    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const [user] = await this.database.db
      .insert(users)
      .values({
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        password: passwordHash,
        ...(dto.role ? { role: dto.role } : {}),
      })
      .returning();

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.database.db.query.users.findFirst({
      where: eq(users.email, dto.email),
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildAuthResponse(user);
  }

  private async buildAuthResponse(user: User): Promise<AuthResponse> {
    // The DB column types role as a string-literal union; the shared API
    // contract uses the UserRole enum. They share identical values.
    const role = user.role as UserRole;

    const safeUser: AuthUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role,
    };

    const payload: JwtPayload = { sub: user.id, email: user.email, role };
    const accessToken = await this.jwtService.signAsync(payload);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    return { accessToken, user: safeUser };
  }
}

import {
  UserRole,
  type AuthUser,
  type JwtPayload,
} from '@food-delivery/types';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { eq } from 'drizzle-orm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DatabaseService } from '../../../core/database/database.service';
import { users } from '../../../core/database/schema/users';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly database: DatabaseService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.database.db.query.users.findFirst({
      where: eq(users.id, payload.sub),
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as UserRole,
    };
  }
}

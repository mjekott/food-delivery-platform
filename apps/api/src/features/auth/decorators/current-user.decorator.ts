import type { AuthUser } from '@food-delivery/types';
import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

/** Resolves the authenticated user attached to the request by JwtStrategy. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
    return request.user;
  },
);

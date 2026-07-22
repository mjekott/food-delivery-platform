import type { UserRole } from '@food-delivery/types';
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/** Restricts a route (or controller) to the given roles. Enforced by RolesGuard. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

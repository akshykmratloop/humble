import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/** @param {...('USER'|'MODERATOR'|'ADMIN')} roles */
export const Roles = (...roles) => SetMetadata(ROLES_KEY, roles);

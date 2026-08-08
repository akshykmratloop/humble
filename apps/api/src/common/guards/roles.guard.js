import { Injectable, ForbiddenException, Dependencies } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Role-based authorization for admin/moderator routes (docs/08-api-contracts.md
 * Admin/Moderation section). Runs after SessionAuthGuard, which populates
 * request.currentUserRole from the server-side session — never client input.
 */
@Injectable()
@Dependencies(Reflector)
export class RolesGuard {
  constructor(reflector) {
    this.reflector = reflector;
  }

  canActivate(context) {
    const requiredRoles = this.reflector.getAllAndOverride(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    if (!requiredRoles.includes(request.currentUserRole)) {
      throw new ForbiddenException('Insufficient role for this action');
    }
    return true;
  }
}

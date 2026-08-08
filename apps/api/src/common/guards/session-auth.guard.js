import { Injectable, UnauthorizedException } from '@nestjs/common';

/**
 * Requires a valid, non-anonymous session (docs/05-hld.md §6). The session
 * itself is the security boundary — req.session.userId is only ever set by
 * AuthService after a verified login, never trusted from any client-supplied
 * header or body field (INV: object-level authorization derives ownership
 * from the session, never from a client-supplied userId).
 */
@Injectable()
export class SessionAuthGuard {
  canActivate(context) {
    const request = context.switchToHttp().getRequest();
    if (!request.session || !request.session.userId) {
      throw new UnauthorizedException('Authentication required');
    }
    request.currentUserId = request.session.userId;
    request.currentUserRole = request.session.role;
    return true;
  }
}

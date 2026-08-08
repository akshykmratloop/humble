import { createParamDecorator } from '@nestjs/common';

/**
 * Injects the authenticated user's ID, resolved by SessionAuthGuard from the
 * server-side session. Never derived from a client-supplied field — this is
 * the concrete mechanism behind every "a user may only act on their own X"
 * authorization rule in docs/06-lld.md.
 */
export const CurrentUserId = createParamDecorator((_data, ctx) => {
  const request = ctx.switchToHttp().getRequest();
  return request.currentUserId;
});

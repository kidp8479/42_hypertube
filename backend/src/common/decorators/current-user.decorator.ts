// Param decorator for reading the authenticated principal off the request.
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * The minimal authenticated principal put on the request by JwtStrategy.
 * `apiClientId` is set when the token came from `POST /oauth/token` (an API
 * key, ADR-0015) rather than from a login.
 */
export interface AuthUser {
  id: number;
  apiClientId?: number;
}

/** Injects `req.user` (set by JwtStrategy) into a handler parameter. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest<{ user: AuthUser }>().user,
);

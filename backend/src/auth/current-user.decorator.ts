import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** The minimal authenticated principal put on the request by JwtStrategy. */
export interface AuthUser {
  id: number;
}

/** Injects `req.user` (set by JwtStrategy) into a handler parameter. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest<{ user: AuthUser }>().user,
);

// Guard for the routes an API client token must not reach.
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthUser } from '../decorators/current-user.decorator';

/**
 * Lets a request through only with a login token, never one bought with an
 * API key (`POST /oauth/token`, ADR-0015). On key management, so a leaked
 * secret cannot mint a new key that outlives its revocation, and on account
 * deletion. Runs after the global JwtAuthGuard, which has set `req.user`.
 *
 * @throws {ForbiddenException} 403 for an API client token.
 */
@Injectable()
export class SessionTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    if (user?.apiClientId !== undefined) {
      throw new ForbiddenException('Not allowed with an API client token');
    }
    return true;
  }
}

// Passport strategy that verifies Bearer tokens; used by JwtAuthGuard.
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from '../../users/users.service';
import { ApiClientsService } from '../../api-clients/api-clients.service';

/**
 * Shape of our signed token payload (see {@link AuthService.login}). `cid`
 * is the API client a token was issued to, absent on a login token.
 */
export interface JwtPayload {
  sub: number;
  cid?: number;
}

/** A payload as it comes back verified: the signer added `iat` (seconds). */
export type VerifiedJwtPayload = JwtPayload & { iat: number };

/**
 * Validates the Bearer token on incoming requests: checks the signature
 * against `JWT_SECRET` and that the token is not expired, then that its
 * account still exists and did not change hands after the token was issued
 * (`User.credentialsChangedAt`, one primary-key read), and, for a token
 * bought with an API key, that the key is not revoked (one more read). Hands the route a
 * minimal `req.user`; profile data is not read here - a handler that needs
 * it fetches it (ADR-0002).
 */
/**
 * Whether a token issued at `iat` predates `changedAt`. `iat` has no
 * milliseconds, so the change's own second still counts as "after": a token
 * minted right after a claim must not lock its new owner out.
 */
function issuedBefore(iat: number, changedAt: Date | null): boolean {
  return changedAt !== null && iat < Math.floor(changedAt.getTime() / 1000);
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
    private readonly apiClients: ApiClientsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: VerifiedJwtPayload): Promise<AuthUser> {
    const account = await this.usersService.findCredentialsChangedAt(
      payload.sub,
    );
    if (!account || issuedBefore(payload.iat, account.credentialsChangedAt)) {
      throw new UnauthorizedException();
    }
    if (payload.cid === undefined) {
      return { id: payload.sub };
    }
    // Bought with an API key: dead as soon as the key is revoked.
    if (!(await this.apiClients.exists(payload.cid, payload.sub))) {
      throw new UnauthorizedException();
    }
    return { id: payload.sub, apiClientId: payload.cid };
  }
}

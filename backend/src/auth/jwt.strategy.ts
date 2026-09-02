import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

/** Shape of our signed token payload (see {@link AuthService.login}). */
interface JwtPayload {
  sub: number;
}

/**
 * Validates the Bearer token on incoming requests: checks the signature
 * against `JWT_SECRET` and that the token is not expired, then hands the
 * route a minimal `req.user`. Profile data is not read here - a handler
 * that needs it fetches it (ADR-0002).
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: JwtPayload): { id: number } {
    return { id: payload.sub };
  }
}

// Token issuance for the OAuth2 client-credentials grant (POST /oauth/token).
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ApiClientsService } from '../api-clients/api-clients.service';
import { parseDuration } from '../config/duration.util';
import type { OAuthTokenResponseDto } from './dto/oauth-token-response.dto';
import type { JwtPayload } from './strategies/jwt.strategy';

/**
 * Trades an API key for an access token (ADR-0015). The token acts on behalf
 * of the key's owner, like a login token, and carries `cid` so the routes
 * that refuse API keys can tell ({@link SessionTokenGuard}).
 */
@Injectable()
export class OAuthTokenService {
  constructor(
    private readonly apiClients: ApiClientsService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * @throws {UnauthorizedException} 401 for an unknown client or a wrong
   * secret, without saying which.
   */
  async issue(client: string, secret: string): Promise<OAuthTokenResponseDto> {
    const key = await this.apiClients.verify(client, secret);
    if (!key) {
      throw new UnauthorizedException();
    }
    const payload: JwtPayload = { sub: key.userId, cid: key.id };
    return {
      access_token: await this.jwtService.signAsync(payload),
      token_type: 'Bearer',
      expires_in:
        parseDuration(this.config.getOrThrow<string>('JWT_EXPIRES_IN')) / 1000,
    };
  }
}

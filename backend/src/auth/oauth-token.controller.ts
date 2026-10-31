// HTTP entry point of the OAuth2 client-credentials grant.
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrors } from '../common/decorators/api-errors.decorator';
import { Public } from '../common/decorators/public.decorator';
import { OAUTH_TOKEN_THROTTLE } from '../config/throttle.config';
import { OAuthTokenDto } from './dto/oauth-token.dto';
import { OAuthTokenResponseDto } from './dto/oauth-token-response.dto';
import { OAuthTokenService } from './oauth-token.service';

/**
 * `POST /oauth/token`, the subject's OAuth2 endpoint: an API key's `client`
 * and `secret` (created at `POST /api-clients`) for a bearer token acting as
 * the key's owner (ADR-0015).
 */
@ApiTags('oauth')
@Controller('oauth')
export class OAuthTokenController {
  constructor(private readonly oauthTokens: OAuthTokenService) {}

  /** Answers 200 (nothing is created), like the login. */
  @ApiOperation({
    summary: 'Trade an API key (client + secret) for an access token',
    description:
      'OAuth2 client-credentials grant. JSON or form-encoded; `grant_type` is optional.',
  })
  @ApiOkResponse({ type: OAuthTokenResponseDto })
  @ApiErrors(
    400,
    [401, 'Unknown client or wrong secret, without saying which'],
    429,
  )
  @Public()
  @Throttle({ default: OAUTH_TOKEN_THROTTLE })
  @Post('token')
  @HttpCode(HttpStatus.OK)
  token(@Body() dto: OAuthTokenDto): Promise<OAuthTokenResponseDto> {
    return this.oauthTokens.issue(dto.client, dto.secret);
  }
}

// HTTP entry point for the session routes: login, OAuth code exchange,
// refresh, logout.
import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrors } from '../common/decorators/api-errors.decorator';
import { AccessTokenDto } from './dto/access-token.dto';
import { AuthService } from './auth.service';
import { OAuthExchangeService } from './oauth-exchange.service';
import { RefreshTokenService } from '../sessions/refresh-token.service';
import {
  clearRefreshCookie,
  readRefreshCookie,
  setRefreshCookie,
} from '../sessions/refresh-cookie.util';
import { Public } from '../common/decorators/public.decorator';
import { LoginIdentifierThrottlerGuard } from './guards/login-identifier-throttler.guard';
import {
  LOGIN_THROTTLE,
  OAUTH_EXCHANGE_THROTTLE,
  REFRESH_THROTTLE,
} from '../config/throttle.config';
import { ExchangeCodeDto } from './dto/exchange-code.dto';
import { LoginDto } from './dto/login.dto';
import type { Request, Response } from 'express';

/**
 * Session routes: username-or-email + password login, the OAuth code
 * exchange, refresh and logout - all public, since each proves itself with
 * credentials, a code or the refresh cookie rather than a bearer token. The
 * OAuth redirects that hand out the code live in {@link OAuthLoginController}. All credential logic lives in {@link AuthService}, the refresh-token
 * lifecycle in {@link RefreshTokenService} (ADR-0011).
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly oauthExchange: OAuthExchangeService,
    private readonly refreshTokens: RefreshTokenService,
  ) {}

  /**
   * Exchanges a username or email + password for a JWT access token, and starts a session:
   * the refresh token travels in an HttpOnly cookie, never in the body.
   * Answers 200 (not the POST default 201 - nothing is created).
   *
   * @throws {UnauthorizedException} 401 on any bad credential, with no
   * hint about which part failed (wrong password and unknown account are
   * indistinguishable, see {@link AuthService.validateUser}).
   */
  // LOGIN_THROTTLE per IP, and again per identifier whatever the IP
  // (LoginIdentifierThrottlerGuard).
  @ApiOperation({
    summary: 'Log in with a username or email and a password',
    description: 'Also sets the `refresh_token` cookie (HttpOnly).',
  })
  @ApiOkResponse({ type: AccessTokenDto })
  @ApiErrors(400, [401, 'Wrong credentials, without saying which part'], 429)
  @Public()
  @Throttle({ default: LOGIN_THROTTLE })
  @UseGuards(LoginIdentifierThrottlerGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.validateUser(
      loginDto.identifier,
      loginDto.password,
    );
    if (!user) {
      throw new UnauthorizedException();
    }
    const tokens = await this.authService.login(user);
    await this.startSession(user.id, req, res);
    return tokens;
  }

  /**
   * Trades the refresh cookie for a new access token, and rotates it: the
   * cookie answers with the next token, the one just used is consumed.
   * Answers 200. Public, because the cookie is the credential: the access
   * token it replaces is usually expired by now.
   *
   * With no cookie it answers 204: a signed-out visitor, whom a 401 would
   * give a red console line on every load (ADR-0011). Written by hand, since
   * a passthrough response always gets the route's single `@HttpCode`.
   *
   * @throws {UnauthorizedException} 401 for a token that is unknown, expired,
   * revoked or already rotated (which also ends the whole session). The dead
   * cookie is cleared.
   */
  @ApiOperation({
    summary: 'Trade the refresh cookie for a new access token',
    description:
      'The `refresh_token` cookie is the credential, and is rotated on every call.',
  })
  @ApiOkResponse({ type: AccessTokenDto })
  @ApiNoContentResponse({ description: 'No refresh cookie: signed out' })
  @ApiErrors(
    [401, 'Unknown, expired, revoked or already used refresh token'],
    429,
  )
  @Public()
  @Throttle({ default: REFRESH_THROTTLE })
  @Post('refresh')
  async refresh(@Req() req: Request, @Res() res: Response): Promise<void> {
    const secret = readRefreshCookie(req);
    if (!secret) {
      res.status(HttpStatus.NO_CONTENT).end();
      return;
    }
    try {
      const next = await this.refreshTokens.rotate(secret);
      setRefreshCookie(req, res, next);
      const tokens = await this.authService.loginById(next.userId);
      res.status(HttpStatus.OK).json(tokens);
    } catch (error) {
      clearRefreshCookie(req, res);
      throw error;
    }
  }

  /**
   * One-click logout: revokes the whole session the refresh cookie belongs to
   * and clears the cookie, so the refresh token cannot be used again even if
   * it was copied (ADR-0011). Answers 204, and also when there is nothing to
   * revoke: logging out twice is not an error.
   *
   * Public on purpose: it must work after the access token expired, and the
   * cookie is the only thing it needs. A forged logout from another site can
   * do no more than end the caller's own session, and `SameSite=Strict`
   * keeps the cookie from being sent with it.
   */
  @ApiOperation({
    summary: 'Log out: end the session of the refresh cookie',
  })
  @ApiNoContentResponse({ description: 'Logged out, or nothing to end' })
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const secret = readRefreshCookie(req);
    if (secret) {
      await this.refreshTokens.revokeFamilyOf(secret);
    }
    clearRefreshCookie(req, res);
  }

  /**
   * Trades the single-use code from the OAuth callback redirect for the
   * access token, from a normal SPA fetch (ADR-0007). Answers 200 (nothing
   * is created).
   *
   * @throws {UnauthorizedException} 401 for an unknown, already used or
   * expired code, without saying which.
   */
  @ApiOperation({
    summary: 'Trade the OAuth callback code for an access token',
    description: 'Also sets the `refresh_token` cookie (HttpOnly).',
  })
  @ApiOkResponse({ type: AccessTokenDto })
  @ApiErrors(400, [401, 'Unknown, used or expired code'], 429)
  @Public()
  @Throttle({ default: OAUTH_EXCHANGE_THROTTLE })
  @Post('oauth/exchange')
  @HttpCode(HttpStatus.OK)
  async exchange(
    @Body() dto: ExchangeCodeDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userId = this.oauthExchange.redeem(dto.code);
    if (userId === undefined) {
      throw new UnauthorizedException();
    }
    const tokens = await this.authService.loginById(userId);
    await this.startSession(userId, req, res);
    return tokens;
  }

  /** Opens a session for a user who just authenticated: the refresh cookie. */
  private async startSession(
    userId: number,
    req: Request,
    res: Response,
  ): Promise<void> {
    setRefreshCookie(req, res, await this.refreshTokens.issue(userId));
  }
}

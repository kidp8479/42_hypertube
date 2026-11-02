// HTTP entry point for the 42 and GitHub OAuth handshakes.
import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { OAuthExchangeService } from './oauth-exchange.service';
import { OAuthCallback } from './decorators/oauth-callback.decorator';
import { spaCallbackUrl } from './spa-callback-url.util';
import type { OAuthProfile } from './strategies/oauth-profile.interface';

/**
 * The browser side of the OAuth logins (ADR-0007): for each provider, the
 * route that redirects to its authorize page and the callback it sends the
 * browser back to. Both are top-level navigations, so they answer with
 * redirects, never JSON. The session itself starts at
 * `POST /auth/oauth/exchange` ({@link AuthController.exchange}), where the
 * SPA trades the code this controller hands it.
 */
@ApiTags('auth')
@Controller('auth')
export class OAuthLoginController {
  constructor(
    private readonly authService: AuthService,
    private readonly oauthExchange: OAuthExchangeService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Starts the 42 OAuth handshake: the browser navigates here (a link,
   * not a fetch) and is redirected (302) to 42's authorize page, with a
   * fresh `state` bound to it by {@link CookieStateStore}.
   */
  @ApiExcludeEndpoint()
  @Public()
  @UseGuards(AuthGuard('42'))
  @Get('42/login')
  loginWith42() {
    // Passport intercepts here and redirects to 42's authorize page -
    // this body never runs.
  }

  /**
   * Where 42 sends the browser back after consent. Redirects (302) to the
   * SPA's `/oauth/callback` with a single-use exchange code on success, or
   * with `?error=` on any failure (see {@link OAuthCallbackFilter}) - never
   * a JSON error, since this is a top-level navigation.
   */
  // `req.user` is whatever FortyTwoStrategy.validate() returned - Passport
  // types it as the generic Express.User, so the cast trusts that guard
  // chain rather than proving it to the compiler.
  @OAuthCallback('42')
  async fortyTwoCallback(@Req() req: Request) {
    return { url: await this.spaHandoffUrl(req.user as OAuthProfile) };
  }

  /**
   * Starts the GitHub OAuth handshake: the browser navigates here (a link,
   * not a fetch) and is redirected (302) to GitHub's authorize page, with a
   * fresh `state` bound to it by {@link CookieStateStore}.
   */
  @ApiExcludeEndpoint()
  @Public()
  @UseGuards(AuthGuard('github'))
  @Get('github/login')
  loginWithGithub() {
    // Passport intercepts here and redirects to GitHub's authorize page -
    // this body never runs.
  }

  /**
   * GitHub's counterpart of {@link OAuthLoginController.fortyTwoCallback},
   * plus one failure of its own: an account with no verified primary email
   * ends on `?error=email_unverified`.
   */
  // `req.user` is whatever GithubStrategy.validate() returned - see the
  // 42 callback above for why the cast, not a type check, is what backs
  // this.
  @OAuthCallback('github')
  async githubCallback(@Req() req: Request) {
    return { url: await this.spaHandoffUrl(req.user as OAuthProfile) };
  }

  /**
   * Where the browser goes after a successful OAuth callback: the SPA's
   * `/oauth/callback` page with a single-use exchange code, never the JWT
   * (it would land in browser history and access logs, ADR-0007). The SPA
   * trades the code for the token with a normal fetch.
   */
  private async spaHandoffUrl(profile: OAuthProfile): Promise<string> {
    const user = await this.authService.resolveOAuthUser(profile);
    return spaCallbackUrl(
      this.configService.getOrThrow<string>('FRONTEND_ORIGIN'),
      { code: this.oauthExchange.issue(user.id) },
    );
  }
}

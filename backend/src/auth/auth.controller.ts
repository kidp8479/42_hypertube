// HTTP entry point for the login flow.
import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
  Redirect,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { OAuthExchangeService } from './oauth-exchange.service';
import { Public } from './decorators/public.decorator';
import { scaledThrottleLimit } from '../config/throttle.config';
import { LoginDto } from './dto/login.dto';
import { Get, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import type { OAuthProfile } from './strategies/oauth-profile.interface';

/**
 * Public authentication routes: email/password login, plus the 42 and
 * GitHub OAuth handshakes (register / reset / logout to follow). All
 * credential logic lives in {@link AuthService}.
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly oauthExchange: OAuthExchangeService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Exchanges email + password for a JWT access token. Answers 200 (not
   * the POST default 201 - nothing is created).
   *
   * @throws {UnauthorizedException} 401 on any bad credential, with no
   * hint about which part failed (wrong password and unknown email are
   * indistinguishable, see {@link AuthService.validateUser}).
   */
  // Brute-force ceiling: 5 attempts per minute per IP, well below what a
  // human login needs and far under an automated guessing rate.
  @Public()
  @Throttle({ default: { limit: scaledThrottleLimit(5), ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    if (!user) {
      throw new UnauthorizedException();
    }
    return this.authService.login(user);
  }

  @Public()
  @UseGuards(AuthGuard('42'))
  @Get('42/login')
  loginWith42() {
    // Passport intercepts here and redirects to 42's authorize page -
    // this body never runs.
  }

  // `req.user` is whatever FortyTwoStrategy.validate() returned - Passport
  // types it as the generic Express.User, so the cast trusts that guard
  // chain rather than proving it to the compiler.
  @Public()
  @UseGuards(AuthGuard('42'))
  @Redirect()
  @Get('42/callback')
  async fortyTwoCallback(@Req() req: Request) {
    return { url: await this.spaHandoffUrl(req.user as OAuthProfile) };
  }

  @Public()
  @UseGuards(AuthGuard('github'))
  @Get('github/login')
  loginWithGithub() {
    // Passport intercepts here and redirects to GitHub's authorize page -
    // this body never runs.
  }

  // `req.user` is whatever GithubStrategy.validate() returned - see the
  // 42 callback above for why the cast, not a type check, is what backs
  // this.
  @Public()
  @UseGuards(AuthGuard('github'))
  @Redirect()
  @Get('github/callback')
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
    const url = new URL(
      '/oauth/callback',
      this.configService.getOrThrow<string>('FRONTEND_ORIGIN'),
    );
    url.searchParams.set('code', this.oauthExchange.issue(user.id));
    return url.toString();
  }
}

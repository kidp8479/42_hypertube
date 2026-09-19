// HTTP entry point for the login flow.
import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { Get, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

/**
 * Public authentication routes: email/password login, plus the 42 OAuth
 * handshake (register / reset / logout / GitHub strategy to follow).
 * All credential logic lives in {@link AuthService}.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
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

  // Temporary: hands back the raw 42 profile so the OAuth round-trip can
  // be verified end to end. Will become a real login (JWT issuance via
  // the find-or-create/link logic) once that lands.
  @Public()
  @UseGuards(AuthGuard('42'))
  @Get('42/callback')
  fortyTwoCallback(@Req() req: Request) {
    return req.user;
  }
}

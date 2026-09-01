import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

/**
 * Public authentication routes (login for now; register / reset / logout
 * to follow). All credential logic lives in {@link AuthService}.
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
}

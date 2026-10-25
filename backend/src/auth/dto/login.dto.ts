// Validated input shape for the login endpoint.
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Trim } from '../../common/decorators/trim.decorator';

/**
 * Credentials accepted at `POST /auth/login`.
 *
 * `identifier` is a username or an email (subject III.1 asks for the
 * username), see `UsersService.findForLogin`.
 *
 * No length/complexity rules on `password` beyond a size cap: the login
 * form must accept whatever a legacy account was created with, and any
 * policy hint here would only help an attacker.
 */
export class LoginDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  readonly identifier!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly password!: string;
}

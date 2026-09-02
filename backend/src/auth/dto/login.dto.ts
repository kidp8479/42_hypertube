import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { NormalizeEmail } from '../../common/decorators/normalize-email.decorator';

/**
 * Credentials accepted at `POST /auth/login`.
 *
 * No length/complexity rules on `password` beyond a size cap: the login
 * form must accept whatever a legacy account was created with, and any
 * policy hint here would only help an attacker.
 */
export class LoginDto {
  @NormalizeEmail()
  @IsEmail()
  @MaxLength(255)
  readonly email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly password!: string;
}

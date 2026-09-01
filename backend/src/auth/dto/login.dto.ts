import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * Credentials accepted at `POST /auth/login`.
 *
 * No length/complexity rules on `password` beyond a size cap: the login
 * form must accept whatever a legacy account was created with, and any
 * policy hint here would only help an attacker.
 */
export class LoginDto {
  // Same normalisation as CreateUserDto so the lookup is case-insensitive
  // (Foo@X.com logs in against the row stored as foo@x.com).
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(255)
  readonly email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly password!: string;
}

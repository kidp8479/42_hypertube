// Validated input shape for the OAuth code exchange endpoint.
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * The single-use code a browser got in the OAuth callback redirect, sent
 * to `POST /auth/oauth/exchange` to receive the access token.
 */
export class ExchangeCodeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly code!: string;
}

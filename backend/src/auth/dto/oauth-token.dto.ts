// Validated input shape for the client-credentials token endpoint.
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Payload of `POST /oauth/token`, JSON or form-encoded. The field names are
 * the subject's (`client`, `secret`); `grant_type` is optional and, when
 * sent, must be the OAuth2 client-credentials grant (RFC 6749 §4.4).
 */
export class OAuthTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  readonly client!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  readonly secret!: string;

  @IsOptional()
  @IsIn(['client_credentials'])
  readonly grant_type?: 'client_credentials';
}

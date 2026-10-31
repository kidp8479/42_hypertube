// Response shape of the client-credentials token endpoint.
/**
 * What `POST /oauth/token` answers, as RFC 6749 §5.1 shapes it: the JWT,
 * its type, and its lifetime in seconds. No refresh token: the client asks
 * again with its secret.
 */
export class OAuthTokenResponseDto {
  readonly access_token!: string;
  readonly token_type!: 'Bearer';
  readonly expires_in!: number;
}

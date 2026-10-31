// Response shape of the routes that hand out an access token.
/**
 * What `POST /auth/login`, `/auth/refresh` and `/auth/oauth/exchange`
 * answer: the JWT to send as `Authorization: Bearer`. The refresh token is
 * never in the body, only in its HttpOnly cookie (ADR-0011).
 */
export class AccessTokenDto {
  readonly access_token!: string;
}

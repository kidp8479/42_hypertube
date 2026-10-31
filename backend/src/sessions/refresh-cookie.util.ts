import type { Request, Response } from 'express';
import {
  authCookiePath,
  isSecureRequest,
  readCookie,
} from '../common/utils/cookie.util';
import type { IssuedRefreshToken } from './refresh-token.service';

/** Name of the cookie that carries the refresh token. */
export const REFRESH_COOKIE = 'refresh_token';

/**
 * Hands the browser its refresh token. `HttpOnly` so no script can read it,
 * `SameSite=Strict` so it is never sent on a cross-site request (it is an
 * ambient credential, and this is the main answer to forging a refresh from
 * another site), and scoped to the auth routes so it does not ride along on
 * every API call. It expires with the token it carries.
 */
export function setRefreshCookie(
  req: Request,
  res: Response,
  issued: IssuedRefreshToken,
): void {
  res.cookie(REFRESH_COOKIE, issued.secret, {
    httpOnly: true,
    sameSite: 'strict',
    path: authCookiePath(req),
    expires: issued.expiresAt,
    secure: isSecureRequest(req),
  });
}

/** Expires the cookie, with the same Path as at creation or the browser keeps it. */
export function clearRefreshCookie(req: Request, res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { path: authCookiePath(req) });
}

/** The refresh token the browser sent, if any. */
export function readRefreshCookie(req: Request): string | undefined {
  return readCookie(req.headers.cookie, REFRESH_COOKIE);
}

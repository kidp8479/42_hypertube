import type { Request } from 'express';
import { forwardedPrefix } from './forwarded-prefix.util';

const AUTH_PATH = '/auth';

/**
 * Reads one cookie from a `Cookie` header by hand: the app sets two cookies,
 * so a `cookie-parser` dependency and middleware would be more than needed.
 * The name must match exactly (`a` does not match `a_old`).
 */
export function readCookie(
  header: string | undefined,
  name: string,
): string | undefined {
  return header
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

/**
 * Path the browser sees for the auth routes, which is what a cookie's Path is
 * matched against: `/auth` when the backend is reached directly, `/api/auth`
 * behind the edge proxy (ADR-0009), which strips `/api` before Nest sees the
 * request. Both auth cookies (the OAuth state and the refresh token) use it.
 */
export function authCookiePath(req: Request): string {
  return `${forwardedPrefix(req)}${AUTH_PATH}`;
}

/**
 * Whether an auth cookie must carry `Secure`: always in production, and in dev
 * whenever the request reached the backend over HTTPS (`req.secure`, which
 * `trust proxy` derives from X-Forwarded-Proto, ADR-0009).
 */
export function isSecureRequest(req: Request): boolean {
  return process.env.NODE_ENV === 'production' || req.secure === true;
}

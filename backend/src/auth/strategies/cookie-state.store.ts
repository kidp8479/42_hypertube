// Cookie-bound OAuth `state` store, against login CSRF on 42 and GitHub.
import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';

/** Name of the nonce cookie, exported so the specs set the same one. */
export const OAUTH_STATE_COOKIE = 'oauth_state';

type StoreCallback = (err: Error | null, state?: string) => void;
type VerifyCallback = (
  err: Error | null,
  ok: boolean,
  info?: { message: string },
) => void;

const STATE_COOKIE_PATH = '/auth';
// The edge proxy serves the API under a prefix it strips (`/api`) and says so
// in X-Forwarded-Prefix. Only a plain path is trusted: the value ends up in a
// Set-Cookie header.
const FORWARDED_PREFIX = /^(\/[A-Za-z0-9_-]+)+$/;
// Long enough for a user to sign in and consent at the provider, short
// enough that an abandoned handshake does not leave a live nonce around.
const STATE_COOKIE_MAX_AGE_MS = 10 * 60 * 1000;

const readCookie = (header: string | undefined, name: string) =>
  header
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);

/**
 * Path the browser sees for the auth routes, which is what a cookie's Path
 * is matched against: `/auth` when the backend is reached directly,
 * `/api/auth` behind the edge proxy (ADR-0009), which strips the `/api`
 * prefix before the request reaches Nest.
 */
export function stateCookiePath(req: Request): string {
  const prefix = req.headers['x-forwarded-prefix'];
  const trusted = typeof prefix === 'string' && FORWARDED_PREFIX.test(prefix);
  return `${trusted ? prefix : ''}${STATE_COOKIE_PATH}`;
}

/**
 * Expires the nonce cookie, with the same Path as at creation or the
 * browser keeps it. Also used by the OAuth callback filter: on a declined
 * consent passport-oauth2 fails the request before `verify()` runs, so the
 * nonce would otherwise stay live until it expires.
 */
export function clearStateCookie(req: Request, res: Response): void {
  res.clearCookie(OAUTH_STATE_COOKIE, { path: stateCookiePath(req) });
}

// timingSafeEqual throws on buffers of different lengths, so length is
// compared first; it is not secret, the nonce size is fixed.
const sameValue = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * OAuth `state` store for `passport-oauth2` that binds the handshake to the
 * browser that started it, without a server-side session (the app is
 * stateless JWT). `store()` sets a random nonce in a short-lived cookie and
 * sends the same value as `state`; the callback accepts only when both
 * match, so a callback URL replayed in another browser is rejected (login
 * CSRF, see ADR-0007). A signed `state` alone would not do it: the attacker
 * could fetch one from our own `/login` and replay it.
 */
export class CookieStateStore {
  // The two overloads mirror passport-oauth2's `StateStore` type. At runtime
  // Passport picks ONE call shape from `store.length` (3 here, so it passes
  // `meta`); the form without `meta` only exists to satisfy the type.
  store(req: Request, callback: StoreCallback): void;
  store(req: Request, meta: unknown, callback: StoreCallback): void;
  store(
    req: Request,
    metaOrCallback: unknown,
    maybeCallback?: StoreCallback,
  ): void {
    const callback = (maybeCallback ?? metaOrCallback) as StoreCallback;
    if (!req.res) {
      callback(new Error('OAuth state store needs the Express response'));
      return;
    }
    const nonce = randomBytes(24).toString('base64url');
    // SameSite=Lax because the callback is a top-level GET from the
    // provider, which Lax still sends. The Path keeps it off other routes.
    req.res.cookie(OAUTH_STATE_COOKIE, nonce, {
      httpOnly: true,
      sameSite: 'lax',
      path: stateCookiePath(req),
      maxAge: STATE_COOKIE_MAX_AGE_MS,
      // Secure needs HTTPS: always in production, and in dev whenever the
      // request came through the TLS proxy (req.secure, via `trust proxy`).
      secure: process.env.NODE_ENV === 'production' || req.secure === true,
    });
    callback(null, nonce);
  }

  /**
   * Accepts the callback only when its `state` equals the nonce cookie set
   * by `store()`. The cookie is cleared on every call, pass or fail: a
   * nonce is single-use, and a failed attempt must not leave a live one.
   * A `false` here makes Passport fail the request (it reports 403, but
   * Nest's AuthGuard turns any failure into a 401), so a rejected callback
   * never reaches `validate()`.
   */
  verify(
    req: Request,
    providedState: string | undefined,
    callback: VerifyCallback,
  ): void;
  verify(
    req: Request,
    providedState: string | undefined,
    meta: unknown,
    callback: VerifyCallback,
  ): void;
  verify(
    req: Request,
    providedState: string | undefined,
    metaOrCallback: unknown,
    maybeCallback?: VerifyCallback,
  ): void {
    const callback = (maybeCallback ?? metaOrCallback) as VerifyCallback;
    const expected = readCookie(req.headers.cookie, OAUTH_STATE_COOKIE);
    if (req.res) {
      clearStateCookie(req, req.res);
    }
    if (!expected || !providedState || !sameValue(expected, providedState)) {
      callback(null, false, {
        message: 'Invalid authorization request state.',
      });
      return;
    }
    callback(null, true);
  }
}

// The single fetch wrapper every API call in the app goes through, and the
// access-token refresh it falls back on when a request answers 401.
import { getAuthToken, removeAuthToken, setAuthToken } from './token';

/** Where the backend is reached from the browser: the dev proxy (vite.config.ts) strips it. */
export const API_BASE = '/api';

const UNAUTHORIZED = 401;
const NO_CONTENT = 204;

/** A non-ok `fetch` response, surfaced with its status so callers can branch on it (401 -> logout, 403 -> ownership, ...). */
export class ApiError extends Error {
  status: number;

  constructor(status: number, message?: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

// The refresh in flight, shared by every caller: two requests that 401 at
// once must not each rotate the cookie (the second would present a token the
// first just consumed).
let pendingRefresh: Promise<string | null> | null = null;

/**
 * Trades the refresh cookie for a new access token (`POST /auth/refresh`,
 * ADR-0011). Resolves to the token to use from now on, or `null` when there
 * is no session: 204 with no cookie, 401 for a dead one. Throws on a network
 * failure or a 5xx, which do not end the session.
 *
 * Whoever changes the token while the call is in flight (a login, a logout)
 * wins: the answer is only stored, or the token only dropped, when the token
 * is still the one the refresh started from.
 */
async function requestRefresh(): Promise<string | null> {
  const startedWith = getAuthToken();
  const response = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST' });
  if (response.status === UNAUTHORIZED || response.status === NO_CONTENT) {
    if (getAuthToken() === startedWith) {
      removeAuthToken();
    }
    return getAuthToken();
  }
  if (!response.ok) {
    throw new ApiError(response.status);
  }
  const { access_token } = (await response.json()) as { access_token: string };
  // Checked after the body is read: a logout can land during that await too.
  if (getAuthToken() === startedWith) {
    setAuthToken(access_token);
  }
  return getAuthToken();
}

/** Single-flight {@link requestRefresh}: callers that arrive while one is in flight share its result. */
export function refreshAccessToken(): Promise<string | null> {
  pendingRefresh ??= requestRefresh().finally(() => {
    pendingRefresh = null;
  });
  return pendingRefresh;
}

/**
 * Resolves once no refresh is in flight. A login or a logout waits for it: a
 * refresh that fails answers by clearing the cookie, and landing after the
 * login's `Set-Cookie` it would wipe the new session's cookie.
 */
export async function refreshSettled(): Promise<void> {
  await pendingRefresh?.catch(() => undefined);
}

/**
 * The token to retry a request with after it got a 401 with `rejected`, or
 * `null` to give up. When the token changed since the request left (a
 * refresh or a login landed meanwhile), the 401 is about a token already
 * replaced: retry with the current one rather than refreshing again.
 */
function tokenAfterRejection(rejected: string): Promise<string | null> {
  const current = getAuthToken();
  return current === rejected ? refreshAccessToken() : Promise.resolve(current);
}

function send(
  path: string,
  init: RequestInit | undefined,
  token: string | null,
) {
  // Build on a real `Headers` so a caller passing a `Headers` instance or a
  // tuple array is preserved (object spread would drop those). Only claim a
  // JSON content type for a string body - a `FormData` body must keep the
  // browser-generated multipart boundary.
  const headers = new Headers(init?.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (typeof init?.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(`${API_BASE}${path}`, { ...init, headers });
}

/**
 * Talks to the backend through the dev proxy (`/api` prefix injected here),
 * attaching the current bearer token and JSON headers automatically so call
 * sites only ever pass a backend-relative path.
 *
 * A 401 on a request that carried a token is retried once with a renewed
 * token (see {@link tokenAfterRejection}). The auth routes are never retried:
 * their 401 is the answer itself (bad credentials, a dead cookie).
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T | undefined> {
  const sentWith = getAuthToken();
  let response = await send(path, init, sentWith);
  if (
    response.status === UNAUTHORIZED &&
    sentWith &&
    !path.startsWith('/auth/')
  ) {
    const renewed = await tokenAfterRejection(sentWith);
    if (renewed) {
      response = await send(path, init, renewed);
    }
  }
  if (!response.ok) {
    throw new ApiError(response.status);
  }

  // A 204, or any 2xx with an empty body (logout, DELETE ...), has nothing to
  // parse - calling response.json() on it would throw a raw SyntaxError that
  // bypasses ApiError and the 401 safety net.
  const rawBody = await response.text();
  if (!rawBody) {
    return undefined;
  }

  return JSON.parse(rawBody) as T;
}

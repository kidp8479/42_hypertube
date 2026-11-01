// The single fetch wrapper every API call in the app goes through, and the
// access-token refresh it runs ahead of expiry, or falls back on when a
// request answers 401.
import { getAuthToken, removeAuthToken, setAuthToken } from './token';

/** Where the backend is reached from the browser: the dev proxy (vite.config.ts) strips it. */
export const API_BASE = '/api';

export const UNAUTHORIZED = 401;
const NO_CONTENT = 204;
const BAD_GATEWAY = 502;

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

/** How long before its `exp` a token is renewed instead of sent. */
const EXPIRY_MARGIN_MS = 30_000;

/**
 * Whether `token` expires within {@link EXPIRY_MARGIN_MS}, read from its
 * payload. The signature is the backend's business: this only decides when
 * to renew. A token that does not decode is left to the 401 path.
 */
function expiresSoon(token: string): boolean {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(payload)) as { exp?: unknown };
    return (
      typeof exp === 'number' && exp * 1000 - Date.now() < EXPIRY_MARGIN_MS
    );
  } catch {
    return false;
  }
}

/**
 * The token to send on `path`: the current one, renewed first when it is
 * about to expire. Sending an expired token would get a 401, which the
 * browser prints in the console whatever the code does with it. A failed
 * early refresh (network, 5xx) sends the current token anyway.
 */
async function tokenFor(path: string): Promise<string | null> {
  const token = getAuthToken();
  if (!token || path.startsWith('/auth/') || !expiresSoon(token)) {
    return token;
  }
  return refreshAccessToken().catch(() => getAuthToken());
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
 * A token about to expire is renewed before the request leaves
 * ({@link tokenFor}). A 401 on a request that carried a token is still
 * retried once with a renewed token (a clock off, a token revoked). When the token changed since the request left (a refresh or a
 * login landed meanwhile), the 401 is about a token already replaced: it
 * retries with the current one rather than refreshing again. The auth
 * routes are never retried: their 401 is the answer itself (bad
 * credentials, a dead cookie).
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T | undefined> {
  const sentWith = await tokenFor(path);
  let response = await send(path, init, sentWith);
  if (
    response.status === UNAUTHORIZED &&
    sentWith &&
    !path.startsWith('/auth/')
  ) {
    const current = getAuthToken();
    const renewed = current === sentWith ? await refreshAccessToken() : current;
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

  // A 2xx that is not JSON did not come from the backend (an HTML page from
  // a proxy in between): a bad gateway, so callers get an ApiError and show
  // their generic message instead of a raw SyntaxError.
  try {
    return JSON.parse(rawBody) as T;
  } catch {
    throw new ApiError(BAD_GATEWAY, 'Response is not JSON');
  }
}

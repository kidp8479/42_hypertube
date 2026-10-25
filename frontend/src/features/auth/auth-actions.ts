// Auth actions with real side effects (network, token, query cache),
// kept out of authReducer so it stays a pure state transition.
import { ApiError, apiFetch, refreshSettled } from '../../lib/api';
import { setAuthToken, removeAuthToken } from '../../lib/token';
import { queryClient } from '../../lib/query-client';
import type { SupportedLanguage } from '../../lib/languages';
import type { RegisterValues } from './auth-validation';

interface LoginResponse {
  access_token: string;
}

/**
 * POSTs to an endpoint that answers `{ access_token }` and stores the token.
 * Waits for an in-flight refresh first (see `refreshSettled`), so a startup
 * refresh that fails cannot clear the cookie this sign-in sets.
 */
async function requestToken(path: string, body: object): Promise<void> {
  await refreshSettled();
  const response = await apiFetch<LoginResponse>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!response) {
    throw new Error('Login response was empty');
  }
  setAuthToken(response.access_token);
}

/**
 * Exchanges credentials for a token and stores it; rejects with ApiError on
 * bad credentials (401). `identifier` is a username or an email.
 */
export function loginRequest(
  identifier: string,
  password: string,
): Promise<void> {
  return requestToken('/auth/login', { identifier, password });
}

/**
 * The exchange's own 401 (unknown, already used or expired code), kept apart
 * from a 401 on the `/users/me` call that follows it: only this one means
 * "start the sign-in again".
 */
export class OAuthCodeRejectedError extends Error {
  constructor() {
    super('OAuth exchange code rejected');
    this.name = 'OAuthCodeRejectedError';
  }
}

/**
 * Trades the single-use code the OAuth callback redirect handed the SPA for
 * a token, and stores it (ADR-0007). Rejects with OAuthCodeRejectedError when
 * the backend refuses the code.
 */
export async function exchangeOAuthCode(code: string): Promise<void> {
  try {
    await requestToken('/auth/oauth/exchange', { code });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      throw new OAuthCodeRejectedError();
    }
    throw error;
  }
}

/**
 * Tells the backend the user is signing out (`POST /auth/logout`, ADR-0011):
 * it revokes the session the refresh cookie belongs to and clears the cookie.
 * The cookie is the only credential it needs. Sent once any refresh in
 * flight has settled, so it revokes the cookie that refresh may rotate in.
 */
export async function logoutRequest(): Promise<void> {
  await refreshSettled();
  await apiFetch('/auth/logout', { method: 'POST' });
}

/** Clears the token and every cached query, so no stale data from this session survives into the next. */
export function logoutLocal(): void {
  removeAuthToken();
  queryClient.clear();
}

/**
 * Creates the account (`POST /users`). Deliberately does not store a
 * token or log the user in - the subject and HYP-46 both call for a
 * fresh account to land on `/login`, not be signed in silently.
 *
 * `language` is the UI language at submit time. Without it the account is
 * created as English, and the first login would flip a French visitor back
 * to English (the account language wins over the browser's).
 */
export async function registerRequest(
  values: RegisterValues,
  language: SupportedLanguage,
): Promise<void> {
  // Send exactly what validateRegister checked - untrimmed values here would
  // let e.g. a 100-char name plus a stray space pass the client check
  // (which trims) and then fail the backend's @Length(1, 100) (which
  // doesn't), surfacing as a misleading generic error.
  await apiFetch('/users', {
    method: 'POST',
    body: JSON.stringify({
      email: values.email.trim(),
      password: values.password,
      username: values.username.trim(),
      lastName: values.lastName.trim(),
      firstName: values.firstName.trim(),
      preferredLanguage: language,
    }),
  });
}

// Auth actions with real side effects (network + localStorage/cache),
// kept out of authReducer so it stays a pure state transition.
import { ApiError, apiFetch } from '../../lib/api';
import { setAuthToken, removeAuthToken } from '../../lib/token';
import { queryClient } from '../../lib/query-client';
import type { RegisterValues } from './auth-validation';

interface LoginResponse {
  access_token: string;
}

/** POSTs to an endpoint that answers `{ access_token }` and stores the token. */
async function requestToken(path: string, body: object): Promise<void> {
  const response = await apiFetch<LoginResponse>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!response) {
    throw new Error('Login response was empty');
  }
  setAuthToken(response.access_token);
}

/** Exchanges credentials for a token and stores it; rejects with ApiError on bad credentials (401). */
export function loginRequest(email: string, password: string): Promise<void> {
  return requestToken('/auth/login', { email, password });
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

/** Clears the token and every cached query, so no stale data from this session survives into the next. */
export function logoutLocal(): void {
  removeAuthToken();
  queryClient.clear();
}

/**
 * Creates the account (`POST /users`). Deliberately does not store a
 * token or log the user in - the subject and HYP-46 both call for a
 * fresh account to land on `/login`, not be signed in silently.
 */
export async function registerRequest(values: RegisterValues): Promise<void> {
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
    }),
  });
}

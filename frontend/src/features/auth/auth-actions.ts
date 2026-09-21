// Auth actions with real side effects (network + localStorage/cache),
// kept out of authReducer so it stays a pure state transition.
import { apiFetch } from '../../lib/api';
import { setAuthToken, removeAuthToken } from '../../lib/token';
import { queryClient } from '../../lib/query-client';
import type { RegisterValues } from './auth-validation';

interface LoginResponse {
  access_token: string;
}

/** Exchanges credentials for a token and stores it; rejects with ApiError on bad credentials (401). */
export async function loginRequest(
  email: string,
  password: string,
): Promise<void> {
  const response = await apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (!response) {
    throw new Error('Login response was empty');
  }
  setAuthToken(response.access_token);
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

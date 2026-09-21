// Auth actions with real side effects (network + localStorage/cache),
// kept out of authReducer so it stays a pure state transition.
import { apiFetch } from '../../lib/api';
import { setAuthToken, removeAuthToken } from '../../lib/token';
import { queryClient } from '../../lib/query-client';

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

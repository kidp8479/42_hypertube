// The startup identity check: restores the session from the refresh cookie
// and loads the `/users/me` profile into the query cache.
import { ApiError, apiFetch, refreshAccessToken } from '../../lib/api';
import { queryClient } from '../../lib/query-client';
import { getAuthToken } from '../../lib/token';
import type { User } from './auth-types';

const MAX_BOOTSTRAP_RETRIES = 2;

/**
 * A 4xx is a real answer: retrying it only delays the redirect to /login (a
 * missing or dead session already resolves to `null`, with no error). A
 * network drop or a 5xx is transient and worth a couple of retries, so a
 * cold backend doesn't look like a logout.
 */
export function retryBootstrap(failureCount: number, error: unknown) {
  const transient = !(error instanceof ApiError) || error.status >= 500;
  return transient && failureCount < MAX_BOOTSTRAP_RETRIES;
}

/**
 * Bootstrap: on load the access token is gone (it lives in memory), so the
 * refresh cookie trades for a new one, then `GET /users/me` loads the
 * profile. Resolves to `null` when there is no session to restore, and
 * rejects once the retries on a transient failure run out.
 *
 * A retry after the refresh succeeded reuses its token instead of rotating
 * the cookie again. Run through `queryClient.query` for its retries.
 */
export function restoreSession(): Promise<User | null> {
  return queryClient.query({
    queryKey: ['me'],
    queryFn: async () => {
      const token = getAuthToken() ?? (await refreshAccessToken());
      return token ? ((await apiFetch<User>('/users/me')) ?? null) : null;
    },
    retry: retryBootstrap,
  });
}

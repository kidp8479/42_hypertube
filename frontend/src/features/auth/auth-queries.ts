// TanStack Query hook wrapping the /users/me identity check.
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiFetch } from '../../lib/api';
import { getAuthToken } from '../../lib/token';
import type { User } from './auth-types';

const MAX_BOOTSTRAP_RETRIES = 2;

// A 4xx (a 401 on an expired token above all) is a real answer - retrying it
// only delays the redirect to /login. A network drop or a 5xx is transient
// and worth a couple of retries so a cold backend doesn't look like a logout.
function retryBootstrap(failureCount: number, error: unknown) {
  const transient = !(error instanceof ApiError) || error.status >= 500;
  return transient && failureCount < MAX_BOOTSTRAP_RETRIES;
}

/**
 * Bootstrap identity check: skipped entirely (`enabled: false`) when there's
 * no stored token, and never retried on failure.
 *
 * Fetched once, on load. After that AuthProvider owns the identity - it seeds
 * this cache entry on login, clears it on logout, and the global 401 net
 * covers expiry - so every background refetch is disabled; otherwise the hook
 * would re-hit `/users/me` on every window focus and remount.
 */
export function useMeQuery() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => apiFetch<User>('/users/me'),
    enabled: Boolean(getAuthToken()),
    retry: retryBootstrap,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

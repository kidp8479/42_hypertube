// TanStack Query hook wrapping the /users/me identity check.
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { getAuthToken } from '../../lib/token';
import type { User } from './auth-types';

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
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

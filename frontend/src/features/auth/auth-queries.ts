// TanStack Query hook wrapping the /users/me identity check.
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { getAuthToken } from '../../lib/token';
import type { User } from './auth-types';

/** Bootstrap identity check: skipped entirely (`enabled: false`) when there's no stored token, and never retried on failure. */
export function useMeQuery() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => apiFetch<User>('/users/me'),
    enabled: Boolean(getAuthToken()),
    retry: false,
  });
}

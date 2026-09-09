// TanStack Query config: the singleton client every query/mutation in the
// app shares, plus the global 401 -> logout safety net.
import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

const UNAUTHORIZED = 401;

// Registrable indirection so this module never has to import AuthProvider
// (which itself imports `queryClient`) - avoids a circular dependency.
let onUnauthorized: (() => void) | null = null;

/** Registers (or clears, with `null`) the callback run on a 401 from any query/mutation - AuthProvider owns it. */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

// The 401 net has to sit on both caches: `QueryCache.onError` never sees a
// mutation's failure, so a 401 from `useMutation` (register, comments, ...)
// would otherwise slip past.
function routeUnauthorized(error: unknown) {
  if (error instanceof ApiError && error.status === UNAUTHORIZED) {
    onUnauthorized?.();
  }
}

/** App-wide singleton client; a 401 from any query or mutation triggers the registered unauthorized handler. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
  queryCache: new QueryCache({ onError: routeUnauthorized }),
  mutationCache: new MutationCache({ onError: routeUnauthorized }),
});

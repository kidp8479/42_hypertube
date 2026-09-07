// TanStack Query config: the singleton client every query/mutation in the
// app shares, plus the global 401 -> logout safety net.
import { QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

const UNAUTHORIZED = 401;

// Registrable indirection so this module never has to import AuthProvider
// (which itself imports `queryClient`) - avoids a circular dependency.
let onUnauthorized: (() => void) | null = null;

/** Registers (or clears, with `null`) the callback run on a 401 from any query/mutation - AuthProvider owns it. */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

/** App-wide singleton client; a 401 anywhere triggers the registered unauthorized handler. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof ApiError && error.status === UNAUTHORIZED) {
        onUnauthorized?.();
      }
    },
  }),
});

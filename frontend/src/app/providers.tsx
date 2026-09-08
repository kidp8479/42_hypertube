// Every app-wide provider in one place, in the order the app needs them:
// the Query client outermost (AuthProvider and useMeQuery both depend on it),
// then auth state, then the router.
import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { queryClient } from '../lib/query-client';
import { AuthProvider } from '../features/auth/auth-provider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>{children}</BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

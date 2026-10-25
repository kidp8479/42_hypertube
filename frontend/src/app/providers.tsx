// Every app-wide provider in one place, in the order the app needs them:
// the Query client outermost (every page's queries need it, and AuthProvider's
// bootstrap runs on the same client),
// then auth state, then the router.
import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { queryClient } from '../lib/query-client';
import { AuthProvider } from '../features/auth/auth-provider';

/** Wraps the app in the shared providers, in the order described above. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>{children}</BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

// The React.Context "pipe" that lets any component read auth state without
// prop-drilling it down from the app root.
import { createContext, useContext } from 'react';
import type { AuthState } from './auth-reducer';

/** What `useAuth()` hands out - AuthProvider is the only place that constructs one. */
export interface AuthContextValue {
  state: AuthState;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

/** Throws instead of returning `undefined` so a missing `<AuthProvider>` fails loudly at the call site, not with a silent `undefined.state`. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

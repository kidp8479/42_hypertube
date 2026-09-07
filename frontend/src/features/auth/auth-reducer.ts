// The auth state machine: the 3 states an account can be in, the events
// that move between them, and the pure transition function itself.
import type { User } from './types';

/** `status` starts at `'loading'` until the `/users/me` bootstrap check settles - never assume `'anonymous'` by default. */
export interface AuthState {
  status: 'loading' | 'authenticated' | 'anonymous';
  user: User | null;
}

/**
 * Every event `authReducer` knows how to handle. `bootstrap-*`, `session-expired`
 * and `logout` all resolve to the same anonymous state - they're kept distinct
 * as events (not state) so a future feature (e.g. a "session expired" toast)
 * can react to the cause without changing `AuthState`'s shape.
 */
export type AuthAction =
  | { type: 'bootstrap-success'; user: User }
  | { type: 'bootstrap-anonymous' }
  | { type: 'session-expired' }
  | { type: 'logout' };

/** Pure state transition for `useReducer` - no side effects, no localStorage/network access (those live in auth-actions). */
export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'bootstrap-success':
      return { status: 'authenticated', user: action.user };
    case 'bootstrap-anonymous':
      return { status: 'anonymous', user: null };
    case 'session-expired':
      return { status: 'anonymous', user: null };
    case 'logout':
      return { status: 'anonymous', user: null };
    default:
      return state;
  }
}

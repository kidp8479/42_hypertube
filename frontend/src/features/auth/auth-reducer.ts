// The auth state machine: the 3 states an account can be in, the events
// that move between them, and the pure transition function itself.
import type { User } from './auth-types';

/** `status` starts at `'loading'` until the bootstrap (refresh, then `/users/me`) settles - never assume `'anonymous'` by default. */
export interface AuthState {
  status: 'loading' | 'authenticated' | 'anonymous';
  user: User | null;
}

/**
 * Every event `authReducer` knows how to handle. Several map to the same
 * resulting state (`bootstrap-anonymous` / `session-expired` / `logout` all
 * land on anonymous; `bootstrap-success` / `login-success` both on
 * authenticated) - they're kept distinct as events so a future feature
 * (e.g. a "session expired" toast) can react to the cause without changing
 * `AuthState`'s shape.
 */
export type AuthAction =
  | { type: 'bootstrap-success'; user: User }
  | { type: 'bootstrap-anonymous' }
  | { type: 'login-success'; user: User }
  | { type: 'session-expired' }
  | { type: 'logout' };

/** Starting point before the bootstrap has settled. */
export const initialState: AuthState = { status: 'loading', user: null };

/**
 * Pure state transition for `useReducer` - no side effects, no token or
 * network access (those live in auth-actions).
 *
 * The bootstrap events only decide the initial state: once a login has moved
 * on from `'loading'`, a startup check that settles late must not override it.
 */
export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'bootstrap-success':
      return state.status === 'loading'
        ? { status: 'authenticated', user: action.user }
        : state;
    case 'bootstrap-anonymous':
      return state.status === 'loading'
        ? { status: 'anonymous', user: null }
        : state;
    case 'login-success':
      return { status: 'authenticated', user: action.user };
    case 'session-expired':
      return { status: 'anonymous', user: null };
    case 'logout':
      return { status: 'anonymous', user: null };
    default:
      return state;
  }
}

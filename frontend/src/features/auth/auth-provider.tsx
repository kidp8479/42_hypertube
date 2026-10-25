// The one component that fills the auth Context: it owns the reducer state,
// restores the session from the refresh cookie on load, wires the global
// 401 -> session-expired safety net, and exposes `login` /
// `loginWithOAuthCode` / `logout` to the rest of the app.
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import { apiFetch } from '../../lib/api';
import { queryClient, setUnauthorizedHandler } from '../../lib/query-client';
import { getAuthToken, removeAuthToken } from '../../lib/token';
import { AuthContext } from './auth-context';
import { authReducer, initialState } from './auth-reducer';
import {
  exchangeOAuthCode,
  loginRequest,
  logoutLocal,
  logoutRequest,
} from './auth-actions';
import type { User } from './auth-types';
import { restoreSession } from './auth-queries';

/**
 * The tail every sign-in shares, once a token has been stored: fetch the
 * profile with it.
 *
 * All-or-nothing: on failure the stored token is rolled back, otherwise the
 * client would hold a live token while the caller reported the sign-in as
 * failed.
 */
async function fetchSignedInUser(): Promise<User> {
  try {
    const user = await apiFetch<User>('/users/me');
    if (!user) {
      throw new Error('Signed in but /users/me returned no profile');
    }
    // The same cache entry the bootstrap fills, so a reader of ['me'] finds
    // the profile whichever way the session started.
    queryClient.setQueryData(['me'], user);
    return user;
  } catch (error) {
    removeAuthToken();
    queryClient.removeQueries({ queryKey: ['me'] });
    throw error;
  }
}

/**
 * Owns the auth state and provides it to the app through {@link AuthContext}.
 * Mount it once, above the router, inside the Query client provider.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Bootstrap: decide the INITIAL auth state. While it is in flight the state
  // stays 'loading', so the UI can show a splash instead of flashing the
  // login page on every reload. The reducer drops a bootstrap result that
  // lands after a login. StrictMode runs this twice in dev: both runs share
  // the one query and the one refresh in flight.
  useEffect(() => {
    restoreSession().then(
      (user) =>
        dispatch(
          user
            ? { type: 'bootstrap-success', user }
            : { type: 'bootstrap-anonymous' },
        ),
      () => dispatch({ type: 'bootstrap-anonymous' }),
    );
  }, []);

  // The 401 safety net: a 401 reaches here through the singleton
  // QueryClient's cache handlers once `apiFetch` could not renew the token.
  // The session is only over when no token is left: a failed refresh drops
  // it, while a 401 answered to a token already replaced (a login since)
  // leaves the new one alone. Calling the full `logout()` (which wipes the
  // query cache) from inside the cache's own error handler would re-enter
  // it, so this only flags the session expired.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (getAuthToken() === null) {
        dispatch({ type: 'session-expired' });
      }
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    await loginRequest(identifier, password);
    dispatch({ type: 'login-success', user: await fetchSignedInUser() });
  }, []);

  const loginWithOAuthCode = useCallback(async (code: string) => {
    await exchangeOAuthCode(code);
    dispatch({ type: 'login-success', user: await fetchSignedInUser() });
  }, []);

  const logout = useCallback(() => {
    // Best effort: the sign-out below must work offline, so a failure of the
    // backend call is deliberately dropped.
    logoutRequest().catch(() => undefined);
    logoutLocal();
    dispatch({ type: 'logout' });
  }, []);

  const value = useMemo(
    () => ({ state, login, loginWithOAuthCode, logout }),
    [state, login, loginWithOAuthCode, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

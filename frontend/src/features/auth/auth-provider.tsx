// The one component that fills the auth Context: it owns the reducer state,
// bootstraps identity from `/users/me` on load, wires the global 401 -> logout
// safety net, and exposes `login` / `loginWithOAuthCode` / `logout` to the
// rest of the app.
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
import { exchangeOAuthCode, loginRequest, logoutLocal } from './auth-actions';
import type { User } from './auth-types';
import { useMeQuery } from './auth-queries';

/**
 * The tail every sign-in shares, once a token has been stored: fetch the
 * profile with it. Done here rather than leaning on `useMeQuery`, because
 * that hook's `enabled` flag is read during render and would not re-run
 * just because localStorage changed.
 *
 * All-or-nothing: on failure the stored token is rolled back, otherwise a
 * reload would find the client "logged in" while the caller reported the
 * sign-in as failed.
 */
async function fetchSignedInUser(): Promise<User> {
  try {
    const user = await apiFetch<User>('/users/me');
    if (!user) {
      throw new Error('Signed in but /users/me returned no profile');
    }
    // Seed the cache so the now-token-enabled useMeQuery reuses this profile
    // instead of firing a second, identical /users/me right after login.
    queryClient.setQueryData(['me'], user);
    return user;
  } catch (error) {
    removeAuthToken();
    queryClient.removeQueries({ queryKey: ['me'] });
    throw error;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const meQuery = useMeQuery();

  // Bootstrap: decide the INITIAL auth state only. No stored token means
  // anonymous right away; otherwise wait for the `/users/me` query to settle
  // and let its result decide. While it is in flight the state stays 'loading'
  // (no branch matches), so the UI can show a splash instead of flashing the
  // login page on every reload.
  // The `status === 'loading'` guard is what makes this "initial only": once
  // login/logout/a settled bootstrap has moved us on, a later transient
  // `/users/me` failure must not knock a live session back to anonymous.
  useEffect(() => {
    if (state.status !== 'loading') {
      return;
    }
    if (!getAuthToken()) {
      dispatch({ type: 'bootstrap-anonymous' });
      return;
    }
    if (meQuery.isSuccess && meQuery.data) {
      dispatch({ type: 'bootstrap-success', user: meQuery.data });
    } else if (meQuery.isError) {
      dispatch({ type: 'bootstrap-anonymous' });
    }
  }, [state.status, meQuery.isSuccess, meQuery.isError, meQuery.data]);

  // The 401 safety net: any query/mutation that hits an expired token reaches
  // here via the singleton QueryClient's cache handler. It only clears the
  // token and flags the session expired - calling the full `logout()` (which
  // wipes the query cache) from inside the cache's own error handler would
  // re-enter it. The button-driven `logout()` owns the cache wipe.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      removeAuthToken();
      dispatch({ type: 'session-expired' });
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await loginRequest(email, password);
    dispatch({ type: 'login-success', user: await fetchSignedInUser() });
  }, []);

  const loginWithOAuthCode = useCallback(async (code: string) => {
    await exchangeOAuthCode(code);
    dispatch({ type: 'login-success', user: await fetchSignedInUser() });
  }, []);

  const logout = useCallback(() => {
    logoutLocal();
    dispatch({ type: 'logout' });
  }, []);

  const value = useMemo(
    () => ({ state, login, loginWithOAuthCode, logout }),
    [state, login, loginWithOAuthCode, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

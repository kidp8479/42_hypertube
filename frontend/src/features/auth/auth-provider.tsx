// The one component that fills the auth Context: it owns the reducer state,
// bootstraps identity from `/users/me` on load, wires the global 401 -> logout
// safety net, and exposes `login` / `logout` to the rest of the app.
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
import { loginRequest, logoutLocal } from './auth-actions';
import type { User } from './auth-types';
import { useMeQuery } from './auth-queries';

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

  // `loginRequest` stores the token; the follow-up `/users/me` (now sent with
  // that token) gives us the profile to dispatch. Doing it here rather than
  // leaning on `useMeQuery` because that hook's `enabled` flag is read during
  // render and would not re-run just because localStorage changed.
  const login = useCallback(async (email: string, password: string) => {
    await loginRequest(email, password);
    try {
      const user = await apiFetch<User>('/users/me');
      if (!user) {
        throw new Error('Signed in but /users/me returned no profile');
      }
      // Seed the cache so the now-token-enabled useMeQuery reuses this profile
      // instead of firing a second, identical /users/me right after login.
      queryClient.setQueryData(['me'], user);
      dispatch({ type: 'login-success', user });
    } catch (error) {
      // loginRequest already persisted the token; without this rollback a
      // failure here leaves the client "logged in" on the next reload while
      // this call reports failure to the form. Login is all-or-nothing.
      removeAuthToken();
      queryClient.removeQueries({ queryKey: ['me'] });
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    logoutLocal();
    dispatch({ type: 'logout' });
  }, []);

  const value = useMemo(
    () => ({ state, login, logout }),
    [state, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

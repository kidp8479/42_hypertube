// Spec for AuthProvider: bootstrap from the refresh cookie, login (password
// and OAuth code) with token rollback on failure, logout, and the 401 safety
// net, including a late bootstrap or 401 that must not end a newer session.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
// The singleton client, on purpose: the 401 -> logout net lives on its cache
// handler, so a fresh per-test client could not exercise it.
import { queryClient } from '../../lib/query-client';
import { ApiError } from '../../lib/api';
import { getAuthToken, removeAuthToken, setAuthToken } from '../../lib/token';
import { fakeUser } from '../../test/fixtures';
import { AuthProvider } from './auth-provider';
import { useAuth } from './auth-context';

// Replace only `apiFetch` and the refresh; keep the real `ApiError` class so
// `instanceof` checks in the query cache handler still match.
vi.mock('../../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/api')>()),
  apiFetch: vi.fn(),
  refreshAccessToken: vi.fn(),
}));
const { apiFetch, refreshAccessToken } = await import('../../lib/api');
const apiFetchMock = vi.mocked(apiFetch);
const refreshMock = vi.mocked(refreshAccessToken);

/** The bootstrap refresh restores a session: the token is set, as the real one does. */
function refreshRestores(token: string) {
  refreshMock.mockImplementationOnce(() => {
    setAuthToken(token);
    return Promise.resolve(token);
  });
}

function Probe() {
  const { state, login, loginWithOAuthCode, logout } = useAuth();
  // The real pages surface these rejections in their own state; the probe
  // only needs to not blow up the test with an unhandled rejection.
  const tryLogin = () => {
    login('ada@example.com', 'pw').catch(() => {});
  };
  const tryOAuth = () => {
    loginWithOAuthCode('one-time-code').catch(() => {});
  };
  return (
    <div>
      <span data-testid="status">{state.status}</span>
      <span data-testid="user">{state.user?.username ?? '-'}</span>
      <button type="button" onClick={tryLogin}>
        login
      </button>
      <button type="button" onClick={tryOAuth}>
        oauth
      </button>
      <button type="button" onClick={logout}>
        logout
      </button>
    </div>
  );
}

/** A query that fails with a 401, as one does once `apiFetch` gave up renewing. */
async function surfaceUnauthorized() {
  await act(() =>
    queryClient
      .query({
        queryKey: ['protected'],
        queryFn: () => Promise.reject(new ApiError(401)),
      })
      .catch(() => undefined),
  );
}

function renderProvider() {
  return {
    user: userEvent.setup(),
    ...render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Probe />
        </AuthProvider>
      </QueryClientProvider>,
    ),
  };
}

beforeEach(() => {
  apiFetchMock.mockReset();
  refreshMock.mockReset();
  // No refresh cookie unless a test says otherwise.
  refreshMock.mockResolvedValue(null);
});

afterEach(() => {
  queryClient.clear();
});

describe('AuthProvider', () => {
  it('settles to anonymous when the refresh finds no session', async () => {
    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('anonymous'),
    );
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it('bootstraps to authenticated when the refresh restores a session', async () => {
    refreshRestores('restored-token');
    apiFetchMock.mockResolvedValueOnce(fakeUser); // GET /users/me

    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated'),
    );
    expect(screen.getByTestId('user')).toHaveTextContent('ada');
    expect(apiFetchMock).toHaveBeenCalledWith('/users/me');
  });

  it('stays signed in when a login beats a late bootstrap', async () => {
    let finishRefresh: (token: string | null) => void = () => {};
    refreshMock.mockReturnValueOnce(
      new Promise((resolve) => {
        finishRefresh = resolve;
      }),
    );
    apiFetchMock
      .mockResolvedValueOnce({ access_token: 'fresh-token' }) // POST /auth/login
      .mockResolvedValueOnce(fakeUser); // GET /users/me

    const { user } = renderProvider();
    await user.click(screen.getByRole('button', { name: 'login' }));
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated'),
    );

    finishRefresh(null);

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    expect(getAuthToken()).toBe('fresh-token');
  });

  it('login stores the token and moves to authenticated', async () => {
    apiFetchMock
      .mockResolvedValueOnce({ access_token: 'fresh-token' }) // POST /auth/login
      .mockResolvedValueOnce(fakeUser); // GET /users/me

    const { user } = renderProvider();
    await user.click(screen.getByRole('button', { name: 'login' }));

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated'),
    );
    expect(getAuthToken()).toBe('fresh-token');
  });

  it('login failure surfaces the error and stays anonymous', async () => {
    apiFetchMock.mockRejectedValueOnce(new ApiError(401));

    const { user } = renderProvider();
    await user.click(screen.getByRole('button', { name: 'login' }));

    await waitFor(() => expect(apiFetchMock).toHaveBeenCalled());
    expect(screen.getByTestId('status')).toHaveTextContent('anonymous');
    expect(getAuthToken()).toBeNull();
  });

  it('rolls the token back when /users/me fails after the token was stored', async () => {
    apiFetchMock
      .mockResolvedValueOnce({ access_token: 'fresh-token' }) // POST /auth/login
      .mockRejectedValueOnce(new ApiError(500)); // GET /users/me

    const { user } = renderProvider();
    await user.click(screen.getByRole('button', { name: 'login' }));

    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledTimes(2));
    // login() must not leave a token behind that a reload would pick up.
    expect(getAuthToken()).toBeNull();
    expect(screen.getByTestId('status')).toHaveTextContent('anonymous');
  });

  it('loginWithOAuthCode exchanges the code, stores the token and moves to authenticated', async () => {
    apiFetchMock
      .mockResolvedValueOnce({ access_token: 'oauth-token' }) // POST /auth/oauth/exchange
      .mockResolvedValueOnce(fakeUser); // GET /users/me

    const { user } = renderProvider();
    await user.click(screen.getByRole('button', { name: 'oauth' }));

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated'),
    );
    expect(apiFetchMock).toHaveBeenCalledWith('/auth/oauth/exchange', {
      method: 'POST',
      body: JSON.stringify({ code: 'one-time-code' }),
    });
    expect(getAuthToken()).toBe('oauth-token');
  });

  it('loginWithOAuthCode rolls the token back when /users/me fails', async () => {
    apiFetchMock
      .mockResolvedValueOnce({ access_token: 'oauth-token' }) // POST /auth/oauth/exchange
      .mockRejectedValueOnce(new ApiError(500)); // GET /users/me

    const { user } = renderProvider();
    await user.click(screen.getByRole('button', { name: 'oauth' }));

    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledTimes(2));
    expect(getAuthToken()).toBeNull();
    expect(screen.getByTestId('status')).toHaveTextContent('anonymous');
  });

  it('a 401 that renewing could not save ends the session', async () => {
    refreshRestores('live-token');
    apiFetchMock.mockResolvedValueOnce(fakeUser);
    renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated'),
    );

    // What a failed refresh leaves behind: no token, then the 401 surfaces.
    removeAuthToken();
    await surfaceUnauthorized();

    expect(screen.getByTestId('status')).toHaveTextContent('anonymous');
  });

  it('a 401 answered to a replaced token leaves the session alone', async () => {
    refreshRestores('live-token');
    apiFetchMock.mockResolvedValueOnce(fakeUser);
    renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated'),
    );

    await surfaceUnauthorized();

    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
  });

  it('logout drops the token, clears the query cache and goes anonymous', async () => {
    setAuthToken('live-token');
    apiFetchMock.mockResolvedValueOnce(fakeUser);
    queryClient.setQueryData(['stale'], { keep: 'nothing' });

    const { user } = renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated'),
    );

    await user.click(screen.getByRole('button', { name: 'logout' }));

    expect(screen.getByTestId('status')).toHaveTextContent('anonymous');
    expect(getAuthToken()).toBeNull();
    expect(queryClient.getQueryData(['stale'])).toBeUndefined();
  });

  it('logout tells the backend', async () => {
    setAuthToken('live-token');
    apiFetchMock
      .mockResolvedValueOnce(fakeUser) // GET /users/me
      .mockResolvedValueOnce(undefined); // POST /auth/logout

    const { user } = renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated'),
    );

    await user.click(screen.getByRole('button', { name: 'logout' }));

    await waitFor(() =>
      expect(apiFetchMock).toHaveBeenCalledWith('/auth/logout', {
        method: 'POST',
      }),
    );
  });

  it('logout still signs out locally when the backend call fails', async () => {
    setAuthToken('live-token');
    apiFetchMock
      .mockResolvedValueOnce(fakeUser) // GET /users/me
      .mockRejectedValueOnce(new Error('offline')); // POST /auth/logout

    const { user } = renderProvider();
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated'),
    );

    await user.click(screen.getByRole('button', { name: 'logout' }));

    expect(screen.getByTestId('status')).toHaveTextContent('anonymous');
    expect(getAuthToken()).toBeNull();
  });
});

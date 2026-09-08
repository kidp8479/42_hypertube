import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
// The singleton client, on purpose: the 401 -> logout net lives on its cache
// handler, so a fresh per-test client could not exercise it.
import { queryClient } from '../../lib/query-client';
import { ApiError } from '../../lib/api';
import { getAuthToken, setAuthToken } from '../../lib/token';
import { AuthProvider } from './auth-provider';
import { useAuth } from './auth-context';
import type { User } from './auth-types';

// Replace only `apiFetch`; keep the real `ApiError` class so `instanceof`
// checks in the query cache handler still match.
vi.mock('../../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/api')>()),
  apiFetch: vi.fn(),
}));
const { apiFetch } = await import('../../lib/api');
const apiFetchMock = vi.mocked(apiFetch);

const fakeUser: User = {
  id: 1,
  email: 'ada@example.com',
  username: 'ada',
  firstName: 'Ada',
  lastName: 'Lovelace',
  profilePicture: null,
  preferredLanguage: 'en',
  createdAt: '2020-01-01T00:00:00.000Z',
  updatedAt: '2020-01-01T00:00:00.000Z',
};

function Probe() {
  const { state, login, logout } = useAuth();
  // The real LoginPage surfaces this rejection in form state; the probe only
  // needs to not blow up the test with an unhandled rejection.
  const tryLogin = () => {
    login('ada@example.com', 'pw').catch(() => {});
  };
  return (
    <div>
      <span data-testid="status">{state.status}</span>
      <span data-testid="user">{state.user?.username ?? '-'}</span>
      <button type="button" onClick={tryLogin}>
        login
      </button>
      <button type="button" onClick={logout}>
        logout
      </button>
    </div>
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
});

afterEach(() => {
  queryClient.clear();
});

describe('AuthProvider', () => {
  it('settles to anonymous when no token is stored', async () => {
    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('anonymous'),
    );
  });

  it('bootstraps to authenticated when a stored token resolves /users/me', async () => {
    setAuthToken('stored-token');
    apiFetchMock.mockResolvedValueOnce(fakeUser);

    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated'),
    );
    expect(screen.getByTestId('user')).toHaveTextContent('ada');
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

  it('clears an expired token and goes anonymous when /users/me 401s on load', async () => {
    setAuthToken('stale-token');
    apiFetchMock.mockRejectedValueOnce(new ApiError(401));

    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('anonymous'),
    );
    await waitFor(() => expect(getAuthToken()).toBeNull());
  });
});

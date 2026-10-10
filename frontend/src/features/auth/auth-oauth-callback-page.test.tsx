import { StrictMode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ApiError } from '../../lib/api';
import { AuthContext, type AuthContextValue } from './auth-context';
import { OAuthCodeRejectedError } from './auth-actions';
import type { AuthState } from './auth-reducer';
import { fakeUser } from '../../test/fixtures';
import { OAuthCallbackPage } from './auth-oauth-callback-page';

// Renders the URL the page is on, so "the code left the URL" is observable.
function CurrentUrl() {
  const location = useLocation();
  return <p data-testid="url">{location.pathname + location.search}</p>;
}

// `exchange` is the outcome of `loginWithOAuthCode`: the page calls it from
// its first effect, so it must be set before render, not after.
function renderCallbackPage(
  search: string,
  {
    exchange = () => Promise.resolve(),
    strict = false,
    state = { status: 'anonymous', user: null },
  }: {
    exchange?: () => Promise<void>;
    strict?: boolean;
    state?: AuthState;
  } = {},
) {
  const loginWithOAuthCode =
    vi.fn<AuthContextValue['loginWithOAuthCode']>(exchange);
  const tree = (current: AuthState) => {
    const value: AuthContextValue = {
      state: current,
      login: vi.fn(),
      loginWithOAuthCode,
      logout: vi.fn(),
    };
    const app = (
      <AuthContext.Provider value={value}>
        <MemoryRouter initialEntries={[`/oauth/callback${search}`]}>
          <Routes>
            <Route
              path="/oauth/callback"
              element={
                <>
                  <OAuthCallbackPage />
                  <CurrentUrl />
                </>
              }
            />
            <Route path="/" element={<p>home page</p>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );
    return strict ? <StrictMode>{app}</StrictMode> : app;
  };
  const { rerender } = render(tree(state));
  // Moves the auth state on, the way AuthProvider does once its startup
  // /users/me check settles.
  const settle = (next: AuthState) => rerender(tree(next));
  return { loginWithOAuthCode, settle };
}

describe('OAuthCallbackPage', () => {
  it('exchanges the code and navigates home on success', async () => {
    const { loginWithOAuthCode } = renderCallbackPage('?code=abc');

    expect(await screen.findByText('home page')).toBeInTheDocument();
    expect(loginWithOAuthCode).toHaveBeenCalledWith('abc');
  });

  it('strips the code from the URL while the exchange is in flight', async () => {
    renderCallbackPage('?code=abc', { exchange: () => new Promise(() => {}) });

    expect(await screen.findByTestId('url')).toHaveTextContent(
      /^\/oauth\/callback$/,
    );
    expect(screen.getByText('Signing you in...')).toBeInTheDocument();
  });

  it('exchanges the code only once under StrictMode', async () => {
    const { loginWithOAuthCode } = renderCallbackPage('?code=abc', {
      strict: true,
    });

    await screen.findByText('home page');
    expect(loginWithOAuthCode).toHaveBeenCalledTimes(1);
  });

  it('waits for the auth bootstrap to settle before exchanging, but strips the code at once', async () => {
    const { loginWithOAuthCode } = renderCallbackPage('?code=abc', {
      state: { status: 'loading', user: null },
    });

    expect(await screen.findByTestId('url')).toHaveTextContent(
      /^\/oauth\/callback$/,
    );
    expect(loginWithOAuthCode).not.toHaveBeenCalled();
  });

  it.each<[string, AuthState]>([
    ['anonymous', { status: 'anonymous', user: null }],
    ['authenticated', { status: 'authenticated', user: fakeUser }],
  ])(
    'exchanges the code once the bootstrap settles as %s',
    async (_, settled) => {
      const { loginWithOAuthCode, settle } = renderCallbackPage('?code=abc', {
        state: { status: 'loading', user: null },
      });

      settle(settled);

      expect(await screen.findByText('home page')).toBeInTheDocument();
      expect(loginWithOAuthCode).toHaveBeenCalledTimes(1);
      expect(loginWithOAuthCode).toHaveBeenCalledWith('abc');
    },
  );

  it('says the link expired when the backend rejects the code', async () => {
    renderCallbackPage('?code=abc', {
      exchange: () => Promise.reject(new OAuthCodeRejectedError()),
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This sign-in link has expired. Please try again.',
    );
    expect(
      screen.getByRole('link', { name: 'Back to log in' }),
    ).toHaveAttribute('href', '/login');
  });

  it.each([
    ['a network error', new Error('network down')],
    ['a 401 on /users/me after the exchange', new ApiError(401)],
  ])('shows a generic failure on %s', async (_, failure) => {
    renderCallbackPage('?code=abc', {
      exchange: () => Promise.reject(failure),
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Sign-in failed. Please try again.',
    );
  });

  it.each([
    ['cancelled', 'Sign-in was cancelled.'],
    ['email_unverified', 'Your GitHub account has no verified email address.'],
    ['failed', 'Sign-in failed. Please try again.'],
    ['something-else', 'Sign-in failed. Please try again.'],
  ])(
    'shows the message for ?error=%s without exchanging anything',
    (reason, message) => {
      const { loginWithOAuthCode } = renderCallbackPage(`?error=${reason}`);

      expect(screen.getByRole('alert')).toHaveTextContent(message);
      expect(loginWithOAuthCode).not.toHaveBeenCalled();
    },
  );

  it('treats a visit with neither code nor error as a failure', () => {
    renderCallbackPage('');

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Sign-in failed. Please try again.',
    );
  });

  it('sets a no-referrer policy for the page', () => {
    renderCallbackPage('?error=failed');

    expect(document.querySelector('meta[name="referrer"]')).toHaveAttribute(
      'content',
      'no-referrer',
    );
  });
});

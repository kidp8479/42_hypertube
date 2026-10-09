import { StrictMode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ApiError } from '../../lib/api';
import { AuthContext, type AuthContextValue } from './auth-context';
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
  }: { exchange?: () => Promise<void>; strict?: boolean } = {},
) {
  const loginWithOAuthCode =
    vi.fn<AuthContextValue['loginWithOAuthCode']>(exchange);
  const value: AuthContextValue = {
    state: { status: 'anonymous', user: null },
    login: vi.fn(),
    loginWithOAuthCode,
    logout: vi.fn(),
  };
  const tree = (
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
  render(strict ? <StrictMode>{tree}</StrictMode> : tree);
  return { loginWithOAuthCode };
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

  it('says the link expired when the exchange 401s', async () => {
    renderCallbackPage('?code=abc', {
      exchange: () => Promise.reject(new ApiError(401)),
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This sign-in link has expired. Please try again.',
    );
    expect(
      screen.getByRole('link', { name: 'Back to log in' }),
    ).toHaveAttribute('href', '/login');
  });

  it('shows a generic failure when the exchange fails for any other reason', async () => {
    renderCallbackPage('?code=abc', {
      exchange: () => Promise.reject(new Error('network down')),
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

// The parts of the OAuth handshake that can be checked without a real login
// at the provider (which needs a real 42 / GitHub account and cannot be
// automated): what the login route sends to the provider, that a callback
// without the matching state cookie is refused (sent back to the SPA's
// error page, since the callback is a browser navigation), and how the
// SPA's /oauth/callback page handles both outcomes. The API checks go
// through the SPA origin's `/api` proxy like the rest of the suite, with
// redirects off so the 302 itself can be read.
import { test, expect } from '@playwright/test';
import { trackConsoleIssues } from './console-issues';

const providers = [
  { name: '42', host: 'api.intra.42.fr' },
  { name: 'github', host: 'github.com' },
];

for (const { name, host } of providers) {
  test.describe(`${name} OAuth handshake`, () => {
    test('login redirects to the provider with a state bound to a cookie', async ({
      request,
    }) => {
      const res = await request.get(`/api/auth/${name}/login`, {
        maxRedirects: 0,
      });

      expect(res.status()).toBe(302);
      const location = new URL(res.headers()['location']);
      expect(location.host).toBe(host);
      const state = location.searchParams.get('state');
      expect(state).toBeTruthy();
      const cookie = res.headers()['set-cookie'];
      expect(cookie).toContain(`oauth_state=${state}`);
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/SameSite=Lax/i);
    });

    test('callback without the state cookie is sent to the SPA error page', async ({
      request,
    }) => {
      const res = await request.get(
        `/api/auth/${name}/callback?code=any-code&state=forged`,
        { maxRedirects: 0 },
      );

      expect(res.status()).toBe(302);
      const location = new URL(res.headers()['location']);
      expect(location.pathname).toBe('/oauth/callback');
      expect(location.searchParams.get('error')).toBe('failed');
      expect(res.headers()['referrer-policy']).toBe('no-referrer');
    });
  });
}

test('exchanging an unknown code is rejected', async ({ request }) => {
  const res = await request.post('/api/auth/oauth/exchange', {
    data: { code: 'never-issued-code' },
  });

  expect(res.status()).toBe(401);
});

test.describe('/oauth/callback page', () => {
  test('a refused callback lands on the SPA error page', async ({ page }) => {
    const consoleIssues = trackConsoleIssues(page);

    await page.goto('/api/auth/42/callback?code=any-code&state=forged');

    await expect(page).toHaveURL(/\/oauth\/callback\?error=failed$/);
    await expect(page.getByRole('alert')).toHaveText(
      'Sign-in failed. Please try again.',
    );
    await page.getByRole('link', { name: 'Back to log in' }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect(consoleIssues).toEqual([]);
  });

  // The provider leg cannot run here, so the exchange and the profile fetch
  // are stubbed: this checks the page's side - code out of the URL before
  // the exchange, then signed in and sent home.
  test('a code is exchanged, stripped from the URL, and signs the user in', async ({
    page,
  }) => {
    const consoleIssues = trackConsoleIssues(page);
    const urlsAtExchange: string[] = [];
    await page.route('**/api/auth/oauth/exchange', async (route) => {
      urlsAtExchange.push(page.url());
      expect(route.request().postDataJSON()).toEqual({ code: 'stub-code' });
      await route.fulfill({ json: { access_token: 'stub-token' } });
    });
    await page.route('**/api/users/me', (route) =>
      route.fulfill({
        json: {
          id: 1,
          email: 'ada@example.com',
          username: 'ada',
          firstName: 'Ada',
          lastName: 'Lovelace',
          profilePicture: null,
          preferredLanguage: 'en',
          createdAt: '2020-01-01T00:00:00.000Z',
          updatedAt: '2020-01-01T00:00:00.000Z',
        },
      }),
    );

    await page.goto('/oauth/callback?code=stub-code');

    await expect(page.getByText('Signed in as')).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    expect(urlsAtExchange).toHaveLength(1);
    expect(urlsAtExchange[0]).not.toContain('stub-code');
    expect(consoleIssues).toEqual([]);
  });

  test('the login page links to both providers', async ({ page }) => {
    await page.goto('/login');

    await expect(
      page.getByRole('link', { name: 'Continue with 42' }),
    ).toHaveAttribute('href', '/api/auth/42/login');
    await expect(
      page.getByRole('link', { name: 'Continue with GitHub' }),
    ).toHaveAttribute('href', '/api/auth/github/login');
  });
});

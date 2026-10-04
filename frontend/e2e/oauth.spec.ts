// The parts of the OAuth handshake that can be checked without a real login
// at the provider (which needs a real 42 / GitHub account and cannot be
// automated): what the login route sends to the provider, and that a
// callback without the matching state cookie is refused. Goes through the
// SPA origin's `/api` proxy like the rest of the suite, with redirects off so
// the 302 itself can be read.
import { test, expect } from '@playwright/test';

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

    test('callback without the state cookie is rejected', async ({
      request,
    }) => {
      const res = await request.get(
        `/api/auth/${name}/callback?code=any-code&state=forged`,
        { maxRedirects: 0 },
      );

      expect(res.status()).toBe(401);
    });
  });
}

test('exchanging an unknown code is rejected', async ({ request }) => {
  const res = await request.post('/api/auth/oauth/exchange', {
    data: { code: 'never-issued-code' },
  });

  expect(res.status()).toBe(401);
});

// Real-browser coverage for the session lifetime (HYP-78): the access token
// lives in memory only, a reload restores the session from the refresh
// cookie, a 401 is renewed in place, logout ends the session for good, and a
// signed-out visit stays silent in the console.
// Each test registers its own account through the API, like auth.spec.ts.
import { test, expect, type Page } from '@playwright/test';
import { trackConsoleIssues } from './console-issues';

const PASSWORD = 'correct horse battery';

async function signUpAndSignIn(page: Page) {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 100_000)}`;
  const username = `e2es${suffix}`;
  const created = await page.request.post('/api/users', {
    data: {
      email: `e2e-session-${suffix}@example.com`,
      username,
      firstName: 'E2E',
      lastName: 'Session',
      password: PASSWORD,
    },
  });
  expect(created.ok()).toBe(true);

  await page.goto('/login');
  await page.getByLabel('Username or email').fill(username);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
  return username;
}

test.describe('session lifetime', () => {
  test('a signed-out visit logs nothing at all in the console', async ({
    page,
  }) => {
    // Every console line, the browser's own network errors included: the
    // startup refresh must not print a 401 for a visitor with no session.
    const lines: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        lines.push(msg.text());
      }
    });
    const refreshed = page.waitForResponse('**/api/auth/refresh');

    await page.goto('/login');

    expect((await refreshed).status()).toBe(204);
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    expect(lines, lines.join('\n')).toEqual([]);
  });

  test('a reload keeps the session, with no token in localStorage', async ({
    page,
  }) => {
    const consoleIssues = trackConsoleIssues(page);
    const username = await signUpAndSignIn(page);

    await page.reload();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText(username)).toBeVisible();
    const stored = await page.evaluate(() => JSON.stringify(localStorage));
    expect(stored).not.toMatch(/token|eyJ/);
    expect(consoleIssues, consoleIssues.join('\n')).toEqual([]);
  });

  test('a 401 mid-session is renewed without leaving the page', async ({
    page,
  }) => {
    const username = await signUpAndSignIn(page);
    // The first /users/me after the reload is refused, as an expired access
    // token would be: the SPA must refresh and retry, not sign out.
    let refused = false;
    await page.route('**/api/users/me', (route) => {
      if (refused) {
        return route.continue();
      }
      refused = true;
      return route.fulfill({ status: 401, body: '' });
    });
    const refreshes: string[] = [];
    page.on('request', (request) => {
      if (request.url().endsWith('/api/auth/refresh')) {
        refreshes.push(request.url());
      }
    });

    await page.reload();

    await expect(page.getByText(username)).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    expect(refused).toBe(true);
    // One refresh restores the session on load, a second renews the 401.
    expect(refreshes).toHaveLength(2);
  });

  test('logout ends the session, a reload included', async ({ page }) => {
    await signUpAndSignIn(page);

    const loggedOut = page.waitForResponse('**/api/auth/logout');
    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL(/\/login$/);
    expect((await loggedOut).status()).toBe(204);

    await page.reload();
    await page.goto('/');

    await expect(page).toHaveURL(/\/login$/);
  });
});

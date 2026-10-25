// Fresh-account helper shared by the e2e specs.
import { expect, type Page } from '@playwright/test';

const PASSWORD = 'correct horse battery';

/**
 * Registers a fresh account through the API, then signs in through the login
 * page. Returns the username.
 */
export async function signUpAndSignIn(page: Page) {
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

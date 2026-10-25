// Fresh-account helper shared by the e2e specs.
import { expect, type Page } from '@playwright/test';

const PASSWORD = 'correct horse battery';

/**
 * Registers a fresh account through the API. `tag` keeps the username short
 * enough for its 30-character limit. Returns what a spec checks against.
 */
export async function createAccount(page: Page, tag: string) {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 100_000)}`;
  const username = `e2e${tag}${suffix}`;
  const email = `e2e-${tag}-${suffix}@example.com`;
  const created = await page.request.post('/api/users', {
    data: {
      email,
      username,
      firstName: 'E2E',
      lastName: 'User',
      password: PASSWORD,
    },
  });
  expect(created.ok()).toBe(true);
  const { id } = (await created.json()) as { id: number };
  return { id, username, email };
}

/**
 * Registers a fresh account, then signs in through the login page. Returns
 * the username.
 */
export async function signUpAndSignIn(page: Page) {
  const { username } = await createAccount(page, 's');

  await page.goto('/login');
  await page.getByLabel('Username or email').fill(username);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
  return username;
}

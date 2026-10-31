// Real-browser coverage for the profile pages (HYP-87): an edit survives a
// reload, and another user's profile shows no email.
import { test, expect } from '@playwright/test';
import { fontsLoaded, trackConsoleIssues } from './console-issues';
import { createAccount, signUpAndSignIn } from './sign-up';

test('an edited first name is kept after a reload', async ({ page }) => {
  const issues = trackConsoleIssues(page);
  await signUpAndSignIn(page);

  await page.getByRole('link', { name: 'My profile' }).click();
  await page.getByLabel('First name').fill('Augusta');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Profile saved.')).toBeVisible();

  await fontsLoaded(page);
  await page.reload();
  await expect(page.getByLabel('First name')).toHaveValue('Augusta');
  expect(issues).toEqual([]);
});

test("another user's profile shows the username, never the email", async ({
  page,
}) => {
  const issues = trackConsoleIssues(page);
  const other = await createAccount(page, 'o');
  await signUpAndSignIn(page);

  await fontsLoaded(page);
  await page.goto(`/users/${other.id}`);

  await expect(
    page.getByRole('heading', { level: 1, name: other.username }),
  ).toBeVisible();
  await expect(page.getByText(other.email)).toHaveCount(0);
  expect(issues).toEqual([]);
});

test('an API key made on the profile buys a token, then is revoked', async ({
  page,
}) => {
  const issues = trackConsoleIssues(page);
  await signUpAndSignIn(page);
  await page.getByRole('link', { name: 'My profile' }).click();

  await page.getByLabel('Key name').fill('e2e script');
  await page.getByRole('button', { name: 'Create a key' }).click();
  const secretBox = page.getByRole('region', { name: 'Copy the secret now' });
  await expect(secretBox).toBeVisible();
  const [client, secret] = await secretBox.locator('dd').allInnerTexts();

  // What the box says to do with it: the subject's POST /oauth/token.
  const token = await page.request.post('/api/oauth/token', {
    data: { client, secret },
  });
  expect(token.status()).toBe(200);

  await page.getByRole('button', { name: 'Done, I copied it' }).click();
  await expect(page.getByText(secret)).toHaveCount(0);
  await page.getByRole('button', { name: 'Revoke the key e2e script' }).click();
  await expect(page.getByText('Key revoked.')).toBeVisible();
  await expect(page.getByText('No API key yet.')).toBeVisible();
  expect(issues).toEqual([]);
});

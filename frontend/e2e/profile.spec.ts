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

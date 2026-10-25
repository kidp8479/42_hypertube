// Real-browser coverage for the profile pages (HYP-87): an edit survives a
// reload, and another user's profile shows no email.
import { test, expect } from '@playwright/test';
import { trackConsoleIssues } from './console-issues';
import { signUpAndSignIn } from './sign-up';

test('an edited first name is kept after a reload', async ({ page }) => {
  const issues = trackConsoleIssues(page);
  await signUpAndSignIn(page);

  await page.getByRole('link', { name: 'My profile' }).click();
  await page.getByLabel('First name').fill('Augusta');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Profile saved.')).toBeVisible();

  await page.reload();
  await expect(page.getByLabel('First name')).toHaveValue('Augusta');
  expect(issues).toEqual([]);
});

test("another user's profile shows the username, never the email", async ({
  page,
}) => {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 100_000)}`;
  const created = await page.request.post('/api/users', {
    data: {
      email: `e2e-other-${suffix}@example.com`,
      username: `e2eo${suffix}`,
      firstName: 'Other',
      lastName: 'User',
      password: 'correct horse battery',
    },
  });
  expect(created.ok()).toBe(true);
  const { id } = (await created.json()) as { id: number };
  await signUpAndSignIn(page);

  await page.goto(`/users/${id}`);

  await expect(
    page.getByRole('heading', { level: 1, name: `e2eo${suffix}` }),
  ).toBeVisible();
  await expect(page.getByText(`e2e-other-${suffix}@example.com`)).toHaveCount(
    0,
  );
});

// Real-browser coverage for the register -> login flow, per
// .claude/standards/engineering.md ("auth flows get a Playwright test
// before merge"). Runs against an already-up stack (docker-compose or
// `make dev`); it does not seed or reset the database itself, so every
// test picks a fresh unique email/username to avoid colliding with a
// previous run's account.
import { test, expect, type Page } from '@playwright/test';

function uniqueSuffix() {
  return `${Date.now()}-${Math.floor(Math.random() * 100_000)}`;
}

async function fillRegisterForm(
  page: Page,
  values: {
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    password: string;
    confirmPassword?: string;
  },
) {
  await page.getByLabel('Email').fill(values.email);
  await page.getByLabel('Username').fill(values.username);
  await page.getByLabel('First name').fill(values.firstName);
  await page.getByLabel('Last name').fill(values.lastName);
  await page.getByLabel('Password', { exact: true }).fill(values.password);
  await page
    .getByLabel('Confirm password')
    .fill(values.confirmPassword ?? values.password);
}

// The browser's own network log for a deliberate non-2xx (401 on login,
// 400/409 on register) is not a JS console.error - see
// docs/defense/known-limitations.md. Every other console error/warning
// is a real finding (eliminatory during the 42 defense).
function trackConsoleIssues(page: Page) {
  const issues: string[] = [];
  page.on('console', (msg) => {
    const type = msg.type();
    if (type !== 'error' && type !== 'warning') {
      return;
    }
    if (/Failed to load resource/.test(msg.text())) {
      return;
    }
    issues.push(`[${type}] ${msg.text()}`);
  });
  return issues;
}

test.describe('register -> login', () => {
  test('blocks an empty submission with field errors, no network call', async ({
    page,
  }) => {
    await page.goto('/register');
    await page.getByRole('button', { name: 'Register' }).click();

    await expect(page.getByText('Email is required')).toBeVisible();
    await expect(page).toHaveURL(/\/register$/);
  });

  test('registers a new account and logs in with it', async ({ page }) => {
    const consoleIssues = trackConsoleIssues(page);
    const suffix = uniqueSuffix();
    const email = `e2e-${suffix}@example.com`;
    const username = `e2e${suffix}`;
    const password = 'correct horse battery';

    await page.goto('/register');
    await fillRegisterForm(page, {
      email,
      username,
      firstName: 'E2E',
      lastName: 'Tester',
      password,
    });
    await page.getByRole('button', { name: 'Register' }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByText('Account created. Please sign in.'),
    ).toBeVisible();

    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText(username)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();

    expect(consoleIssues, consoleIssues.join('\n')).toEqual([]);
  });

  test('shows a generic conflict message on a duplicate email', async ({
    page,
  }) => {
    const suffix = uniqueSuffix();
    const email = `e2e-dup-${suffix}@example.com`;
    const password = 'correct horse battery';

    await page.goto('/register');
    await fillRegisterForm(page, {
      email,
      username: `e2edup${suffix}`,
      firstName: 'E2E',
      lastName: 'Tester',
      password,
    });
    await page.getByRole('button', { name: 'Register' }).click();
    await expect(page).toHaveURL(/\/login$/);

    // Same email again, different username - still a conflict either way,
    // and the message never names which field clashed.
    await page.goto('/register');
    await fillRegisterForm(page, {
      email,
      username: `e2edupB${suffix}`,
      firstName: 'E2E',
      lastName: 'Tester',
      password,
    });
    await page.getByRole('button', { name: 'Register' }).click();

    await expect(
      page.getByText(
        'An account with this email or username already exists.',
      ),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/register$/);
  });
});

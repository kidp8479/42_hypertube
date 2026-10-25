// Real-browser coverage for the base layout (HYP-19): header, main and footer
// on every page, usable on a 320px-wide phone without sideways scrolling.
import { test, expect, type Page } from '@playwright/test';
import { signUpAndSignIn } from './sign-up';

// The narrowest phone width WCAG reflow asks to support.
const PHONE = { width: 320, height: 640 };

async function expectFramedWithoutSidewaysScroll(page: Page) {
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('contentinfo')).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe('base layout on a phone', () => {
  test.use({ viewport: PHONE });

  test('the login page fits, with the language picker in the header', async ({
    page,
  }) => {
    await page.goto('/login');

    await expectFramedWithoutSidewaysScroll(page);
    await expect(page.getByRole('banner').getByLabel('Language')).toBeVisible();
  });

  test('a signed-in page fits, with logout one tap away', async ({ page }) => {
    await signUpAndSignIn(page);

    await expectFramedWithoutSidewaysScroll(page);
    await expect(
      page.getByRole('banner').getByRole('button', { name: 'Log out' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Library' })).toBeVisible();
  });
});

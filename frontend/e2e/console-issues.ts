// Console error/warning collector shared by the e2e specs, and the wait that
// keeps a spec from tripping a browser console line no user would.
import type { Page } from '@playwright/test';

/**
 * Collects the page's console errors and warnings. The browser's own
 * network log for a deliberate non-2xx (401 on login, 400/409 on register)
 * is not a JS console.error - see docs/defense/known-limitations.md. Every
 * other console error/warning is a real finding (eliminatory during the 42
 * defense).
 */
export function trackConsoleIssues(page: Page) {
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

/**
 * Waits until the page's web fonts have loaded. Firefox logs a font download
 * that a reload or a navigation cuts short as a console error ("downloadable
 * font: download failed", NS_BINDING_ABORTED). A person does not reload
 * within milliseconds of the first paint, a spec does: call this before a
 * reload or a second navigation (HYP-101, docs/defense/known-limitations.md).
 */
export async function fontsLoaded(page: Page) {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

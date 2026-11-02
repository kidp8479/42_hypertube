// Console error/warning collector shared by the e2e specs, and the wait that
// keeps a spec from tripping a browser console line no user would.
import type { ConsoleMessage, Page } from '@playwright/test';

/** A request a spec fails on purpose: its path and the status it answers. */
export interface ExpectedFailure {
  status: number;
  path: string;
}

/**
 * Whether `msg` is the browser's own network line for one of `expected`
 * ("Failed to load resource: ... status of 422", logged at the request URL).
 */
function isExpectedFailure(msg: ConsoleMessage, expected: ExpectedFailure[]) {
  const status = /status of (\d{3})/.exec(msg.text())?.[1];
  if (!status || !msg.location().url) {
    return false;
  }
  const { pathname } = new URL(msg.location().url);
  return expected.some(
    (failure) => String(failure.status) === status && failure.path === pathname,
  );
}

/**
 * Collects the page's console errors and warnings. The browser prints its
 * own red line for every non-2xx, which no code can silence
 * (docs/defense/known-limitations.md): a spec that fails a request on
 * purpose (a weak password's 422) lists it in `expected`. Any other line, an
 * unexpected 404 or 500 included, is a real finding (eliminatory during the
 * 42 defense).
 */
export function trackConsoleIssues(
  page: Page,
  expected: ExpectedFailure[] = [],
) {
  const issues: string[] = [];
  page.on('console', (msg) => {
    const type = msg.type();
    if (type !== 'error' && type !== 'warning') {
      return;
    }
    if (isExpectedFailure(msg, expected)) {
      return;
    }
    issues.push(`[${type}] ${msg.text()} (${msg.location().url})`);
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

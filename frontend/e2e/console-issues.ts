// Console error/warning collector shared by the e2e specs.
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

// Warning, not a failure: a shipped Markdown page over PAGE_LIMIT lines is
// probably two pages (HYP-79). Diagram pages are exempt, since their length
// is mostly Mermaid, and so are agent notes (CLAUDE.md, .claude/).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const PAGE_LIMIT = 300;
const EXEMPT = /^(\.claude|\.github|docs\/diagrams)\/|(^|\/)CLAUDE\.md$/;

/**
 * @param {string} root repository root
 * @param {string[]} files tracked files, relative to `root`
 * @returns {{file: string, line: number, message: string}[]}
 */
export function checkPageSize(root, files) {
  return files
    .filter((f) => f.endsWith('.md') && !EXEMPT.test(f))
    .map((f) => ({ f, lines: readFileSync(join(root, f), 'utf8').split('\n').length - 1 }))
    .filter(({ lines }) => lines > PAGE_LIMIT)
    .map(({ f, lines }) => ({
      file: f,
      line: 1,
      message: `${lines} lines, over ${PAGE_LIMIT}: is it two pages?`,
    }));
}

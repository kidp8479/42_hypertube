// Check: every relative link in a tracked Markdown file points at a file or
// directory that exists. Catches the link a rename or a move leaves behind.
import { existsSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const INLINE_LINK = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const REFERENCE_LINK = /^\s*\[[^\]]+\]:\s*(\S+)/gm;
const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i;

// Code is not prose: a link shown as an example must not be resolved.
function stripCode(text) {
  return text.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1/gm, (block) =>
    block.replace(/[^\n]/g, ' '),
  ).replace(/`[^`\n]*`/g, (span) => ' '.repeat(span.length));
}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

function targetsIn(text) {
  const found = [];
  for (const pattern of [INLINE_LINK, REFERENCE_LINK]) {
    for (const match of text.matchAll(pattern)) {
      found.push({ target: match[1], line: lineOf(text, match.index) });
    }
  }
  return found;
}

/**
 * @param {string} root repository root
 * @param {string[]} files tracked files, relative to `root`
 * @returns {{file: string, line: number, message: string}[]}
 */
export function checkLinks(root, files) {
  const problems = [];
  for (const file of files.filter((f) => f.endsWith('.md'))) {
    const text = stripCode(readFileSync(join(root, file), 'utf8'));
    for (const { target, line } of targetsIn(text)) {
      if (EXTERNAL.test(target)) continue;
      const path = decodeURI(target.split('#')[0].split('?')[0]);
      if (path === '') continue;
      const resolved = path.startsWith('/')
        ? join(root, path)
        : join(root, dirname(file), path);
      if (!existsSync(resolved)) {
        problems.push({
          file,
          line,
          message: `broken link: ${target} does not exist`,
        });
      }
    }
  }
  return problems;
}

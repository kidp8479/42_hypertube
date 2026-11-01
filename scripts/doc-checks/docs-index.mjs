// Check: every shipped Markdown page is reachable from the documentation
// index, docs/README.md. A page counts as reached when the index links it,
// or when the index links its folder's README.md and that README names it
// (the ADR, diagram and defense folders keep their own lists). Agent notes
// (CLAUDE.md, .claude/) and GitHub's own files are not shipped docs.
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';

const INDEX = 'docs/README.md';
const NOT_SHIPPED = /^(\.claude|\.github)\/|(^|\/)CLAUDE\.md$/;

const linkFromIndex = (file) => relative(dirname(INDEX), file);

function namedByFolderReadme(root, index, file) {
  const readme = join(dirname(file), 'README.md');
  if (readme === file || !index.includes(linkFromIndex(readme))) return false;
  const path = join(root, readme);
  return existsSync(path) && readFileSync(path, 'utf8').includes(basename(file));
}

/**
 * @param {string} root repository root
 * @param {string[]} files tracked files, relative to `root`
 * @returns {{file: string, line: number, message: string}[]}
 */
export function checkDocsIndex(root, files) {
  const index = readFileSync(join(root, INDEX), 'utf8');
  return files
    .filter((f) => f.endsWith('.md') && f !== INDEX && !NOT_SHIPPED.test(f))
    .filter((f) => !index.includes(linkFromIndex(f)) && !namedByFolderReadme(root, index, f))
    .map((f) => ({ file: INDEX, line: 1, message: `${f} is not reachable from the index` }));
}

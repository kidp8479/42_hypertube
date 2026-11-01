import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeRepo } from './fixture.mjs';
import { PAGE_LIMIT, checkPageSize } from './page-size.mjs';

const lines = (n) => 'x\n'.repeat(n);

test('a page at the limit passes', () => {
  const { root, files } = makeRepo({ 'docs/a.md': lines(PAGE_LIMIT) });
  assert.deepEqual(checkPageSize(root, files), []);
});

test('a page over the limit is reported with its length', () => {
  const { root, files } = makeRepo({ 'docs/a.md': lines(PAGE_LIMIT + 1) });
  assert.deepEqual(checkPageSize(root, files), [
    { file: 'docs/a.md', line: 1, message: `${PAGE_LIMIT + 1} lines, over ${PAGE_LIMIT}: is it two pages?` },
  ]);
});

test('diagram pages and agent notes are exempt', () => {
  const big = lines(PAGE_LIMIT + 1);
  const { root, files } = makeRepo({ 'docs/diagrams/auth.md': big, 'CLAUDE.md': big, '.claude/x.md': big });
  assert.deepEqual(checkPageSize(root, files), []);
});

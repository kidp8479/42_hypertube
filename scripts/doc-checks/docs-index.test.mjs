import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeRepo } from './fixture.mjs';
import { checkDocsIndex } from './docs-index.mjs';

const BASE = {
  'docs/README.md': '[r](../README.md) [o](onboarding.md) [adr](adr/README.md)',
  'README.md': '',
  'docs/onboarding.md': '',
  'docs/adr/README.md': '[0001](0001-first.md)',
  'docs/adr/0001-first.md': '',
  'CLAUDE.md': '',
  '.claude/rules/x.md': '',
  '.github/pull_request_template.md': '',
};

test('pages linked directly or through their folder README pass', () => {
  const { root, files } = makeRepo(BASE);
  assert.deepEqual(checkDocsIndex(root, files), []);
});

test('a page the index never reaches is reported', () => {
  const { root, files } = makeRepo({ ...BASE, 'docs/stray.md': '' });
  assert.deepEqual(checkDocsIndex(root, files), [
    { file: 'docs/README.md', line: 1, message: 'docs/stray.md is not reachable from the index' },
  ]);
});

test('a page its folder README does not name is reported', () => {
  const { root, files } = makeRepo({ ...BASE, 'docs/adr/0002-second.md': '' });
  assert.equal(checkDocsIndex(root, files).length, 1);
});

test('a folder whose README the index does not link is not reached', () => {
  const { root, files } = makeRepo({
    ...BASE,
    'docs/notes/README.md': 'a.md',
    'docs/notes/a.md': '',
  });
  assert.equal(checkDocsIndex(root, files).length, 2);
});

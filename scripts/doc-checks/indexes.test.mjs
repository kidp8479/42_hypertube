import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeRepo } from './fixture.mjs';
import { checkIndexes } from './indexes.mjs';

const BASE = {
  'docs/adr/README.md': '[0001](0001-first.md)',
  'docs/adr/0001-first.md': '',
  'docs/diagrams/README.md': '`auth.md` `auth-flow.png`',
  'docs/diagrams/auth.md': '',
  'docs/diagrams/auth-flow.png': '',
  'docs/diagrams/auth-flow.excalidraw': '',
};

test('complete indexes and paired renders pass', () => {
  const { root, files } = makeRepo(BASE);
  assert.deepEqual(checkIndexes(root, files), []);
});

test('an ADR missing from its index is reported', () => {
  const { root, files } = makeRepo({ ...BASE, 'docs/adr/0002-second.md': '' });
  assert.deepEqual(checkIndexes(root, files), [
    { file: 'docs/adr/README.md', line: 1, message: '0002-second.md is not listed' },
  ]);
});

test('a domain page missing from the diagram index is reported', () => {
  const { root, files } = makeRepo({ ...BASE, 'docs/diagrams/i18n.md': '' });
  const [problem] = checkIndexes(root, files);
  assert.equal(problem.file, 'docs/diagrams/README.md');
  assert.match(problem.message, /i18n\.md is not listed/);
});

test('an Excalidraw source without its PNG is reported', () => {
  const { root, files } = makeRepo({ ...BASE, 'docs/diagrams/lonely.excalidraw': '' });
  assert.deepEqual(checkIndexes(root, files), [
    { file: 'docs/diagrams/lonely.excalidraw', line: 1, message: 'no rendered lonely.png next to it' },
  ]);
});

test('the index README itself is not required to list itself', () => {
  const { root, files } = makeRepo(BASE);
  assert.equal(checkIndexes(root, files).length, 0);
});

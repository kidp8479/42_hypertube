import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeRepo } from './fixture.mjs';
import { checkLinks } from './links.mjs';

test('a link to an existing file passes', () => {
  const { root, files } = makeRepo({
    'docs/a.md': 'See [b](b.md) and [c](../c.md#section).',
    'docs/b.md': '',
    'c.md': '',
  });
  assert.deepEqual(checkLinks(root, files), []);
});

test('a link to a missing file names the file and the line', () => {
  const { root, files } = makeRepo({ 'docs/a.md': 'ok\n\n[gone](gone.md)' });
  assert.deepEqual(checkLinks(root, files), [
    { file: 'docs/a.md', line: 3, message: 'broken link: gone.md does not exist' },
  ]);
});

test('a reference-style link is checked too', () => {
  const { root, files } = makeRepo({ 'a.md': '[x][1]\n\n[1]: missing.md' });
  assert.equal(checkLinks(root, files).length, 1);
});

test('external links and bare anchors are ignored', () => {
  const { root, files } = makeRepo({
    'a.md': '[web](https://example.com) [mail](mailto:a@b.c) [here](#top)',
  });
  assert.deepEqual(checkLinks(root, files), []);
});

test('a link shown inside code is not resolved', () => {
  const { root, files } = makeRepo({
    'a.md': '`[x](nope.md)`\n\n```md\n[y](nope.md)\n```\n',
  });
  assert.deepEqual(checkLinks(root, files), []);
});

test('a root-absolute link resolves from the repo root', () => {
  const { root, files } = makeRepo({ 'docs/a.md': '[r](/README.md)', 'README.md': '' });
  assert.deepEqual(checkLinks(root, files), []);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkDashes } from './dashes.mjs';
import { makeRepo } from './fixture.mjs';

const EM = String.fromCharCode(0x2014);
const EN = String.fromCharCode(0x2013);

test('plain text and hyphens pass', () => {
  const { root, files } = makeRepo({ 'a.md': 'a - b: c (d)' });
  assert.deepEqual(checkDashes(root, files), []);
});

test('an em dash is reported with its line', () => {
  const { root, files } = makeRepo({ 'a.md': `ok\nbad ${EM} here` });
  assert.deepEqual(checkDashes(root, files), [
    { file: 'a.md', line: 2, message: 'em dash (U+2014): use a spaced hyphen, a colon or parentheses' },
  ]);
});

test('an en dash is fine in a numeric range and not elsewhere', () => {
  const { root, files } = makeRepo({ 'a.md': `pages 3${EN}7\nlogin ${EN} logout` });
  const problems = checkDashes(root, files);
  assert.equal(problems.length, 1);
  assert.equal(problems[0].line, 2);
});

test('lockfiles and images are skipped', () => {
  const { root, files } = makeRepo({
    'package-lock.json': `{"x": "${EM}"}`,
    'logo.png': `${EM}`,
  });
  assert.deepEqual(checkDashes(root, files), []);
});

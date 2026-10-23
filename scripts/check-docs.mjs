#!/usr/bin/env node
// Doc drift check (HYP-70): deterministic, no LLM. Each check takes the repo
// root and the list of tracked files and returns the problems it found, one
// `{ file, line, message }` each. Run with `make check-docs`, from CI too.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { checkDashes } from './doc-checks/dashes.mjs';
import { checkEnv } from './doc-checks/env.mjs';
import { checkIndexes } from './doc-checks/indexes.mjs';
import { checkLinks } from './doc-checks/links.mjs';
import { checkRoutes } from './doc-checks/routes.mjs';

const CHECKS = [
  ['relative links', checkLinks],
  ['dashes', checkDashes],
  ['env variables', checkEnv],
  ['doc indexes and renders', checkIndexes],
  ['routes: controller and Bruno request', checkRoutes],
];

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);

let failed = false;
for (const [name, check] of CHECKS) {
  const problems = check(root, files);
  if (problems.length === 0) {
    console.log(`ok   ${name}`);
    continue;
  }
  failed = true;
  console.log(`FAIL ${name}`);
  for (const { file, line, message } of problems) {
    console.log(`  ${file}:${line}: ${message}`);
  }
}
process.exit(failed ? 1 : 0);

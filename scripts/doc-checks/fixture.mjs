// Test helper: builds a throwaway repo tree from a `{ path: content }` map.
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

export function makeRepo(files) {
  const root = mkdtempSync(join(tmpdir(), 'check-docs-'));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return { root, files: Object.keys(files) };
}

// Check: the two doc indexes list everything they index, and each Excalidraw
// source ships with its rendered PNG.
//
//   docs/adr/README.md        lists every docs/adr/NNNN-*.md
//   docs/diagrams/README.md   lists every domain page and every PNG
//   *.excalidraw              has a sibling .png (the render people actually open)
import { readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

const ADR_DIR = 'docs/adr';
const DIAGRAM_DIR = 'docs/diagrams';

const inDir = (files, dir, pattern) =>
  files.filter((f) => dirname(f) === dir && pattern.test(basename(f)));

function listedBy(root, indexFile, names) {
  const index = readFileSync(join(root, indexFile), 'utf8');
  return names
    .filter((name) => !index.includes(name))
    .map((name) => ({
      file: indexFile,
      line: 1,
      message: `${name} is not listed`,
    }));
}

/**
 * @param {string} root repository root
 * @param {string[]} files tracked files, relative to `root`
 * @returns {{file: string, line: number, message: string}[]}
 */
export function checkIndexes(root, files) {
  const adrs = inDir(files, ADR_DIR, /^\d{4}-.*\.md$/).map((f) => basename(f));
  const pages = inDir(files, DIAGRAM_DIR, /\.md$/)
    .map((f) => basename(f))
    .filter((name) => name !== 'README.md');
  const pngs = inDir(files, DIAGRAM_DIR, /\.png$/).map((f) => basename(f));

  const problems = [
    ...listedBy(root, `${ADR_DIR}/README.md`, adrs),
    ...listedBy(root, `${DIAGRAM_DIR}/README.md`, [...pages, ...pngs]),
  ];
  for (const source of files.filter((f) => f.endsWith('.excalidraw'))) {
    const png = source.replace(/\.excalidraw$/, '.png');
    if (!files.includes(png)) {
      problems.push({ file: source, line: 1, message: `no rendered ${basename(png)} next to it` });
    }
  }
  return problems;
}

// Check: no em dash (U+2014) and no en dash (U+2013) outside a numeric range
// in tracked text files. House style: a spaced hyphen, a colon or parentheses.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);
const BINARY_EXTENSIONS =
  /\.(png|jpe?g|gif|webp|ico|pdf|woff2?|ttf|eot|zip|gz|excalidraw)$/i;
const GENERATED = /(^|\/)package-lock\.json$/;

function isNumericRange(line, index) {
  return /\d/.test(line[index - 1] ?? '') && /\d/.test(line[index + 1] ?? '');
}

function problemsInLine(file, line, number) {
  const problems = [];
  for (let i = 0; i < line.length; i += 1) {
    if (line[i] === EM_DASH) {
      problems.push({ file, line: number, message: 'em dash (U+2014): use a spaced hyphen, a colon or parentheses' });
    } else if (line[i] === EN_DASH && !isNumericRange(line, i)) {
      problems.push({ file, line: number, message: 'en dash (U+2013) outside a numeric range: use a spaced hyphen' });
    }
  }
  return problems;
}

/**
 * @param {string} root repository root
 * @param {string[]} files tracked files, relative to `root`
 * @returns {{file: string, line: number, message: string}[]}
 */
export function checkDashes(root, files) {
  const problems = [];
  for (const file of files) {
    if (BINARY_EXTENSIONS.test(file) || GENERATED.test(file)) continue;
    const text = readFileSync(join(root, file), 'utf8');
    if (text.includes('\u0000')) continue;
    text
      .split('\n')
      .forEach((line, i) => problems.push(...problemsInLine(file, line, i + 1)));
  }
  return problems;
}

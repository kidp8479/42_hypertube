// Check: a variable the backend refuses to boot without is wired everywhere
// it has to be (CLAUDE.md > "A new env variable touches four places").
//
//   Joi schema (source of truth) -> docker-compose.yml backend environment
//   -> `.env.example` and the `e2e` job's env, when compose takes the value
//   from the environment without a default.
//
// Text parsing, not an import of the schema: no build step needed in CI. The
// formats it reads (Joi chains, a YAML subset) are regular enough, and the
// tests pin what is understood.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const JOI = 'backend/src/config/env.validation.ts';
const COMPOSE = 'docker-compose.yml';
const EXAMPLE = '.env.example';
const CI = '.github/workflows/ci.yml';

/** Names of the Joi variables that are `.required()` (a default makes it optional). */
export function joiRequired(source) {
  const code = source.replace(/\/\/.*$/gm, '');
  const required = [];
  const entry = /^ {2}([A-Z][A-Z0-9_]*):([\s\S]*?)(?=^ {2}[A-Z][A-Z0-9_]*:|^\}\))/gm;
  for (const [, name, chain] of code.matchAll(entry)) {
    if (/\.required\(\)/.test(chain) && !/\.default\(/.test(chain)) {
      required.push(name);
    }
  }
  return required;
}

const indentOf = (line) => line.length - line.trimStart().length;

/**
 * Entries of the YAML mapping at `path` (e.g. ['services', 'backend',
 * 'environment']), as `name -> { value, line }`, plus the line of its header.
 * Understands only plain `key: value` nesting, which is all the two files use.
 */
export function yamlMapping(source, path) {
  const lines = source.split('\n');
  let from = 0;
  let indent = -1;
  let header = 0;
  for (const key of path) {
    const at = lines.findIndex(
      (line, i) => i >= from && indentOf(line) > indent && line.trim() === `${key}:`,
    );
    if (at === -1) return { entries: new Map(), header: 0 };
    from = at + 1;
    indent = indentOf(lines[at]);
    header = at + 1;
  }
  const entries = new Map();
  for (let i = from; i < lines.length; i += 1) {
    if (lines[i].trim() === '' || lines[i].trim().startsWith('#')) continue;
    if (indentOf(lines[i]) <= indent) break;
    const match = lines[i].match(/^\s*([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
    if (match) entries.set(match[1], { value: match[2].trim(), line: i + 1 });
  }
  return { entries, header };
}

/** Names defined in a dotenv-style file (commented-out lines do not count). */
export function dotenvNames(source) {
  return new Set([...source.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((m) => m[1]));
}

// `${NAME}` has no fallback, `${NAME:-x}` does; a literal has no source at all.
function sourceVariable(value) {
  const match = value.match(/^\$\{([A-Z][A-Z0-9_]*)\}$/);
  return match ? match[1] : null;
}

function read(root, file) {
  return readFileSync(join(root, file), 'utf8');
}

/**
 * @param {string} root repository root
 * @returns {{file: string, line: number, message: string}[]}
 */
export function checkEnv(root) {
  const problems = [];
  const compose = yamlMapping(read(root, COMPOSE), ['services', 'backend', 'environment']);
  const example = dotenvNames(read(root, EXAMPLE));
  const ciEnv = yamlMapping(read(root, CI), ['jobs', 'e2e', 'env']);

  for (const name of joiRequired(read(root, JOI))) {
    const wired = compose.entries.get(name);
    if (!wired) {
      problems.push({
        file: COMPOSE,
        line: compose.header,
        message: `${name} is required by ${JOI} but not passed to the backend container`,
      });
      continue;
    }
    const source = sourceVariable(wired.value);
    if (source === null) continue;
    if (!example.has(source)) {
      problems.push({
        file: EXAMPLE,
        line: 1,
        message: `${source} is missing (compose reads it for ${name}, no default)`,
      });
    }
    if (!ciEnv.entries.has(source)) {
      problems.push({
        file: CI,
        line: ciEnv.header,
        message: `the e2e job env is missing ${source} (compose reads it for ${name}, no default)`,
      });
    }
  }
  return problems;
}

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkEnv, dotenvNames, joiRequired, yamlMapping } from './env.mjs';
import { makeRepo } from './fixture.mjs';

const JOI = `
export const envValidationSchema = Joi.object({
  // not required, a default
  PORT: Joi.number().port().default(3000),
  DATABASE_USER: Joi.string().required(),
  JWT_SECRET: Joi.string()
    .min(32)
    .required(),
  // required() in a comment must not count
  FRONTEND_ORIGIN: Joi.string().uri().default('http://localhost:5173'),
  WITH_BOTH: Joi.string().required().default('x'),
});`;

const COMPOSE = `
services:
  db:
    environment:
      POSTGRES_USER: nope
  backend:
    environment:
      DATABASE_USER: \${POSTGRES_USER}
      JWT_SECRET: \${JWT_SECRET}
    ports:
      - "3000:3000"
`;

const EXAMPLE = 'POSTGRES_USER=x\nJWT_SECRET=y\n# DATABASE_NAME=z\n';

const CI = `
jobs:
  e2e:
    env:
      POSTGRES_USER: ci
      JWT_SECRET: ci
    steps:
      - run: true
`;

function repo(overrides = {}) {
  return makeRepo({
    'backend/src/config/env.validation.ts': JOI,
    'docker-compose.yml': COMPOSE,
    '.env.example': EXAMPLE,
    '.github/workflows/ci.yml': CI,
    ...overrides,
  });
}

test('joiRequired keeps required variables without a default', () => {
  assert.deepEqual(joiRequired(JOI), ['DATABASE_USER', 'JWT_SECRET']);
});

test('yamlMapping reads one nested mapping and stops at the next key', () => {
  const { entries, header } = yamlMapping(COMPOSE, ['services', 'backend', 'environment']);
  assert.deepEqual([...entries.keys()], ['DATABASE_USER', 'JWT_SECRET']);
  assert.equal(header, 7);
});

test('dotenvNames ignores commented-out lines', () => {
  assert.deepEqual([...dotenvNames(EXAMPLE)], ['POSTGRES_USER', 'JWT_SECRET']);
});

test('a fully wired repo passes', () => {
  assert.deepEqual(checkEnv(repo().root), []);
});

test('a required variable missing from compose is reported', () => {
  const { root } = repo({
    'docker-compose.yml': COMPOSE.replace('      JWT_SECRET: ${JWT_SECRET}\n', ''),
  });
  const [problem] = checkEnv(root);
  assert.equal(problem.file, 'docker-compose.yml');
  assert.match(problem.message, /JWT_SECRET is required/);
});

test('a source variable missing from .env.example is reported', () => {
  const { root } = repo({ '.env.example': 'POSTGRES_USER=x\n' });
  const [problem] = checkEnv(root);
  assert.equal(problem.file, '.env.example');
  assert.match(problem.message, /JWT_SECRET is missing/);
});

test('a source variable missing from the e2e job env is reported', () => {
  const { root } = repo({ '.github/workflows/ci.yml': CI.replace('      JWT_SECRET: ci\n', '') });
  const [problem] = checkEnv(root);
  assert.equal(problem.file, '.github/workflows/ci.yml');
  assert.match(problem.message, /e2e job env is missing JWT_SECRET/);
});

test('a compose default or a literal needs nothing elsewhere', () => {
  const { root } = repo({
    'docker-compose.yml': COMPOSE.replace('${POSTGRES_USER}', 'db').replace(
      '${JWT_SECRET}',
      '${JWT_SECRET:-dev}',
    ),
    '.env.example': '',
    '.github/workflows/ci.yml': 'jobs:\n  e2e:\n    env:\n      A: b\n',
  });
  assert.deepEqual(checkEnv(root), []);
});

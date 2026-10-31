import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeRepo } from './fixture.mjs';
import { brunoRequest, checkRoutes, citedRoutes, controllerRoutes } from './routes.mjs';

const USERS = `
@Controller('users')
export class UsersController {
  @Post() create() {}
  @Get('me') me() {}
  @Get(':id') one() {}
}`;

const AUTH = `
@Controller('auth')
export class AuthController {
  @Get('42/login') loginWith42() {}
  @OAuthCallback('42') callback() {}
}`;

const bru = (method, url) => `meta {\n  name: x\n}\n\n${method} {\n  url: {{baseUrl}}${url}\n  body: none\n}\n`;

const BASE = {
  'backend/src/users/users.controller.ts': USERS,
  'backend/src/auth/auth.controller.ts': AUTH,
  'api/bruno/01.bru': bru('post', '/users'),
  'api/bruno/02.bru': bru('get', '/users/me'),
  'api/bruno/03.bru': bru('get', '/users/{{adaId}}'),
  'api/bruno/04.bru': bru('get', '/auth/42/login'),
  'api/bruno/05.bru': bru('get', '/auth/42/callback?code=x&state=y'),
};

test('controllerRoutes reads the prefix, the verbs and the OAuth callback', () => {
  assert.deepEqual(controllerRoutes(AUTH), [
    { method: 'GET', path: '/auth/42/login' },
    { method: 'GET', path: '/auth/42/callback' },
  ]);
  assert.deepEqual(controllerRoutes('@Controller()\n@Get() health() {}'), [
    { method: 'GET', path: '/' },
  ]);
});

test('brunoRequest reads the method and the path without the query', () => {
  assert.deepEqual(brunoRequest(bru('get', '/users/1?x=2')), { method: 'GET', path: '/users/1' });
  assert.equal(brunoRequest('meta {\n  name: x\n}'), null);
});

test('citedRoutes expands braces, placeholders and drops the /api proxy prefix', () => {
  const text = 'GET /auth/{42,github}/callback and POST /api/auth/login and GET /auth/<provider>/login<br/>x';
  assert.deepEqual(
    citedRoutes(text).map((c) => `${c.method} ${c.path}`),
    ['GET /auth/42/callback', 'GET /auth/github/callback', 'POST /auth/login', 'GET /auth/:provider/login'],
  );
});

test('a cited route that is declared and has a Bruno request passes', () => {
  const { root, files } = makeRepo({
    ...BASE,
    'README.md': 'POST /users, GET /users/me, GET /users/:id, GET /auth/42/login, GET /auth/42/callback',
  });
  assert.deepEqual(checkRoutes(root, files), []);
});

test('a cited route no controller declares is reported', () => {
  const { root, files } = makeRepo({ ...BASE, 'README.md': 'DELETE /users/:id' });
  const [problem] = checkRoutes(root, files);
  assert.equal(problem.file, 'README.md');
  assert.match(problem.message, /DELETE \/users\/:id is cited but no controller declares it/);
});

test('a declared route without a Bruno request is reported', () => {
  const files = { ...BASE, 'README.md': 'GET /auth/42/login' };
  delete files['api/bruno/04.bru'];
  const { root, files: tracked } = makeRepo(files);
  const [problem] = checkRoutes(root, tracked);
  assert.match(problem.message, /GET \/auth\/42\/login has no request in api\/bruno/);
});

test('a static route and a param route are covered separately', () => {
  const files = { ...BASE, 'README.md': 'GET /users/:id' };
  delete files['api/bruno/03.bru'];
  const { root, files: tracked } = makeRepo(files);
  const messages = checkRoutes(root, tracked).map((p) => p.message);
  assert.ok(messages.some((m) => m.includes('GET /users/:id has no request')));
});

test('a planned route may be cited without a controller', () => {
  const { root, files } = makeRepo({ ...BASE, 'README.md': 'GET /comments and GET /movies/:movie_id' });
  assert.deepEqual(checkRoutes(root, files), []);
});

test('agent tooling under .claude is not scanned', () => {
  const { root, files } = makeRepo({ ...BASE, '.claude/skills/x.md': 'GET /nowhere' });
  assert.deepEqual(checkRoutes(root, files), []);
});

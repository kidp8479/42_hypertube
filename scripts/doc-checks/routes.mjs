// Check: a route cited in the docs ("POST /auth/login") is declared by a
// controller AND exercised by a request of the Bruno collection (api/bruno/).
// Static, nothing is run: the .bru method + URL is what counts.
//
// Matching works on path shapes: a `:param` segment, a `{{variable}}` segment
// or a concrete value (`/users/999999`) all stand for "some value", and when a
// static route and a param route both fit (`/users/me` vs `/users/:id`) the
// more specific one wins.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const METHODS = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'];

// Cited in the docs on purpose, not built yet (see the traceability matrix).
// Written as shapes: every `:param` is `:p` (see `shapeKey`).
export const PLANNED = new Set([
  'POST /oauth/token',
  'GET /movies',
  'GET /movies/:p',
  'GET /comments',
  'GET /comments/:p',
  'GET /movies/:p/comments',
  'POST /comments',
  'POST /movies/:p/comments',
  'PATCH /comments/:p',
  'DELETE /comments/:p',
  'POST /auth/reset-password',
]);

const segments = (path) => path.split('/').filter(Boolean);
const isParam = (segment) => segment.startsWith(':') || segment.startsWith('{{');

function joinPath(...parts) {
  return '/' + parts.flatMap((p) => segments(p ?? '')).join('/');
}

const shapeKey = ({ method, path }) =>
  `${method} /${segments(path).map((s) => (isParam(s) ? ':p' : s)).join('/')}`;

/** `{ method, path }` of every route a controller file declares. */
export function controllerRoutes(source) {
  const prefix = source.match(/@Controller\(\s*(?:'([^']*)')?\s*\)/)?.[1] ?? '';
  const routes = [];
  const verb = /@(Get|Post|Patch|Put|Delete)\(\s*(?:'([^']*)')?\s*\)/g;
  for (const [, method, path] of source.matchAll(verb)) {
    routes.push({ method: method.toUpperCase(), path: joinPath(prefix, path) });
  }
  // The composite decorator of the OAuth callbacks is a GET `<provider>/callback`.
  for (const [, provider] of source.matchAll(/@OAuthCallback\(\s*'([^']+)'\s*\)/g)) {
    routes.push({ method: 'GET', path: joinPath(prefix, provider, 'callback') });
  }
  return routes;
}

/** `{ method, path }` of a Bruno request file, or null if it is not an http request. */
export function brunoRequest(source) {
  const head = source.match(/^(get|post|patch|put|delete)\s*\{\s*\n\s*url:\s*(\S+)/im);
  if (!head) return null;
  const path = head[2].replace(/^\{\{baseUrl\}\}/, '').split('?')[0];
  return { method: head[1].toUpperCase(), path: joinPath(path) };
}

const fits = (route, shape) =>
  route.length === shape.length &&
  route.every((seg, i) => isParam(seg) || isParam(shape[i]) || seg === shape[i]);

const paramCount = (route) => route.filter(isParam).length;

// Routes of `method` that fit `path`; if the path has no wildcard of its own,
// only the most specific fit counts (`/users/me` is not `/users/:id`).
function candidates(routes, method, path) {
  const shape = segments(path);
  const fit = routes.filter((r) => r.method === method && fits(segments(r.path), shape));
  if (shape.some(isParam) || fit.length === 0) return fit;
  const best = Math.min(...fit.map((r) => paramCount(segments(r.path))));
  return fit.filter((r) => paramCount(segments(r.path)) === best);
}

/** Every `METHOD /path` cited in a Markdown text, brace alternatives expanded. */
export function citedRoutes(text) {
  const cited = [];
  const pattern = new RegExp(`\\b(${METHODS.join('|')})\\s+(/(?:[A-Za-z0-9_\\-./:{},]|<[a-z_]+>)*)`, 'g');
  for (const match of text.matchAll(pattern)) {
    // `<provider>` is a placeholder like `:provider`; `/api` is the Vite dev
    // proxy prefix, stripped before the request reaches the backend.
    const path = match[2]
      .replace(/[.,]+$/, '')
      .replace(/<([a-z_]+)>/g, ':$1')
      .replace(/^\/api(?=\/)/, '');
    const brace = path.match(/\{([^}{]+)\}/);
    const paths = brace
      ? brace[1].split(',').map((alt) => path.replace(brace[0], alt))
      : [path];
    const line = text.slice(0, match.index).split('\n').length;
    for (const p of paths) cited.push({ method: match[1], path: joinPath(p), line });
  }
  return cited;
}

const sameKey = (route) => `${route.method} ${route.path}`;

/**
 * @param {string} root repository root
 * @param {string[]} files tracked files, relative to `root`
 * @returns {{file: string, line: number, message: string}[]}
 */
export function checkRoutes(root, files) {
  const read = (f) => readFileSync(join(root, f), 'utf8');
  const declared = files
    .filter((f) => f.endsWith('.controller.ts'))
    .flatMap((f) => controllerRoutes(read(f)));
  const requests = files
    .filter((f) => f.startsWith('api/bruno/') && f.endsWith('.bru'))
    .map((f) => brunoRequest(read(f)))
    .filter(Boolean);
  const covered = new Set(
    requests.flatMap((r) => candidates(declared, r.method, r.path)).map(sameKey),
  );

  const problems = [];
  const docs = files.filter((f) => f.endsWith('.md') && !f.startsWith('.claude/'));
  for (const file of docs) {
    for (const { method, path, line } of citedRoutes(read(file))) {
      const key = sameKey({ method, path });
      const routes = candidates(declared, method, path);
      if (routes.length === 0) {
        if (!PLANNED.has(shapeKey({ method, path }))) {
          problems.push({ file, line, message: `${key} is cited but no controller declares it` });
        }
        continue;
      }
      for (const route of routes.filter((r) => !covered.has(sameKey(r)))) {
        problems.push({
          file,
          line,
          message: `${sameKey(route)} has no request in api/bruno/ (cited as ${key})`,
        });
      }
    }
  }
  return dedupe(problems);
}

function dedupe(problems) {
  const seen = new Set();
  return problems.filter((p) => {
    const key = `${p.file}:${p.line}:${p.message}`;
    return seen.has(key) ? false : seen.add(key);
  });
}

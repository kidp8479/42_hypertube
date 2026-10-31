import type { Request } from 'express';

// Only a plain path is trusted: the value ends up in a Set-Cookie header and
// in the OpenAPI document's server URL.
const PLAIN_PATH = /^(\/[A-Za-z0-9_-]+)+$/;

/**
 * The path prefix the browser sees in front of the API: `/api` behind the
 * edge proxy, which strips it before Nest sees the request and says so in
 * `X-Forwarded-Prefix` (ADR-0009), and `''` when the backend is reached
 * directly or the header is not a plain path.
 */
export function forwardedPrefix(req: Request): string {
  const prefix = req.headers['x-forwarded-prefix'];
  return typeof prefix === 'string' && PLAIN_PATH.test(prefix) ? prefix : '';
}

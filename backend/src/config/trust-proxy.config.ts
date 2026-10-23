import type { NestExpressApplication } from '@nestjs/platform-express';

/**
 * Makes Express read the client address from `X-Forwarded-For` instead of
 * the socket. Behind the edge proxy (ADR-0009) every connection comes from
 * the proxy, so without this the per-IP rate limiter would count the whole
 * world as one client, and `req.secure` would be false over TLS.
 *
 * The number is how many proxies to trust, counted from the backend: 1 means
 * "the address nginx appended", so an `X-Forwarded-For` value the client sent
 * itself (which nginx keeps, to the left) cannot pick the IP the limiter
 * sees. That only holds because the proxy is the single way in; with the
 * backend also reachable directly a client could send its own header.
 */
export function trustEdgeProxy(app: NestExpressApplication): void {
  app.set('trust proxy', 1);
}

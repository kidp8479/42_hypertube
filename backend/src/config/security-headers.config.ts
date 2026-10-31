import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';

/**
 * Adds helmet's security headers to every backend response, including the
 * Content-Security-Policy of `/api-docs` (the only HTML the backend serves).
 *
 * Three headers are left to the edge proxy, which sets them on every
 * response (ADR-0009, ADR-0014): HSTS, `X-Frame-Options` and
 * `X-Content-Type-Options`. Sending them here too would give two values
 * behind the proxy, and helmet's HSTS default (180 days) would pin
 * `localhost` to HTTPS, which breaks the direct dev ports.
 *
 * The CSP keeps helmet's defaults (scripts from this origin only, inline
 * styles allowed: Swagger UI has inline `<style>` and `style=`), with two
 * changes: no framing at all, and no `upgrade-insecure-requests`, which
 * would break `/api-docs` over host dev's plain `http://localhost:3000`.
 */
export function securityHeaders(app: NestExpressApplication): void {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: null,
        },
      },
      strictTransportSecurity: false,
      xFrameOptions: false,
      xContentTypeOptions: false,
    }),
  );
}

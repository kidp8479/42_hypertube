import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Request } from 'express';
import { forwardedPrefix } from '../common/utils/forwarded-prefix.util';

/**
 * Serves Swagger UI at `/api-docs` and the OpenAPI document at
 * `/api-docs-json`, in every environment: it is the RESTful-API evidence
 * shown at the defense (HYP-15, HYP-40). A real public deployment would gate
 * or disable it (`docs/defense/known-limitations.md`).
 *
 * The bearer token is required on every operation, like the global
 * `JwtAuthGuard`; `@Public()` routes override it. Request and response
 * models come from the `@nestjs/swagger` compiler plugin (`nest-cli.json`),
 * which reads the DTO types and their class-validator rules.
 *
 * The OAuth login and callback routes are left out (`@ApiExcludeEndpoint`):
 * "Try it out" would fetch them and follow the redirect to the provider,
 * which the CSP blocks with a console error.
 *
 * The server URL is set per request: `/api` behind the edge proxy, `/` on
 * the backend's own port, so "Try it out" calls the API, never the SPA.
 */
export function serveApiDocs(app: NestExpressApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Hypertube API')
    .setDescription(
      'RESTful API for the Hypertube project. The 42 and GitHub logins are ' +
        'browser navigations, not API calls, so they are not listed here: ' +
        '`/api/auth/42/login` and `/api/auth/github/login` redirect to the ' +
        'provider, which sends the browser back to `/api/auth/<provider>/callback`.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addSecurityRequirements('bearer')
    .build();
  SwaggerModule.setup(
    'api-docs',
    app,
    SwaggerModule.createDocument(app, config),
    {
      // Express is the HTTP adapter, so the request is an Express Request.
      patchDocumentOnRequest: (req, _res, document) => ({
        ...document,
        servers: [{ url: forwardedPrefix(req as Request) || '/' }],
      }),
    },
  );
}

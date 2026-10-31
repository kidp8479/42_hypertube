import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

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
 */
export function serveApiDocs(app: NestExpressApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Hypertube API')
    .setDescription('RESTful API for the Hypertube project')
    .setVersion('1.0')
    .addBearerAuth()
    .addSecurityRequirements('bearer')
    .build();
  SwaggerModule.setup(
    'api-docs',
    app,
    SwaggerModule.createDocument(app, config),
  );
}

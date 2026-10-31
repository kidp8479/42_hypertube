// App bootstrap: global pipes/interceptors/filters, CORS, Swagger, listen.
import { HttpAdapterHost, NestFactory, Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { QueryFailedFilter } from './common/filters/query-failed.filter';
import { globalValidationPipe } from './common/pipes/global-validation.pipe';
import { noStoreResponses } from './config/no-store.config';
import { securityHeaders } from './config/security-headers.config';
import { serveApiDocs } from './config/swagger.config';
import { trustEdgeProxy } from './config/trust-proxy.config';
import type { NestExpressApplication } from '@nestjs/platform-express';

/**
 * Backend entry point: builds the Nest app, registers the global pipe,
 * interceptor, filter and CORS policy, serves the Swagger UI, then listens.
 * Everything that applies to every route is set here and nowhere else.
 */
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // Behind the edge proxy: real client IP for the rate limiter, req.secure.
  trustEdgeProxy(app);

  // helmet: CSP and the other browser hardening headers (ADR-0014).
  securityHeaders(app);

  // Per-user data: the browser must refetch it, never replay a stored copy.
  noStoreResponses(app);

  // Close DB connections and run module teardown on SIGTERM/SIGINT
  // (what `docker stop` sends) instead of dropping them.
  app.enableShutdownHooks();

  // Validates every incoming body/query against its DTO (class-validator)
  // before the handler runs: the "validate all forms" security constraint.
  app.useGlobalPipes(globalValidationPipe());

  // Strips @Exclude()-marked fields (e.g. User.password) from every
  // response body. Relies on handlers returning class instances, which
  // the TypeORM repository already does.
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Maps a Postgres unique-violation to 409 instead of a raw 500.
  app.useGlobalFilters(
    new QueryFailedFilter(app.get(HttpAdapterHost).httpAdapter),
  );

  // The browser blocks cross-origin calls by default and the frontend runs
  // on another origin, so only that one is allowed (never "*").
  app.enableCors({
    origin: config.getOrThrow<string>('FRONTEND_ORIGIN'),
  });

  // Swagger UI and the OpenAPI document, the REST evidence for the defense.
  serveApiDocs(app);

  await app.listen(config.get<number>('PORT') ?? 3000);
}
void bootstrap();

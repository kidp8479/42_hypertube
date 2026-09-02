import { HttpAdapterHost, NestFactory, Reflector } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { QueryFailedFilter } from './common/filters/query-failed.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Close DB connections and run module teardown on SIGTERM/SIGINT
  // (what `docker stop` sends) instead of dropping them.
  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strips fields not declared in the DTO
      forbidNonWhitelisted: true, // ...and returns 400 if any are sent
      transform: true, // turns the JSON payload into a DTO class instance
    }),
  );

  // Strips @Exclude()-marked fields (e.g. User.password) from every
  // response body. Relies on handlers returning class instances, which
  // the TypeORM repository already does.
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Maps a Postgres unique-violation to 409 instead of a raw 500.
  app.useGlobalFilters(
    new QueryFailedFilter(app.get(HttpAdapterHost).httpAdapter),
  );

  app.enableCors({
    origin: config.get<string>('FRONTEND_ORIGIN') ?? 'http://localhost:5173',
    credentials: true, // needed later for cookies / the Authorization header
  });

  // Swagger UI is served in every environment on purpose: /api-docs is the
  // RESTful-API evidence shown at the defense (HYP-15). In a real public
  // deployment it would be gated behind auth or disabled in production -
  // see docs/defense/known-limitations.md.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Hypertube API')
    .setDescription('RESTful API for the Hypertube project')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, swaggerDocument);

  await app.listen(config.get<number>('PORT') ?? 3000);
}
void bootstrap();

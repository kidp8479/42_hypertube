import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strips fields not declared in the DTO
      forbidNonWhitelisted: true, // ...and returns 400 if any are sent
      transform: true, // turns the JSON payload into a DTO class instance
    }),
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

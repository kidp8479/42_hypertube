import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strips fields not declared in the DTO
      forbidNonWhitelisted: true, // ...and returns 400 if any are sent
      transform: true, // turns the JSON payload into a DTO class instance
    }),
  );

  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
    credentials: true, // needed later for cookies / the Authorization header
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Hypertube API')
    .setDescription('RESTful API for the Hypertube project')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, swaggerDocument);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();

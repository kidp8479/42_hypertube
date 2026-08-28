import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // vire les champs non déclarés dans le DTO
      forbidNonWhitelisted: true, // ...et renvoie 400 si on en envoie
      transform: true, // transforme le payload JSON en instance de la classe DTO
    }),
  );

  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
    credentials: true, // nécessaire plus tard pour les cookies / le header Authorization
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

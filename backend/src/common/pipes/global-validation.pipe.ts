// The validation pipe applied to every route.
import { ValidationPipe } from '@nestjs/common';

/**
 * Builds the pipe `main.ts` registers globally, and that HTTP specs install so
 * they validate bodies exactly as the running app does.
 */
export const globalValidationPipe = (): ValidationPipe =>
  new ValidationPipe({
    whitelist: true, // strips fields not declared in the DTO
    forbidNonWhitelisted: true, // ...and returns 400 if any are sent
    transform: true, // turns the JSON payload into a DTO class instance
  });

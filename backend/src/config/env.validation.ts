import * as Joi from 'joi';

/**
 * Schema for every environment variable the app reads. ConfigModule runs
 * this at startup and refuses to boot if anything is missing or malformed,
 * so a misconfigured deploy fails immediately instead of surfacing as a
 * runtime error later (a missing JWT_SECRET being the worst case).
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),

  DATABASE_HOST: Joi.string().required(),
  DATABASE_PORT: Joi.number().port().default(5432),
  DATABASE_USER: Joi.string().required(),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_NAME: Joi.string().required(),

  // Signing key for auth JWTs. 32 chars minimum so a short placeholder
  // ("change_me") can never reach production.
  JWT_SECRET: Joi.string().min(32).required(),
  // Access-token lifetime, in the vercel/ms format @nestjs/jwt accepts.
  JWT_EXPIRES_IN: Joi.string().default('15m'),

  // Optional - CORS allowed origin for the SPA. main.ts falls back to the
  // local Vite dev server when unset.
  FRONTEND_ORIGIN: Joi.string().uri().optional(),
});

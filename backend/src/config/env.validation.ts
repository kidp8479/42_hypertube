import * as Joi from 'joi';

/**
 * Placeholder values shipped in `.env.example`. Rejected here so copying
 * the example verbatim fails the boot instead of running with a signing
 * key that is public in the repo history.
 */
const ENV_EXAMPLE_PLACEHOLDERS = [
  'replace_with_a_random_64_char_secret_before_running_the_app_0000',
  'change_me',
];

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

  // Signing key for auth JWTs. 32 chars minimum, and the .env.example
  // placeholder is rejected outright - a public key must never boot.
  JWT_SECRET: Joi.string()
    .min(32)
    .invalid(...ENV_EXAMPLE_PLACEHOLDERS)
    .required(),
  // Access-token lifetime, in the vercel/ms format @nestjs/jwt accepts
  // (e.g. "15m", "7d"). The pattern is enforced here so auth.module can
  // safely assert the value as an ms StringValue.
  JWT_EXPIRES_IN: Joi.string()
    .pattern(/^\d+(s|m|h|d)$/)
    .default('15m'),

  // Optional - CORS allowed origin for the SPA. main.ts falls back to the
  // local Vite dev server when unset.
  FRONTEND_ORIGIN: Joi.string().uri().optional(),
});

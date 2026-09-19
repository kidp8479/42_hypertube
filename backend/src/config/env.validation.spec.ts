import { envValidationSchema } from './env.validation';

const base = {
  DATABASE_HOST: 'db',
  DATABASE_USER: 'u',
  DATABASE_PASSWORD: 'p',
  DATABASE_NAME: 'n',
  JWT_SECRET: 'a'.repeat(40),
  FORTYTWO_CLIENT_ID: 'client-id',
  FORTYTWO_CLIENT_SECRET: 'client-secret',
  FORTYTWO_CALLBACK_URL: 'http://localhost:3000/auth/42/callback',
};

describe('envValidationSchema', () => {
  it('accepts a complete, valid environment', () => {
    expect(envValidationSchema.validate(base).error).toBeUndefined();
  });

  it('rejects the .env.example JWT_SECRET placeholder verbatim', () => {
    const { error } = envValidationSchema.validate({
      ...base,
      JWT_SECRET:
        'replace_with_a_random_64_char_secret_before_running_the_app_0000',
    });

    expect(error?.message).toMatch(/JWT_SECRET/);
  });

  it('rejects a missing JWT_SECRET', () => {
    const { JWT_SECRET, ...withoutSecret } = base;
    void JWT_SECRET;

    expect(envValidationSchema.validate(withoutSecret).error).toBeDefined();
  });
});

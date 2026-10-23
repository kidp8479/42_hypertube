// Unit spec for the env schema: a valid environment boots, a missing or
// placeholder JWT_SECRET does not.
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
  GITHUB_CLIENT_ID: 'client-id',
  GITHUB_CLIENT_SECRET: 'client-secret',
  GITHUB_CALLBACK_URL: 'http://localhost:3000/auth/github/callback',
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

  it('defaults the refresh token lifetime to 7 days', () => {
    const { value } = envValidationSchema.validate(base) as {
      value: { REFRESH_EXPIRES_IN: string };
    };

    expect(value.REFRESH_EXPIRES_IN).toBe('7d');
  });

  it('rejects a refresh token lifetime that is not <number><s|m|h|d>', () => {
    const { error } = envValidationSchema.validate({
      ...base,
      REFRESH_EXPIRES_IN: 'a week',
    });

    expect(error?.message).toMatch(/REFRESH_EXPIRES_IN/);
  });

  it('rejects a missing JWT_SECRET', () => {
    const { JWT_SECRET, ...withoutSecret } = base;
    void JWT_SECRET;

    expect(envValidationSchema.validate(withoutSecret).error).toBeDefined();
  });
});

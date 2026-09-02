import { plainToInstance } from 'class-transformer';
import { NormalizeEmail } from './normalize-email.decorator';

class Sample {
  @NormalizeEmail()
  email!: unknown;
}

describe('NormalizeEmail', () => {
  it('trims and lower-cases a string email', () => {
    const { email } = plainToInstance(Sample, { email: '  Foo@X.com  ' });

    expect(email).toBe('foo@x.com');
  });

  it('leaves a non-string value untouched for @IsEmail to reject', () => {
    const { email } = plainToInstance(Sample, { email: 42 });

    expect(email).toBe(42);
  });
});

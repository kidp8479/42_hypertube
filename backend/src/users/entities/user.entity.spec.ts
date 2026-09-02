import { instanceToPlain } from 'class-transformer';
import { User } from './user.entity';

describe('User entity serialisation', () => {
  // ClassSerializerInterceptor (wired globally in main.ts) runs
  // instanceToPlain on every response body; this asserts the @Exclude on
  // `password` survives that step so a loaded hash never reaches a client.
  it('drops the password hash when serialised', () => {
    const user = new User();
    user.id = 1;
    user.email = 'ada@example.com';
    user.password = '$argon2id$v=19$m=65536,t=3,p=4$abc$def';

    const plain = instanceToPlain(user);

    expect(plain).not.toHaveProperty('password');
    expect(plain.email).toBe('ada@example.com');
  });
});

// Spec for the password strength rule, on the real dictionaries: French
// words (common, long, unaccented), the user's own data, and passwords that
// pass.
import { UnprocessableEntityException } from '@nestjs/common';
import {
  PasswordStrengthService,
  type PasswordOwner,
} from './password-strength.service';

const owner: PasswordOwner = {
  email: 'grace.hopper@example.com',
  username: 'amazinggrace',
  firstName: 'Grace',
  lastName: 'Hopper',
};

describe('PasswordStrengthService', () => {
  const service = new PasswordStrengthService();

  // Builds the ranked dictionaries once for the whole suite (about a second).
  beforeAll(() => {
    service.onModuleInit();
  });

  it.each([
    ['a common French word', 'boulangerie'],
    ['a French word with digits', 'chocolat123'],
    ['a long French word', 'anticonstitutionnellement'],
    ['a French word typed without accents', 'demenagement'],
    ['"password" in French', 'motdepasse'],
    ['a keyboard walk', 'azertyuiop'],
    ['a common password', 'password123'],
  ])('refuses %s (422)', (_label, password) => {
    expect(() => service.assertStrong(password, owner)).toThrow(
      UnprocessableEntityException,
    );
  });

  it("refuses a password built on the account's own data", () => {
    expect(() => service.assertStrong('gracehopper', owner)).toThrow(
      UnprocessableEntityException,
    );
  });

  it.each(['correct horse battery', 'bleu-girafe-tempete-42', 'xK9#mQ2vL!pz'])(
    'accepts %s',
    (password) => {
      expect(() => service.assertStrong(password, owner)).not.toThrow();
    },
  );
});

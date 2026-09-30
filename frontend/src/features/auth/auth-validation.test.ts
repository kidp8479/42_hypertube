import { describe, it, expect } from 'vitest';
import {
  describeValidationError,
  validateRegister,
  type RegisterField,
  type RegisterValues,
  type ValidationError,
} from './auth-validation';

const validValues: RegisterValues = {
  email: 'ada@example.com',
  username: 'adalovelace',
  firstName: 'Ada',
  lastName: 'Lovelace',
  password: 'correct horse',
  confirmPassword: 'correct horse',
};

describe('validateRegister', () => {
  it('returns no errors when every field is valid', () => {
    expect(validateRegister(validValues)).toEqual({});
  });

  it.each([
    ['empty', '', { code: 'required' }],
    ['missing @', 'ada.example.com', { code: 'invalidEmail' }],
    ['missing domain dot', 'ada@example', { code: 'invalidEmail' }],
    [
      'too long',
      `${'a'.repeat(250)}@example.com`,
      { code: 'tooLong', max: 255 },
    ],
  ])('email: %s -> error', (_label, email, expected) => {
    const errors = validateRegister({ ...validValues, email });
    expect(errors.email).toEqual(expected);
  });

  it('accepts an email padded with leading/trailing whitespace', () => {
    const errors = validateRegister({
      ...validValues,
      email: '  ada@example.com  ',
    });
    expect(errors.email).toBeUndefined();
  });

  it.each([
    ['empty', '', { code: 'required' }],
    ['too short', 'ab', { code: 'tooShort', min: 3 }],
    ['too long', 'a'.repeat(31), { code: 'tooLong', max: 30 }],
    ['boundary min ok', 'abc', undefined],
    ['boundary max ok', 'a'.repeat(30), undefined],
  ])('username: %s -> %s', (_label, username, expected) => {
    const errors = validateRegister({ ...validValues, username });
    expect(errors.username).toEqual(expected);
  });

  it.each([
    ['empty', '', { code: 'required' }],
    ['too long', 'a'.repeat(101), { code: 'tooLong', max: 100 }],
    ['boundary min ok', 'A', undefined],
    ['boundary max ok', 'a'.repeat(100), undefined],
  ])('firstName: %s -> %s', (_label, firstName, expected) => {
    const errors = validateRegister({ ...validValues, firstName });
    expect(errors.firstName).toEqual(expected);
  });

  it.each([
    ['empty', '', { code: 'required' }],
    ['too long', 'a'.repeat(101), { code: 'tooLong', max: 100 }],
    ['boundary min ok', 'A', undefined],
    ['boundary max ok', 'a'.repeat(100), undefined],
  ])('lastName: %s -> %s', (_label, lastName, expected) => {
    const errors = validateRegister({ ...validValues, lastName });
    expect(errors.lastName).toEqual(expected);
  });

  it.each([
    ['too short', 'short1', { code: 'tooShort', min: 8 }],
    ['too long', 'a'.repeat(101), { code: 'tooLong', max: 100 }],
    ['boundary min ok', 'a'.repeat(8), undefined],
    ['boundary max ok', 'a'.repeat(100), undefined],
  ])('password: %s -> %s', (_label, password, expected) => {
    // confirmPassword must match so it never masks the password error itself.
    const errors = validateRegister({
      ...validValues,
      password,
      confirmPassword: password,
    });
    expect(errors.password).toEqual(expected);
  });

  it('flags an empty confirmPassword as required', () => {
    const errors = validateRegister({ ...validValues, confirmPassword: '' });
    expect(errors.confirmPassword).toEqual({ code: 'required' });
  });

  it('flags a confirmPassword that does not match password', () => {
    const errors = validateRegister({
      ...validValues,
      password: 'correct horse',
      confirmPassword: 'wrong horse',
    });
    expect(errors.confirmPassword).toEqual({ code: 'mismatch' });
  });
});

describe('describeValidationError', () => {
  it.each<[RegisterField, ValidationError, string]>([
    ['email', { code: 'required' }, 'Email is required'],
    ['email', { code: 'invalidEmail' }, 'Invalid email address'],
    [
      'username',
      { code: 'tooShort', min: 3 },
      'Username must be at least 3 characters long',
    ],
    [
      'firstName',
      { code: 'tooLong', max: 100 },
      'First name must be at most 100 characters long',
    ],
    ['confirmPassword', { code: 'mismatch' }, 'Passwords do not match'],
  ])('%s: %o -> %s', (field, error, expected) => {
    expect(describeValidationError(field, error)).toBe(expected);
  });
});

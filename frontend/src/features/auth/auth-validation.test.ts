import { describe, it, expect } from 'vitest';
import { validateRegister, type RegisterValues } from './auth-validation';

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
    ['empty', '', 'Email is required'],
    ['missing @', 'ada.example.com', 'Invalid email address'],
    ['missing domain dot', 'ada@example', 'Invalid email address'],
    [
      'too long',
      `${'a'.repeat(250)}@example.com`,
      'Email must be at most 255 characters long',
    ],
  ])('email: %s -> error', (_label, email, expected) => {
    const errors = validateRegister({ ...validValues, email });
    expect(errors.email).toBe(expected);
  });

  it('accepts an email padded with leading/trailing whitespace', () => {
    const errors = validateRegister({
      ...validValues,
      email: '  ada@example.com  ',
    });
    expect(errors.email).toBeUndefined();
  });

  it.each([
    ['empty', '', 'User name is required'],
    ['too short', 'ab', 'User name must be at least 3 characters long'],
    [
      'too long',
      'a'.repeat(31),
      'User name must be at most 30 characters long',
    ],
    ['boundary min ok', 'abc', undefined],
    ['boundary max ok', 'a'.repeat(30), undefined],
  ])('username: %s -> %s', (_label, username, expected) => {
    const errors = validateRegister({ ...validValues, username });
    expect(errors.username).toBe(expected);
  });

  it.each([
    ['empty', '', 'First Name is required'],
    [
      'too long',
      'a'.repeat(101),
      'First Name must be at most 100 characters long',
    ],
    ['boundary min ok', 'A', undefined],
    ['boundary max ok', 'a'.repeat(100), undefined],
  ])('firstName: %s -> %s', (_label, firstName, expected) => {
    const errors = validateRegister({ ...validValues, firstName });
    expect(errors.firstName).toBe(expected);
  });

  it.each([
    ['empty', '', 'Last Name is required'],
    [
      'too long',
      'a'.repeat(101),
      'Last Name must be at most 100 characters long',
    ],
    ['boundary min ok', 'A', undefined],
    ['boundary max ok', 'a'.repeat(100), undefined],
  ])('lastName: %s -> %s', (_label, lastName, expected) => {
    const errors = validateRegister({ ...validValues, lastName });
    expect(errors.lastName).toBe(expected);
  });

  it.each([
    ['too short', 'short1', 'Password must be at least 8 characters long'],
    [
      'too long',
      'a'.repeat(101),
      'Password must be at most 100 characters long',
    ],
    ['boundary min ok', 'a'.repeat(8), undefined],
    ['boundary max ok', 'a'.repeat(100), undefined],
  ])('password: %s -> %s', (_label, password, expected) => {
    // confirmPassword must match so it never masks the password error itself.
    const errors = validateRegister({
      ...validValues,
      password,
      confirmPassword: password,
    });
    expect(errors.password).toBe(expected);
  });

  it('flags an empty confirmPassword as required', () => {
    const errors = validateRegister({ ...validValues, confirmPassword: '' });
    expect(errors.confirmPassword).toBe('Confirm Password is required');
  });

  it('flags a confirmPassword that does not match password', () => {
    const errors = validateRegister({
      ...validValues,
      password: 'correct horse',
      confirmPassword: 'wrong horse',
    });
    expect(errors.confirmPassword).toBe('Passwords do not match');
  });
});

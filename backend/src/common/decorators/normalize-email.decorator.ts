import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';

/**
 * Trims and lower-cases an incoming email string so lookups and the
 * `email` unique constraint are case-insensitive (`Foo@X.com` matches the
 * row stored as `foo@x.com`). No-ops on a non-string value so `@IsEmail`
 * still produces the validation error.
 *
 * Place it before the validation decorators on the property.
 */
export function NormalizeEmail() {
  return applyDecorators(
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? value.trim().toLowerCase() : value,
    ),
  );
}

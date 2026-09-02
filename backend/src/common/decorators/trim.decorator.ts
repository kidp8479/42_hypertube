import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';

/**
 * Trims surrounding whitespace from an incoming string. No-ops on a
 * non-string value so the validation decorators still see the raw input.
 *
 * Place it before the validation decorators on the property.
 */
export function Trim() {
  return applyDecorators(
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? value.trim() : value,
    ),
  );
}

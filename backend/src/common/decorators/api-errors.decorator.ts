// OpenAPI documentation of the error codes a route can answer.
import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

const DEFAULT_DESCRIPTIONS = {
  400: 'Invalid input: a field fails validation',
  401: 'Missing, invalid or expired credentials',
  403: 'Not the owner of this resource',
  404: 'No resource with this id',
  409: 'Email or username already taken',
  413: 'The uploaded file is over the size cap',
  429: 'Too many requests from this address (rate limit)',
} as const;

/** An error status this API answers, with its default description. */
export type ApiErrorStatus = keyof typeof DEFAULT_DESCRIPTIONS;

/**
 * Adds one OpenAPI response per error status, so Swagger UI lists the codes
 * the defense checks (401, 403, 404, 409...). A `[status, description]`
 * pair replaces the default text where the route means something narrower.
 */
export function ApiErrors(
  ...statuses: (ApiErrorStatus | [ApiErrorStatus, string])[]
) {
  return applyDecorators(
    ...statuses.map((entry) => {
      const [status, description] = Array.isArray(entry)
        ? entry
        : [entry, DEFAULT_DESCRIPTIONS[entry]];
      return ApiResponse({ status, description });
    }),
  );
}

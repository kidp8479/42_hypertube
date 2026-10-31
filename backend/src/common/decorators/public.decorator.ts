// Escape hatch from the global JwtAuthGuard for public routes.
import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiSecurity } from '@nestjs/swagger';

/** Metadata key the {@link JwtAuthGuard} looks for to skip authentication. */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route (or a whole controller) as reachable without a token.
 *
 * The OpenAPI document mirrors the guard: every operation requires the
 * bearer token (`serveApiDocs`), and this decorator overrides it with an
 * empty requirement, so Swagger UI sends no token here and a new route shows
 * up as protected unless it is marked public.
 */
export const Public = () =>
  applyDecorators(SetMetadata(IS_PUBLIC_KEY, true), ApiSecurity({}));

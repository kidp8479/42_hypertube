import { SetMetadata } from '@nestjs/common';

/** Metadata key the {@link JwtAuthGuard} looks for to skip authentication. */
export const IS_PUBLIC_KEY = 'isPublic';

/** Marks a route (or a whole controller) as reachable without a token. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

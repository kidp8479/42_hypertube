// Raised when a provider account has no verified email to sign in with.
import { UnauthorizedException } from '@nestjs/common';

/**
 * A 401 the OAuth callback filter can tell apart from the other
 * rejections: it is the one failure the user can fix on their own (verify
 * an address at the provider), so it reaches the SPA as its own
 * `email_unverified` reason instead of the generic `failed`.
 */
export class UnverifiedEmailException extends UnauthorizedException {
  constructor() {
    super('Provider account has no verified email');
  }
}

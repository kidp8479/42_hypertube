// Common shape every OAuth strategy's validate() normalises its
// provider-specific profile into, so AuthService.resolveOAuthUser stays
// provider-agnostic.
import { OAuthProvider } from '../entities/oauth-account.entity';

export interface OAuthProfile {
  provider: OAuthProvider;
  providerUserId: string;
  /**
   * Always an address the provider has verified: AuthService links by it
   * (ADR-0007). A strategy that cannot get one refuses the login with
   * `UnverifiedEmailException` instead of returning a profile.
   */
  email: string;
  suggestedUsername: string;
  firstName: string;
  lastName: string;
}

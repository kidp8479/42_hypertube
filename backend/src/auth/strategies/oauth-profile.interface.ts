// Common shape every OAuth strategy's validate() normalises its
// provider-specific profile into, so AuthService.loginWithOAuth stays
// provider-agnostic.
import { OAuthProvider } from '../entities/oauth-account.entity';

export interface OAuthProfile {
  provider: OAuthProvider;
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  suggestedUsername: string;
  firstName: string;
  lastName: string;
}

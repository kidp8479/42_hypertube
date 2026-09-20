// Passport OAuth2 strategy for GitHub's own OAuth provider.
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, StrategyOptions } from 'passport-oauth2';
import { ConfigService } from '@nestjs/config';
import { OAuthProfile } from './oauth-profile.interface';
import { OAuthProvider } from '../entities/oauth-account.entity';

// snake_case fields mirror GitHub's /user JSON response as-is - mapped
// to the camelCase OAuthProfile in validate() below. `email` can be null
// when the user keeps their primary address private, in which case
// userProfile() below falls back to /user/emails.
interface GithubProfile {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
}

// One row of GitHub's /user/emails response.
interface GithubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(configService: ConfigService) {
    super({
      authorizationURL: 'https://github.com/login/oauth/authorize',
      tokenURL: 'https://github.com/login/oauth/access_token',
      clientID: configService.getOrThrow<string>('GITHUB_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('GITHUB_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('GITHUB_CALLBACK_URL'),
      // Read-only access to the account's email addresses - without it,
      // /user/emails below returns an empty list, silently.
      scope: ['user:email'],
    } satisfies StrategyOptions);
  }

  userProfile(
    accessToken: string,
    done: (err?: unknown, profile?: GithubProfile) => void,
  ): void {
    // Passport expects this method to return void, not a Promise - the
    // async work stays inside this IIFE so the outer signature matches.
    void (async () => {
      try {
        const headers = {
          Authorization: `Bearer ${accessToken}`,
          // The GitHub API rejects any request with no User-Agent.
          'User-Agent': 'hypertube',
        };
        const res = await fetch('https://api.github.com/user', { headers });
        const profile = (await res.json()) as GithubProfile;

        if (profile.email) {
          done(undefined, profile);
          return;
        }

        // profile.email is null when it's marked private - the address
        // still exists, just not on this endpoint. /user/emails needs
        // the user:email scope requested above.
        const emailsRes = await fetch('https://api.github.com/user/emails', {
          headers,
        });
        const emails = (await emailsRes.json()) as GithubEmail[];
        const primary = emails.find((e) => e.primary && e.verified);
        done(undefined, { ...profile, email: primary?.email ?? null });
      } catch (err: unknown) {
        done(err);
      }
    })();
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: GithubProfile,
  ): OAuthProfile {
    if (!profile.email) {
      // Nothing verified to link or create an account with - see
      // AuthService.loginWithOAuth case 3, which never trusts an absent
      // or unverified email for account matching.
      throw new UnauthorizedException('GitHub account has no verified email');
    }

    // GitHub gives one free-text display name (nullable), not separate
    // first/last fields like 42 does. Best-effort split on the first
    // space; a one-word name (or none at all, using the login) repeats
    // as both first and last rather than leaving lastName blank.
    const displayName = profile.name?.trim() || profile.login;
    const [firstName, ...rest] = displayName.split(/\s+/);
    const lastName = rest.join(' ') || firstName;

    return {
      provider: OAuthProvider.GITHUB,
      providerUserId: String(profile.id),
      email: profile.email,
      // Only ever reached with a verified address: either /user's own
      // email (GitHub only exposes a confirmed one there) or the
      // primary+verified row picked out of /user/emails above.
      emailVerified: true,
      suggestedUsername: profile.login,
      firstName,
      lastName,
    };
  }
}

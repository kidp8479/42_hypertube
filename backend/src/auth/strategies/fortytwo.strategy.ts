// Passport OAuth2 strategy for 42's own OAuth provider.
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, StrategyOptions } from 'passport-oauth2';
import { ConfigService } from '@nestjs/config';
import { OAuthProfile } from './oauth-profile.interface';
import { OAuthProvider } from '../entities/oauth-account.entity';
import { fetchJson } from './fetch-json.util';

// snake_case fields because this mirrors 42's /v2/me JSON response as-is -
// mapped to the camelCase OAuthProfile in validate() below.
interface FortyTwoProfile {
  id: number;
  email: string;
  login: string;
  first_name: string;
  last_name: string;
}

@Injectable()
export class FortyTwoStrategy extends PassportStrategy(Strategy, '42') {
  constructor(configService: ConfigService) {
    super({
      authorizationURL: 'https://api.intra.42.fr/oauth/authorize',
      tokenURL: 'https://api.intra.42.fr/oauth/token',
      clientID: configService.getOrThrow<string>('FORTYTWO_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('FORTYTWO_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('FORTYTWO_CALLBACK_URL'),
    } satisfies StrategyOptions);
  }

  userProfile(
    accessToken: string,
    done: (err?: unknown, profile?: FortyTwoProfile) => void,
  ): void {
    // Passport expects this method to return void, not a Promise - the
    // async work stays inside this IIFE so the outer signature matches.
    void (async () => {
      try {
        const profile = await fetchJson<FortyTwoProfile>(
          'https://api.intra.42.fr/v2/me',
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        done(undefined, profile);
      } catch (err: unknown) {
        done(err);
      }
    })();
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: FortyTwoProfile,
  ): OAuthProfile {
    return {
      provider: OAuthProvider.FORTYTWO,
      providerUserId: String(profile.id),
      email: profile.email,
      // 42 verifies the account's email at signup on the intra; there is
      // no "verified" flag in the /v2/me response because it's always true.
      emailVerified: true,
      suggestedUsername: profile.login,
      firstName: profile.first_name,
      lastName: profile.last_name,
    };
  }
}

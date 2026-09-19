// Passport OAuth2 strategy for 42's own OAuth provider.
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, StrategyOptions } from 'passport-oauth2';
import { ConfigService } from '@nestjs/config';

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
  ) {
    fetch('https://api.intra.42.fr/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => res.json() as Promise<FortyTwoProfile>)
      .then((profile) => done(undefined, profile))
      .catch((err: unknown) => done(err));
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: FortyTwoProfile,
  ) {
    // Temporary: hand back the raw profile so we can confirm the OAuth
    // round-trip works end to end before wiring the find-or-create logic.
    return profile;
  }
}

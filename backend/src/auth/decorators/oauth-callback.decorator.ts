// Everything the 42 and GitHub callback routes share, in one decorator.
import {
  applyDecorators,
  Get,
  Header,
  Redirect,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OAuthCallbackFilter } from '../filters/oauth-callback.filter';
import { Public } from './public.decorator';

/**
 * `GET <provider>/callback`: public, guarded by the provider's Passport
 * strategy, answering with a redirect to the SPA (the handler returns
 * `{ url }`), and with any failure turned into a redirect too by
 * {@link OAuthCallbackFilter}.
 *
 * `Referrer-Policy: no-referrer` keeps the redirect from passing this URL
 * (which carries the provider's `code` and `state`) on as the referrer.
 * The filter sets the same header on its own redirect, since a decorator
 * header is not applied when the handler throws.
 */
export const OAuthCallback = (strategy: '42' | 'github') =>
  applyDecorators(
    Public(),
    UseGuards(AuthGuard(strategy)),
    UseFilters(OAuthCallbackFilter),
    Header('Referrer-Policy', 'no-referrer'),
    Redirect(),
    Get(`${strategy}/callback`),
  );

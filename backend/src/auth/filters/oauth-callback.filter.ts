// Sends a failed OAuth callback back to the SPA instead of a raw JSON error.
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { UnverifiedEmailException } from '../exceptions/unverified-email.exception';
import {
  spaCallbackUrl,
  type OAuthCallbackError,
} from '../spa-callback-url.util';

/**
 * Catches every failure on the two OAuth callback routes (consent denied,
 * missing or forged state cookie, GitHub account with no verified email,
 * a provider or DB error) and redirects the browser to the SPA's
 * `/oauth/callback?error=...`. The callback is a top-level navigation from
 * the provider, so a JSON error body would leave the user on a bare
 * `{"statusCode":401}` page on the backend origin.
 *
 * Only three reasons reach the SPA: `cancelled` when the user declined at
 * the provider (passport-oauth2 sees `?error=access_denied`),
 * `email_unverified` when the provider account has no verified address
 * (the one failure the user can fix themselves), `failed` for everything
 * else - the details stay in the server log, not in a URL.
 *
 * The redirect carries `Referrer-Policy: no-referrer` like the success
 * one: the failed callback URL still holds the provider's `code` and
 * `state`, and the {@link OAuthCallback} decorator's header is not applied
 * once the handler (or its guard) has thrown.
 */
@Catch()
export class OAuthCallbackFilter implements ExceptionFilter {
  private readonly logger = new Logger(OAuthCallbackFilter.name);

  constructor(private readonly configService: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    this.log(exception);

    const url = spaCallbackUrl(
      this.configService.getOrThrow<string>('FRONTEND_ORIGIN'),
      { error: this.reason(exception, req) },
    );
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.redirect(url);
  }

  /**
   * A declined consent is read from the provider's `?error=access_denied`,
   * not from the exception: passport-oauth2 turns it into the same bare
   * 401 as a missing or forged state cookie, so the query string is the
   * only thing that tells the two apart.
   */
  private reason(exception: unknown, req: Request): OAuthCallbackError {
    if (req.query.error === 'access_denied') {
      return 'cancelled';
    }
    if (exception instanceof UnverifiedEmailException) {
      return 'email_unverified';
    }
    return 'failed';
  }

  /**
   * A 5xx or a non-HTTP error is a bug or an outage: logged as an error.
   * An unverified email is expected but worth a trace when a user reports
   * they cannot sign in: a warning. Any other 4xx (declined consent, a
   * missing or forged state cookie) is routine and not logged.
   */
  private log(exception: unknown) {
    if (exception instanceof UnverifiedEmailException) {
      this.logger.warn(exception.message);
      return;
    }
    if (exception instanceof HttpException && exception.getStatus() < 500) {
      return;
    }
    this.logger.error(
      exception instanceof Error ? exception.stack : String(exception),
    );
  }
}

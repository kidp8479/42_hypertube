import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';

/**
 * Sends `Cache-Control: no-store` on every response. API responses are
 * per-user and change on every write: without it, Firefox can answer a
 * reload's `GET /users/me` from its HTTP cache and show the profile from
 * before a save (HYP-121), and account data stays on disk after logout.
 */
export function noStoreResponses(app: NestExpressApplication): void {
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
}

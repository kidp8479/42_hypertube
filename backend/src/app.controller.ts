// Root-level routes not tied to a specific resource.
import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';

/** Routes mounted at the root, outside any resource: the liveness check. */
@Controller()
export class AppController {
  /** Unauthenticated liveness check: a fixed body that proves the app is up. */
  @Public()
  @Get()
  liveness(): string {
    return 'Hello World!';
  }
}

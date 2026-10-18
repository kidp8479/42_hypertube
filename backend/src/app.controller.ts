// Root-level routes not tied to a specific resource.
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';

/** Routes mounted at the root, outside any resource: the liveness check. */
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /** Unauthenticated liveness check. */
  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}

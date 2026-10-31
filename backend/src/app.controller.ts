// Root-level routes not tied to a specific resource.
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';

/** Routes mounted at the root, outside any resource: the liveness check. */
@ApiTags('health')
@Controller()
export class AppController {
  /** Unauthenticated liveness check: a fixed body that proves the app is up. */
  @ApiOperation({ summary: 'Liveness check' })
  @Public()
  @Get()
  liveness(): string {
    return 'Hello World!';
  }
}

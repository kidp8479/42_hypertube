// Wires the API keys together; exports ApiClientsService for AuthModule.
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiClientsController } from './api-clients.controller';
import { ApiClientsService } from './api-clients.service';
import { ApiClient } from './entities/api-client.entity';

/**
 * API keys (ADR-0015): the `/api-clients` routes and the `api_client` table.
 * Exports {@link ApiClientsService} so the auth module can check a client +
 * secret at `POST /oauth/token` without touching the repository.
 */
@Module({
  imports: [TypeOrmModule.forFeature([ApiClient])],
  controllers: [ApiClientsController],
  providers: [ApiClientsService],
  exports: [ApiClientsService],
})
export class ApiClientsModule {}

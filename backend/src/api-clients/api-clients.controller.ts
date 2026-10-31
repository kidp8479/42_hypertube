// HTTP entry points for the caller's API keys.
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiErrors } from '../common/decorators/api-errors.decorator';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { SessionTokenGuard } from '../common/guards/session-token.guard';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { ApiClientsService } from './api-clients.service';
import { ApiClientDto } from './dto/api-client.dto';
import { CreateApiClientDto } from './dto/create-api-client.dto';
import { CreatedApiClientDto } from './dto/created-api-client.dto';

const NO_CLIENT_TOKEN: [403, string] = [
  403,
  'An API client token cannot manage API keys',
];

/**
 * The caller's API keys (`/api-clients`), the credentials of
 * `POST /oauth/token` (ADR-0015). Every route acts on the caller's own keys,
 * and only with a login token ({@link SessionTokenGuard}).
 */
@ApiTags('api-clients')
@UseGuards(SessionTokenGuard)
@Controller('api-clients')
export class ApiClientsController {
  constructor(private readonly apiClients: ApiClientsService) {}

  /** Creates a key; the response is the only place its secret appears. */
  @ApiOperation({ summary: 'Create an API key (the secret is shown once)' })
  @ApiCreatedResponse({ type: CreatedApiClientDto })
  @ApiErrors(400, 401, NO_CLIENT_TOKEN, [409, 'At most 5 API keys per user'])
  @Post()
  async create(
    @Body() dto: CreateApiClientDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CreatedApiClientDto> {
    const { client, secret } = await this.apiClients.create(user.id, dto.name);
    return new CreatedApiClientDto(client, secret);
  }

  @ApiOperation({ summary: "The caller's API keys, without their secrets" })
  @ApiOkResponse({ type: [ApiClientDto] })
  @ApiErrors(401, NO_CLIENT_TOKEN)
  @Get()
  async findAll(@CurrentUser() user: AuthUser): Promise<ApiClientDto[]> {
    const clients = await this.apiClients.listFor(user.id);
    return clients.map((client) => new ApiClientDto(client));
  }

  @ApiOperation({ summary: "Revoke one of the caller's API keys" })
  @ApiOkResponse({ description: 'Revoked; the body is empty' })
  @ApiErrors(
    [400, 'The id is not a positive integer'],
    401,
    [403, "Another user's key, or an API client token"],
    404,
  )
  @Delete(':id')
  remove(
    @Param('id', ParseIdPipe) id: number,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.apiClients.remove(id, user.id);
  }
}

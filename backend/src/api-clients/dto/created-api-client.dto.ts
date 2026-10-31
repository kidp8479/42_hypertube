// Response shape of `POST /api-clients`: the new key and its secret.
import { ApiClient } from '../entities/api-client.entity';
import { ApiClientDto } from './api-client.dto';

/**
 * A key just created, with its `secret`: the only response that ever
 * carries it, since the database keeps a hash. The owner sends `clientId` as
 * `client` and this as `secret` to `POST /oauth/token`.
 */
export class CreatedApiClientDto extends ApiClientDto {
  readonly secret: string;

  constructor(client: ApiClient, secret: string) {
    super(client);
    this.secret = secret;
  }
}

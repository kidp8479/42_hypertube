// Response shape of an API key, without its secret.
import { ApiClient } from '../entities/api-client.entity';

/**
 * An API key as its owner sees it in a list: never the secret, which only
 * the creation response carries. Built field by field from the entity, so a
 * column added later stays out until it is added here.
 */
export class ApiClientDto {
  readonly id: number;
  readonly name: string;
  readonly clientId: string;
  readonly createdAt: Date;

  constructor(client: ApiClient) {
    this.id = client.id;
    this.name = client.name;
    this.clientId = client.clientId;
    this.createdAt = client.createdAt;
  }
}

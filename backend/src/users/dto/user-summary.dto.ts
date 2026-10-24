// Response shape of one entry of `GET /users`.
import { User } from '../entities/user.entity';

/**
 * A user as the list shows it to any authenticated caller: id and username,
 * nothing else (subject III.4). Built field by field from the entity, so a
 * column added to `User` later stays out of the list until it is added here.
 */
export class UserSummaryDto {
  readonly id: number;
  readonly username: string;

  constructor(user: User) {
    this.id = user.id;
    this.username = user.username;
  }
}

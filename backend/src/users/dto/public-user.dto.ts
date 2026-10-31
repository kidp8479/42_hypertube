// Response shape of `GET /users/:id` when the caller is someone else.
import { User } from '../entities/user.entity';

/**
 * Another user's profile: id, username and picture name (subject III.4). The
 * email, the names and the language stay private to the owner, who gets the
 * full profile instead. Built field by field from the entity, so a column
 * added to `User` later stays private until it is added here.
 */
export class PublicUserDto {
  readonly id: number;
  readonly username: string;
  readonly profilePicture: string | null;

  constructor(user: User) {
    this.id = user.id;
    this.username = user.username;
    this.profilePicture = user.profilePicture;
  }
}

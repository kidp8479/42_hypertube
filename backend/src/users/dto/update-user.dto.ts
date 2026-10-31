// Validated input shape for profile edits, derived from CreateUserDto.
import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

/**
 * Payload accepted when editing a profile (`PATCH /users/:id`). The
 * picture is not part of it: it is a file, sent to `PUT /users/:id/picture`.
 *
 * Changing the email or the password takes `currentPassword`, and an
 * account without a password cannot change either here
 * (`UsersService.update`): a stolen access token alone must not be enough
 * to take the account over.
 */
export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly currentPassword?: string;
}

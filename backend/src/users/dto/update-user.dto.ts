// Validated input shape for profile edits, derived from CreateUserDto.
import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

/**
 * Payload accepted when editing a profile (`PATCH /users/:id`): the
 * subject's username, email, password and profile picture URL, plus the
 * name and language fields. Every CreateUserDto field is optional, with the
 * same rules.
 *
 * Changing the email or the password takes `currentPassword`, and an
 * account without a password cannot change either here
 * (`UsersService.update`): a stolen access token alone must not be enough
 * to take the account over.
 */
export class UpdateUserDto extends PartialType(CreateUserDto) {
  // https only: the value lands in an <img src>, so `javascript:` and
  // plain-http (mixed content) URLs are refused. 500 is the column length.
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(500)
  readonly profilePicture?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly currentPassword?: string;
}

// Validated input shape for registration.
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { NormalizeEmail } from '../../common/decorators/normalize-email.decorator';
import { Trim } from '../../common/decorators/trim.decorator';
import { PreferredLanguage } from '../entities/user.entity';

/**
 * Payload accepted at registration (`POST /users`).
 *
 * Server-managed columns (`id`, `createdAt`, `updatedAt`) are never part
 * of the input. `profilePicture` is not part of it either: it is set
 * afterwards through `PATCH /users/:id` (`UpdateUserDto`).
 */
export class CreateUserDto {
  @NormalizeEmail()
  @IsEmail()
  @MaxLength(255)
  readonly email!: string;

  // Trimmed but not lower-cased: the username is display text and its case
  // is preserved. Uniqueness ignores the case (`UQ_user_username_lower`).
  // No `@`: the login field takes a username or an email and tells them
  // apart by it (`UsersService.findForLogin`).
  @Trim()
  @IsString()
  @Length(3, 30)
  @Matches(/^[^@]*$/, { message: 'username must not contain @' })
  readonly username!: string;

  @IsString()
  @Length(1, 100)
  readonly firstName!: string;

  @IsString()
  @Length(1, 100)
  readonly lastName!: string;

  @IsString()
  @Length(8, 100)
  readonly password!: string;

  @IsOptional()
  @IsEnum(PreferredLanguage)
  readonly preferredLanguage?: PreferredLanguage;
}

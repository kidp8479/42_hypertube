import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { NormalizeEmail } from '../../common/decorators/normalize-email.decorator';
import { Trim } from '../../common/decorators/trim.decorator';
import { PreferredLanguage } from '../entities/user.entity';

/**
 * Payload accepted at registration (`POST /users`).
 *
 * Server-managed columns (`id`, `createdAt`, `updatedAt`) are never part
 * of the input. `profilePicture` is handled outside this DTO: it comes in
 * as a file upload, with a default avatar when the user provides none.
 */
export class CreateUserDto {
  @NormalizeEmail()
  @IsEmail()
  @MaxLength(255)
  readonly email!: string;

  // Trimmed but not lower-cased: the username is display text and its
  // case is preserved. Case-insensitive uniqueness is a separate question
  // (see backlog).
  @Trim()
  @IsString()
  @Length(3, 30)
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

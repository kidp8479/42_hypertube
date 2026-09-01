import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { PreferredLanguage } from '../entities/user.entity';

/**
 * Payload accepted at registration (`POST /users`).
 *
 * Server-managed columns (`id`, `createdAt`, `updatedAt`) are never part
 * of the input. `profilePicture` is handled outside this DTO: it comes in
 * as a file upload, with a default avatar when the user provides none.
 */
export class CreateUserDto {
  // Normalise so e-mail uniqueness is case-insensitive (Foo@X.com == foo@x.com).
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(255)
  readonly email!: string;

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

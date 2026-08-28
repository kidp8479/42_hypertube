import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

/**
 * Payload accepted when editing a profile (`PATCH /users/:id`).
 *
 * Every CreateUserDto field becomes optional. `password` is deliberately
 * left out: changing it is a separate flow that must confirm the current
 * password.
 */
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password'] as const),
) {}

import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

/**
 * Payload accepted when editing a profile (`PATCH /users/:id`).
 *
 * Every remaining CreateUserDto field becomes optional. `password` and
 * `email` are deliberately left out: both are separate, confirmed flows.
 * `email` especially - it is the login identifier and the reset-password
 * channel, so changing it needs re-auth + verification of the new address
 * (its own ticket), not a silent PATCH.
 */
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password', 'email'] as const),
) {}

// Wires the users resource together; exports UsersService for AuthModule.
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsernameAllocator } from './username-allocator.service';
import { PasswordStrengthService } from './password-strength.service';
import { UsersController } from './users.controller';
import { ProfilePictureController } from './profile-picture.controller';
import {
  DEFAULT_PICTURES_DIR,
  PICTURES_DIR,
  ProfilePictureStore,
} from './profile-picture.store';
import { User } from './entities/user.entity';
import { RefreshTokenModule } from '../sessions/refresh-token.module';

/**
 * The users resource: `/users` routes, profile pictures, and account data
 * access. Exports
 * {@link UsersService} so the auth module can look accounts up without
 * touching the `User` repository itself.
 */
@Module({
  imports: [TypeOrmModule.forFeature([User]), RefreshTokenModule],
  controllers: [UsersController, ProfilePictureController],
  providers: [
    UsersService,
    UsernameAllocator,
    PasswordStrengthService,
    ProfilePictureStore,
    { provide: PICTURES_DIR, useValue: DEFAULT_PICTURES_DIR },
  ],
  exports: [UsersService],
})
export class UsersModule {}

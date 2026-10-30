// Wires the users resource together; exports UsersService for AuthModule.
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsernameAllocator } from './username-allocator.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { RefreshTokenModule } from '../auth/refresh-token.module';

/**
 * The users resource: `/users` routes and account data access. Exports
 * {@link UsersService} so the auth module can look accounts up without
 * touching the `User` repository itself.
 */
@Module({
  imports: [TypeOrmModule.forFeature([User]), RefreshTokenModule],
  controllers: [UsersController],
  providers: [UsersService, UsernameAllocator],
  exports: [UsersService],
})
export class UsersModule {}

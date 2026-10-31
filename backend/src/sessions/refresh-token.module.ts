// The session store (refresh tokens) in its own folder, below both users and
// auth: users ends sessions after a credential change without depending on
// auth, which itself depends on users.
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { RefreshTokenService } from './refresh-token.service';

/**
 * The refresh-token store as its own module (ADR-0011): AuthModule issues and
 * rotates sessions with it, UsersModule ends them after a credential change.
 */
@Module({
  imports: [TypeOrmModule.forFeature([RefreshToken])],
  providers: [RefreshTokenService],
  exports: [RefreshTokenService],
})
export class RefreshTokenModule {}

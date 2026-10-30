// The refresh-token store on its own, so the users module can end sessions
// without importing AuthModule (which imports UsersModule). With
// refresh-cookie.util, it is all users/ imports from auth/.
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

// Wires the login flow together: JwtStrategy (bearer tokens), the 42
// OAuth strategy, AuthService, AuthController.
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OAuthAccount } from './entities/oauth-account.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import { FortyTwoStrategy } from './strategies/fortytwo.strategy';

/**
 * Authentication module: issues JWTs on login and verifies them on every
 * request through {@link JwtStrategy}. JWT signing is configured from
 * validated env vars rather than a hardcoded constant (ADR-0003):
 * `getOrThrow` fails the boot if a value is missing, and the
 * `StringValue` cast on `JWT_EXPIRES_IN` is safe because env.validation
 * pins it to the `ms` duration format.
 *
 * Also owns the OAuth login paths (42 for now, GitHub next): each
 * provider is its own Passport strategy (e.g. {@link FortyTwoStrategy})
 * plus a pair of routes on {@link AuthController}, sharing this module's
 * `OAuthAccount` repository for the eventual find-or-create/link logic.
 */
@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([OAuthAccount]),
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.getOrThrow<StringValue>('JWT_EXPIRES_IN'),
        },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy, FortyTwoStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
